import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';

// ✅ Retry configuration for 429 errors
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000; // Start with 2 seconds, will increase exponentially
const RETRYABLE_STATUSES = [429, 503, 502];

// ✅ Response cache - caches GET responses to avoid redundant network calls
const responseCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 30000; // 30 seconds cache lifetime

// ✅ Request deduplication - prevents the same in-flight request from being made multiple times
const pendingRequests = new Map<string, Promise<any>>();

function getRequestKey(config: InternalAxiosRequestConfig): string {
  return `${config.method}:${config.url}:${JSON.stringify(config.params || {})}:${JSON.stringify(config.data || '')}`;
}

// ✅ Types
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  status?: number;
  total?: number;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ✅ Base URL Configuration
// IMPORTANT: REACT_APP_API_URL should be the FULL backend URL including /api
// Example: http://localhost:8080/api  OR  https://your-backend.com/api
// Do NOT include trailing slash
const rawBaseURL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
// Remove trailing slash if present, then ensure /api is appended
const baseURL = rawBaseURL.endsWith('/api') ? rawBaseURL.replace(/\/+$/, '') : `${rawBaseURL.replace(/\/+$/, '')}/api`;

// ✅ Create axios instance
const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// ✅ Request Interceptor - Attach JWT token, check cache, and deduplicate GET requests
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from storage - use 'token' as primary key
    const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add language header
    const lang = localStorage.getItem('i18nextLng') || localStorage.getItem('language') || 'ur';
    config.headers['Accept-Language'] = lang;
    
    // ✅ Check response cache for GET requests
    if (config.method?.toLowerCase() === 'get') {
      const key = getRequestKey(config);
      const cached = responseCache.get(key);
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
        // Return cached response as a resolved promise
        return Promise.resolve({
          ...config,
          data: cached.data,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        } as any);
      }
      
      // ✅ Deduplicate GET requests - if the same GET request is already in-flight, return the existing promise
      const pending = pendingRequests.get(key);
      if (pending) {
        // Cancel this duplicate request and return the existing promise
        return pending;
      }
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// ✅ Wrap the axios instance to track pending GET requests
const originalRequest = api.request.bind(api);
api.request = function(config: any) {
  if (config.method?.toLowerCase() === 'get' || config.method === undefined) {
    const key = getRequestKey(config);
    if (!pendingRequests.has(key)) {
      const promise = originalRequest(config).finally(() => {
        pendingRequests.delete(key);
      });
      pendingRequests.set(key, promise);
      return promise;
    }
  }
  return originalRequest(config);
} as typeof api.request;

// ✅ Response Interceptor - Cache GET responses, handle errors with retry for 429, cleanup pending requests
api.interceptors.response.use(
  (response) => {
    // ✅ Cache successful GET responses
    const config = response.config as any;
    if (config.method?.toLowerCase() === 'get') {
      const key = getRequestKey(config);
      pendingRequests.delete(key);
      responseCache.set(key, { data: response.data, timestamp: Date.now() });
    }
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as any;
    
    // ✅ Handle 429 Too Many Requests with retry
    if (error.response?.status === 429) {
      // Initialize retry count
      config.__retryCount = config.__retryCount || 0;
      
      if (config.__retryCount < MAX_RETRIES) {
        config.__retryCount += 1;
        const delay = RETRY_DELAY_MS * Math.pow(2, config.__retryCount - 1); // Exponential backoff
        
        console.warn(`⚠️ Rate limited (429). Retry ${config.__retryCount}/${MAX_RETRIES} after ${delay}ms...`);
        
        // Wait for the delay
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Retry the request
        return api(config);
      }
      
      // All retries exhausted
      toast.error('بہت زیادہ درخواستیں۔ براہ کرم 60 سیکنڈ بعد دوبارہ کوشش کریں');
      return Promise.reject(error);
    }
    
    // Handle 401 Unauthorized - SILENTLY handle, don't show errors to user
    // Backend now allows requests through even without valid token
    if (error.response?.status === 401) {
      const token = localStorage.getItem('token');
      if (token) {
        // Don't show any toast or error - just log silently
        console.warn('⚠️ Received 401. Silently handling...');
        // Only logout if it's an auth endpoint that failed
        const url = error.config?.url || '';
        if (url.includes('/auth/login') || url.includes('/auth/me')) {
          // For auth endpoints, silently clear and redirect
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        // For non-auth endpoints: DO NOTHING - no toast, no error
        // Return a resolved promise with empty data to prevent UI breakage
        return Promise.resolve({ data: null });
      }
    }

    
    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      toast.error('You do not have permission to perform this action.');
    }
    
    // Handle 404 Not Found
    if (error.response?.status === 404) {
      toast.error('Resource not found.');
    }
    
    // Handle 500 Internal Server Error
    if (error.response?.status === 500) {
      toast.error('Internal server error. Please try again later.');
    }
    
    // Handle network errors
    if (!error.response) {
      toast.error('Network error. Please check your connection.');
    }
    
    return Promise.reject(error);
  }
);

// ============================================================
// ✅ AUTHENTICATION
// ============================================================

export const login = (username: string, password: string) =>
  api.post('/auth/login', { username, password }).then(res => res.data);

export const logout = () =>
  api.post('/auth/logout').then(res => res.data);

export const getCurrentUser = () =>
  api.get('/auth/me').then(res => res.data);

export const changePassword = (oldPassword: string, newPassword: string) =>
  api.post('/auth/change-password', { oldPassword, newPassword }).then(res => res.data);

// ============================================================
// ✅ CUSTOMERS
// ============================================================

export const getCustomers = (skip = 0, limit = 100) =>
  api.get(`/customers?skip=${skip}&limit=${limit}`).then(res => {
    const d = res.data;
    return Array.isArray(d.data) ? d.data : (Array.isArray(d) ? d : []);
  });

export const searchCustomers = (query: string, skip = 0, limit = 20) =>
  api.get(`/customers/search?q=${encodeURIComponent(query)}&skip=${skip}&limit=${limit}`).then(res => {
    const d = res.data;
    return Array.isArray(d.data) ? d.data : (Array.isArray(d) ? d : []);
  });

export const getCustomerById = (id: string) =>
  api.get(`/customers/${id}`).then(res => res.data);

export const createCustomer = (data: any) =>
  api.post('/customers', data).then(res => res.data);

export const updateCustomer = (id: string, data: any) =>
  api.put(`/customers/${id}`, data).then(res => res.data);

export const deleteCustomer = (id: string) =>
  api.delete(`/customers/${id}`).then(res => res.data);

// ============================================================
// ✅ GUARANTORS
// ============================================================

export const getGuarantors = (limit = 100) =>
  api.get(`/guarantors?limit=${limit}`).then(res => {
    const d = res.data;
    return Array.isArray(d.data) ? d.data : (Array.isArray(d) ? d : []);
  });

export const getGuarantorById = (id: string) =>
  api.get(`/guarantors/${id}`).then(res => res.data);

export const getGuarantorsByCustomer = (customerId: string) =>
  api.get(`/guarantors/customer?customer_id=${customerId}`).then(res => res.data);

export const createGuarantor = (data: any) =>
  api.post('/guarantors', data).then(res => res.data);

export const updateGuarantor = (id: string, data: any) =>
  api.put(`/guarantors/${id}`, data).then(res => res.data);

export const deleteGuarantor = (id: string) =>
  api.delete(`/guarantors/${id}`).then(res => res.data);

// ============================================================
// ✅ PRODUCTS
// ============================================================

export const getProducts = (skip = 0, limit = 50) =>
  api.get(`/products?skip=${skip}&limit=${limit}`).then(res => {
    const d = res.data;
    return Array.isArray(d.data) ? d.data : (Array.isArray(d) ? d : []);
  });

export const getProductById = (id: string) =>
  api.get(`/products/${id}`).then(res => res.data);

export const createProduct = (data: any) =>
  api.post('/products', data).then(res => res.data);

export const updateProduct = (id: string, data: any) =>
  api.put(`/products/${id}`, data).then(res => res.data);

export const deleteProduct = (id: string) =>
  api.delete(`/products/${id}`).then(res => res.data);

export const getProductsByCategory = (category: string) =>
  api.get(`/products?category=${category}`).then(res => res.data);

// ============================================================
// ✅ INVENTORY
// ============================================================

export const getInventory = (limit = 200) =>
  api.get(`/inventory?limit=${limit}`).then(res => {
    const d = res.data;
    return Array.isArray(d.data) ? d.data : (Array.isArray(d) ? d : []);
  });

export const getInventoryItem = (id: string) =>
  api.get(`/inventory/${id}`).then(res => res.data);

export const createInventoryItem = (data: any) =>
  api.post('/inventory', data).then(res => res.data);

export const updateInventoryItem = (id: string, data: any) =>
  api.put(`/inventory/${id}`, data).then(res => res.data);

export const deleteInventoryItem = (id: string) =>
  api.delete(`/inventory/${id}`).then(res => res.data);

export const addStock = (data: any) =>
  api.post('/inventory/add-stock', data).then(res => res.data);

export const removeStock = (data: any) =>
  api.post('/inventory/remove-stock', data).then(res => res.data);

export const getAgeingReport = (olderThanDays: number) =>
  api.get(`/inventory/ageing?older_than_days=${olderThanDays}`).then(res => res.data);

// ============================================================
// ✅ INSTALLMENTS
// ============================================================

export const createInstallmentPlan = (data: any) =>
  api.post('/installments', data).then(res => res.data);

export const getInstallment = (id: string) =>
  api.get(`/installments/${id}`).then(res => res.data);

export const getInstallmentsByCustomer = (customerId: string) =>
  api.get(`/installments/customer?customer_id=${customerId}`).then(res => res.data);

export const getUpcomingInstallments = (days: number) =>
  api.get(`/installments/upcoming?days=${days}`).then(res => res.data);

export const getDetailedReport = (days: number) =>
  api.get(`/installments/detailed-report?days=${days}`).then(res => res.data);

export const deleteInstallmentPlan = (id: string) =>
  api.delete(`/installments/${id}`).then(res => res.data);

export const reschedulePlan = (data: any) =>
  api.post('/installments/reschedule', data).then(res => res.data);

// ============================================================
// ✅ PAYMENTS
// ============================================================

export const recordPayment = (data: {
  plan_id: string;
  installment_no: number;
  amount: number;
  method: string;
  payment_date?: string;
  due_date?: string;
  collected_by?: string;
  collected_by_id?: string;
  remarks?: string;
}) => api.post('/installments/payment', data).then(res => res.data);

export const bulkPayment = (data: {
  plan_id: string;
  method: string;
  payment_date?: string;
  collected_by?: string;
  collected_by_id?: string;
  remarks?: string;
  payments: Array<{ installment_no: number; amount: number }>;
}) => api.post('/installments/bulk-payment', data).then(res => res.data);

export const advancePayment = (data: {
  plan_id: string;
  amount: number;
  method: string;
  payment_date?: string;
  collected_by?: string;
  collected_by_id?: string;
}) => api.post('/installments/advance', data).then(res => res.data);

export const getPaymentsByPlan = (planId: string) =>
  api.get(`/payments/plan/${planId}`).then(res => res.data);

// ============================================================
// ✅ ACCOUNTING / REPORTS
// ============================================================

export const getTodaySummary = () =>
  api.get('/accounting/today').then(res => res.data);

export const getMonthSummary = () =>
  api.get('/accounting/month').then(res => res.data);

export const getCashFlowProfit = (start: string, end: string) =>
  api.get(`/accounting/profit-loss/cash?start=${start}&end=${end}`).then(res => res.data);

export const getAccrualProfit = (start: string, end: string) =>
  api.get(`/accounting/profit-loss/accrual?start=${start}&end=${end}`).then(res => res.data);

export const getPendingTotal = () =>
  api.get('/accounting/pending-total').then(res => res.data);

export const getAccountingSummary = (start: string, end: string, basis = 'cash_flow') =>
  api.get(`/accounting/summary?start=${start}&end=${end}&basis=${basis}`).then(res => res.data);

export const getProductWiseRevenue = () =>
  api.get('/accounting/product-wise').then(res => res.data);

// ============================================================
// ✅ NOTIFICATIONS
// ============================================================

export const triggerReminders = () =>
  api.post('/notifications/reminders').then(res => res.data);

export const sendSingleReminder = (data: { customerId: string; planId: string; installmentNo: number }) =>
  api.post('/notifications/send', data).then(res => res.data);

export const getNotificationStats = () =>
  api.get('/notifications/stats').then(res => res.data);

// ============================================================
// ✅ RECEIPTS
// ============================================================

export const printReceipt = (paymentId: string) =>
  api.post(`/receipts/print/${paymentId}`).then(res => res.data);

export const downloadReceipt = (planId: string) =>
  api.get(`/receipts/download/${planId}`, { responseType: 'blob' }).then(res => res.data);

// ============================================================
// ✅ ADMIN
// ============================================================

export const getUsers = () =>
  api.get('/admin/users').then(res => res.data);

export const createUser = (data: any) =>
  api.post('/admin/users', data).then(res => res.data);

export const updateUser = (id: string, data: any) =>
  api.put(`/admin/users/${id}`, data).then(res => res.data);

export const deleteUser = (id: string) =>
  api.delete(`/admin/users/${id}`).then(res => res.data);

export const backupDatabase = () =>
  api.get('/admin/backup', { responseType: 'blob' }).then(res => res.data);

export const restoreDatabase = (data: any) =>
  api.post('/admin/restore', data).then(res => res.data);

// ============================================================
// ✅ AUDIT LOGS
// ============================================================

export const getAuditLogs = (page = 1, limit = 50) =>
  api.get(`/audit-logs?page=${page}&limit=${limit}`).then(res => res.data);

// ============================================================
// ✅ DASHBOARD FULL DETAILS (Professional Tables)
// ============================================================

export const getTodayDueFull = () =>
  api.get('/dashboard/today-due-full').then(res => {
    const d = res.data;
    return Array.isArray(d) ? d : (Array.isArray(d.data) ? d.data : []);
  });

export const getOverdueFull = () =>
  api.get('/dashboard/overdue-full').then(res => {
    const d = res.data;
    return Array.isArray(d) ? d : (Array.isArray(d.data) ? d.data : []);
  });

// ============================================================
// ✅ UTILITY FUNCTIONS
// ============================================================

export const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('token');
};

export const getApiUrl = (endpoint: string): string => {
  return `${baseURL}${endpoint}`;
};

export default api;