import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { offlineDB } from '../db/indexeddb';
import { syncEngine } from './sync';

// ═══════════════════════════════════════════════════════════════
// ✅ Rana Awais Electronics - API Client v4
// ✅ Full offline-first interceptor
// ✅ GET: Try network → fallback to IndexedDB → cache response
// ✅ POST/PUT/DELETE: Try network → if fails → queue for later sync
// ✅ Auto-sync when coming back online
// ═══════════════════════════════════════════════════════════════

// Get VITE_API_URL from env or use default
const VITE_API_URL = (window as any).__VITE_API_URL__ || '';

const BASE_URL = (() => {
  if (VITE_API_URL) return VITE_API_URL;
  
  // Try to get from localStorage (set during login)
  const storedUrl = localStorage.getItem('api_url');
  if (storedUrl) return storedUrl;
  
  // ✅ Auto-detect: if on Vercel (HTTPS), use Render backend URL
  // For production: use the Render backend URL
  // For local development: use localhost:8080
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    // Production - Render backend URL
    return 'https://ranaawaiselectronics.onrender.com/api';
  }
  
  // Local development
  return 'http://localhost:8080/api';
})();

console.log('🌐 API Base URL:', BASE_URL);

const api: AxiosInstance & {
  getTodayInstallments?: () => Promise<any>;
  getTodayDueFull?: () => Promise<any>;
  getOverdueFull?: () => Promise<any>;
} = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ═══════════════════════════════════════════════════════════════
// 🔐 REQUEST INTERCEPTOR - Add auth token
// ═══════════════════════════════════════════════════════════════

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ═══════════════════════════════════════════════════════════════
// 📦 RESPONSE INTERCEPTOR - Offline-first caching
// ═══════════════════════════════════════════════════════════════

api.interceptors.response.use(
  async (response: AxiosResponse) => {
    // ✅ Cache GET responses for offline use
    if (response.config.method?.toLowerCase() === 'get' && response.data) {
      await cacheResponse(response.config.url || '', response.data);
    }
    return response;
  },
  async (error) => {
    const config = error.config as AxiosRequestConfig & { _retry?: boolean };
    
    // ✅ If offline or network error, try to serve from cache
    if (!navigator.onLine || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
      const url = config.url || '';
      const method = config.method?.toLowerCase() || 'get';

      // For GET requests, try to serve from IndexedDB cache
      if (method === 'get') {
        const cachedData = await getCachedResponse(url);
        if (cachedData) {
          console.log(`📦 Serving from cache: ${url}`);
          return Promise.resolve({
            data: cachedData,
            status: 200,
            statusText: 'OK (Cached)',
            headers: {},
            config,
          });
        }
      }

      // For POST/PUT/DELETE, queue for later sync
      if (['post', 'put', 'delete'].includes(method)) {
        const data = config.data ? JSON.parse(config.data) : {};
        const entityType = detectEntityType(url);
        const operation = method === 'post' ? 'create' : method === 'put' ? 'update' : 'delete';
        const recordId = extractRecordId(url);

        if (entityType) {
          await syncEngine.queueOperation(entityType, operation, recordId, data, url);
          console.log(`📝 Queued offline operation: ${operation} ${entityType} (${recordId})`);
          
          // Return a success response so the UI doesn't break
          return Promise.resolve({
            data: { success: true, offline: true, message: 'Saved offline. Will sync when online.' },
            status: 200,
            statusText: 'OK (Offline)',
            headers: {},
            config,
          });
        }
      }
    }

    return Promise.reject(error);
  }
);

// ═══════════════════════════════════════════════════════════════
// 🗃️ CACHE HELPERS
// ═══════════════════════════════════════════════════════════════

async function cacheResponse(url: string, data: any): Promise<void> {
  try {
    // Extract the actual data from paginated responses
    const responseData = data?.data || data;
    
    if (url.includes('/customers') && Array.isArray(responseData)) {
      await offlineDB.cacheCustomers(responseData);
    } else if (url.includes('/products') && Array.isArray(responseData)) {
      await offlineDB.cacheProducts(responseData);
    } else if (url.includes('/installments') && Array.isArray(responseData)) {
      await offlineDB.cacheInstallments(responseData);
    } else if (url.includes('/promises') && Array.isArray(responseData)) {
      await offlineDB.cachePromises(responseData);
    } else if (url.includes('/dashboard/summary')) {
      await offlineDB.cacheDashboardSummary(responseData);
    } else if (url.includes('/guarantors') && Array.isArray(responseData)) {
      await offlineDB.cacheGuarantors(responseData);
    } else if (url.includes('/inventory') && Array.isArray(responseData)) {
      await offlineDB.cacheInventory(responseData);
    } else if (url.includes('/payments') && Array.isArray(responseData)) {
      await offlineDB.cachePayments(responseData);
    } else if (url.includes('/expenses') && Array.isArray(responseData)) {
      await offlineDB.cacheExpenses(responseData);
    }
  } catch (e) {
    // Silently fail - cache is best effort
  }
}

async function getCachedResponse(url: string): Promise<any | null> {
  try {
    if (url.includes('/customers')) {
      const customers = await offlineDB.getCachedCustomers();
      return { data: customers, success: true };
    } else if (url.includes('/products')) {
      const products = await offlineDB.getCachedProducts();
      return { data: products, success: true };
    } else if (url.includes('/installments')) {
      const installments = await offlineDB.getCachedInstallments();
      return { data: installments, success: true };
    } else if (url.includes('/promises')) {
      const promises = await offlineDB.getCachedPromises();
      return { data: promises, success: true };
    } else if (url.includes('/dashboard/summary')) {
      const summary = await offlineDB.getCachedDashboardSummary();
      return summary ? { data: summary, success: true } : null;
    } else if (url.includes('/guarantors')) {
      const guarantors = await offlineDB.getCachedGuarantors();
      return { data: guarantors, success: true };
    } else if (url.includes('/inventory')) {
      const inventory = await offlineDB.getCachedInventory();
      return { data: inventory, success: true };
    } else if (url.includes('/payments')) {
      const payments = await offlineDB.getCachedPayments();
      return { data: payments, success: true };
    } else if (url.includes('/expenses')) {
      const expenses = await offlineDB.getCachedExpenses();
      return { data: expenses, success: true };
    }
    return null;
  } catch (e) {
    return null;
  }
}

function detectEntityType(url: string): any {
  if (url.includes('/customers')) return 'customer';
  if (url.includes('/products')) return 'product';
  if (url.includes('/installments')) return 'installment';
  if (url.includes('/promises')) return 'promise';
  if (url.includes('/guarantors')) return 'guarantor';
  if (url.includes('/inventory')) return 'inventory';
  if (url.includes('/payments')) return 'payment';
  if (url.includes('/receipts')) return 'receipt';
  if (url.includes('/expenses')) return 'expense';
  return null;
}

function extractRecordId(url: string): string {
  // Extract ID from URL like /customers/123 or /installments/123/payment
  const parts = url.split('/').filter(Boolean);
  // Find the first numeric part after an entity name
  for (let i = 0; i < parts.length; i++) {
    if (['customers', 'products', 'installments', 'promises', 'guarantors', 'inventory', 'payments', 'receipts', 'expenses'].includes(parts[i])) {
      if (i + 1 < parts.length && parts[i + 1] && !['payment', 'bulk-payment', 'advance', 'summary'].includes(parts[i + 1])) {
        return parts[i + 1];
      }
    }
  }
  return 'new';
}

// ═══════════════════════════════════════════════════════════════
// 📞 SPECIALIZED API FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export const getTodayInstallments = async (): Promise<any> => {
  try {
    const res = await api.get('/dashboard/today-installments');
    return res.data;
  } catch (error) {
    // Try to serve from cache
    const cached = await offlineDB.getCachedDashboardSummary();
    if (cached?.todayInstallments) {
      return cached.todayInstallments;
    }
    throw error;
  }
};

export const getTodayDueFull = async (): Promise<any> => {
  try {
    const res = await api.get('/dashboard/today-due-full');
    return res.data;
  } catch (error) {
    // Try to serve from cached installments
    const installments = await offlineDB.getCachedInstallments();
    const todayDue = installments.filter(i => {
      const today = new Date().toISOString().split('T')[0];
      return i.due_date === today && i.status === 'active';
    });
    if (todayDue.length > 0) {
      return { data: todayDue };
    }
    throw error;
  }
};

export const getOverdueFull = async (): Promise<any> => {
  try {
    const res = await api.get('/dashboard/overdue-full');
    return res.data;
  } catch (error) {
    // Try to serve from cached installments
    const installments = await offlineDB.getCachedInstallments();
    const overdue = installments.filter(i => {
      const today = new Date().toISOString().split('T')[0];
      return i.due_date < today && i.status === 'active';
    });
    if (overdue.length > 0) {
      return { data: overdue };
    }
    throw error;
  }
};

// ═══════════════════════════════════════════════════════════════
// 👥 CUSTOMER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export const getCustomers = () =>
  api.get('/customers').then(res => {
    const d = res.data;
    // API returns {data: [...], total: N} - extract the array
    return d?.data || d || [];
  });

export const createCustomer = (data: any) =>
  api.post('/customers', data).then(res => res.data);

// ═══════════════════════════════════════════════════════════════
// 📦 PRODUCT FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export const getProducts = () =>
  api.get('/products').then(res => {
    const d = res.data;
    // API returns {data: [...], total: N} - extract the array
    return d?.data || d || [];
  });

// ═══════════════════════════════════════════════════════════════
// 💰 PAYMENT FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export const recordPayment = (data: any) =>
  api.post('/payments', data).then(res => res.data);

export const advancePayment = (data: any) =>
  api.post('/payments/advance', data).then(res => res.data);

export const bulkPayment = (data: any) =>
  api.post('/payments/bulk', data).then(res => res.data);

// ═══════════════════════════════════════════════════════════════
// 📋 INSTALLMENT FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export const getInstallmentsByCustomer = (customerId: string) =>
  api.get(`/installments/customer/${customerId}`).then(res => res.data);

// ═══════════════════════════════════════════════════════════════
// 👤 USER MANAGEMENT FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export const getUsers = () =>
  api.get('/admin/users').then(res => res.data);

export const createUser = (data: any) =>
  api.post('/admin/users', data).then(res => res.data);

// ═══════════════════════════════════════════════════════════════
// 💾 BACKUP FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export const backupDatabase = () =>
  api.post('/admin/backup').then(res => res.data);

export const restoreDatabase = (data: any) =>
  api.post('/admin/restore', data).then(res => res.data);

export const sendEmailBackup = (data?: any) =>
  api.post('/admin/backup/email', data).then(res => res.data);

export const getBackupSettings = () =>
  api.get('/admin/backup/settings').then(res => res.data);

export const updateBackupSettings = (data: any) =>
  api.put('/admin/backup/settings', data).then(res => res.data);

// ═══════════════════════════════════════════════════════════════
// 🔐 AUTH FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export const login = (username: string, password: string) =>
  api.post('/auth/login', { username, password }).then(res => res.data);

export const changePassword = (oldPassword: string, newPassword: string) =>
  api.put('/auth/change-password', { oldPassword, newPassword }).then(res => res.data);

// Attach specialized functions to api
api.getTodayInstallments = getTodayInstallments;
api.getTodayDueFull = getTodayDueFull;
api.getOverdueFull = getOverdueFull;

export default api;
