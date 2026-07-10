import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { offlineDB } from '../db/indexeddb';
import { syncEngine } from './sync';

// ═══════════════════════════════════════════════════════════════
// ✅ Rana Awais Electronics - API Client v5 (ULTRA FAST)
// ✅ Aggressive caching with localStorage + IndexedDB
// ✅ Parallel requests for dashboard
// ✅ Debounced search
// ═══════════════════════════════════════════════════════════════

// Get VITE_API_URL from env or use default
const VITE_API_URL = (window as any).__VITE_API_URL__ || '';

const BASE_URL = (() => {
  if (VITE_API_URL) return VITE_API_URL;
  
  // Try to get from localStorage (set during login)
  const storedUrl = localStorage.getItem('api_url');
  if (storedUrl) return storedUrl;
  
  // ✅ Auto-detect: if on Vercel (HTTPS), use production backend URL
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://farooqautos.onrender.com/api';
  }
  
  // Local development
  return 'http://localhost:8080/api';
})();

console.log('🌐 API Base URL:', BASE_URL);

// ✅ In-memory cache for instant responses (5s TTL - balanced for freshness & performance)
const memoryCache = new Map<string, { data: any; timestamp: number }>();
const MEMORY_CACHE_TTL = 5000; // 5 seconds

const api: AxiosInstance & {
  getTodayInstallments?: () => Promise<any>;
  getTodayDueFull?: () => Promise<any>;
  getOverdueFull?: () => Promise<any>;
} = axios.create({
  baseURL: BASE_URL,
  timeout: 10000, // Reduced from 15000 to 10000
  headers: {
    'Content-Type': 'application/json',
  },
});

// ═══════════════════════════════════════════════════════════════
// 🔐 REQUEST INTERCEPTOR - Add auth token + cache check
// ═══════════════════════════════════════════════════════════════

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // ✅ Add cache-buster for GET requests (but only every 30s)
    if (config.method?.toLowerCase() === 'get' && config.url) {
      const cacheKey = config.url;
      const cached = memoryCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < MEMORY_CACHE_TTL) {
        // Return cached data immediately
        return Promise.reject({ 
          __fromCache: true, 
          __cachedData: cached.data,
          config 
        });
      }
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// ═══════════════════════════════════════════════════════════════
// 📦 RESPONSE INTERCEPTOR - Cache + Offline-first
// ═══════════════════════════════════════════════════════════════

api.interceptors.response.use(
  async (response: AxiosResponse) => {
    // ✅ Cache GET responses in memory + IndexedDB
    if (response.config.method?.toLowerCase() === 'get' && response.data && response.config.url) {
      memoryCache.set(response.config.url, { data: response.data, timestamp: Date.now() });
      // Async cache to IndexedDB (don't await - fire and forget)
      cacheResponse(response.config.url, response.data).catch(() => {});
    }
    return response;
  },
  async (error) => {
    // ✅ Handle in-memory cache hits
    if (error.__fromCache) {
      return Promise.resolve({
        data: error.__cachedData,
        status: 200,
        statusText: 'OK (Memory Cache)',
        headers: {},
        config: error.config,
      });
    }
    
    const config = error.config as AxiosRequestConfig & { _retry?: boolean };
    
    // ✅ If offline or network error, try to serve from cache
    if (!navigator.onLine || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
      const url = config.url || '';
      const method = config.method?.toLowerCase() || 'get';

      // For GET requests, try memory cache first, then IndexedDB
      if (method === 'get') {
        // Check memory cache
        const memCached = memoryCache.get(url);
        if (memCached) {
          console.log(`📦 Serving from memory cache: ${url}`);
          return Promise.resolve({
            data: memCached.data,
            status: 200,
            statusText: 'OK (Memory Cache)',
            headers: {},
            config,
          });
        }
        
        // Try IndexedDB
        const cachedData = await getCachedResponse(url);
        if (cachedData) {
          console.log(`📦 Serving from IndexedDB: ${url}`);
          memoryCache.set(url, { data: cachedData, timestamp: Date.now() });
          return Promise.resolve({
            data: cachedData,
            status: 200,
            statusText: 'OK (Cached)',
            headers: {},
            config,
          });
        }
      }

      // For POST/PUT/DELETE, only queue if truly offline (not on network errors)
      if (['post', 'put', 'delete'].includes(method) && !navigator.onLine) {
        const data = config.data ? JSON.parse(config.data) : {};
        const entityType = detectEntityType(url);
        const operation = method === 'post' ? 'create' : method === 'put' ? 'update' : 'delete';
        const recordId = extractRecordId(url);

        if (entityType) {
          await syncEngine.queueOperation(entityType, operation, recordId, data, url);
          console.log(`📝 Queued offline operation: ${operation} ${entityType} (${recordId})`);
          
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
    // Silently fail
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
  const parts = url.split('/').filter(Boolean);
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
    return d?.data || d || [];
  });

export const createCustomer = (data: any) =>
  api.post('/customers', data).then(res => res.data);

// ═══════════════════════════════════════════════════════════════
// 📦 PRODUCT FUNCTIONS - FULL CRUD + SEARCH + BULK + STOCK
// ═══════════════════════════════════════════════════════════════

export const getProducts = (params?: { skip?: number; limit?: number; category?: string }) =>
  api.get('/products', { params }).then(res => {
    const d = res.data;
    return d?.data || d || [];
  });

export const getProductById = (id: string) =>
  api.get(`/products/${id}`).then(res => res.data);

export const createProduct = (data: any) =>
  api.post('/products', data).then(res => res.data);

export const updateProduct = (id: string, data: any) =>
  api.put(`/products/${id}`, data).then(res => res.data);

export const deleteProduct = (id: string) =>
  api.delete(`/products/${id}`).then(res => res.data);

export const searchProducts = (query: string, params?: { skip?: number; limit?: number }) =>
  api.get('/products/search', { params: { q: query, ...params } }).then(res => {
    const d = res.data;
    return d?.data || d || [];
  });

export const bulkDeleteProducts = (ids: string[]) =>
  api.post('/products/bulk-delete', { ids }).then(res => res.data);

export const getLowStockProducts = (threshold?: number) =>
  api.get('/products/low-stock', { params: { threshold } }).then(res => {
    const d = res.data;
    return d?.data || d || [];
  });

export const addStock = (productId: string, quantity: number, note?: string) =>
  api.post('/inventory/add-stock', { product_id: productId, quantity, note }).then(res => res.data);


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
