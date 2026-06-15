import axios from 'axios';

// Ensure the base URL always ends with /api
const rawBaseURL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
const baseURL = rawBaseURL.endsWith('/api') ? rawBaseURL : `${rawBaseURL.replace(/\/+$/, '')}/api`;

const api = axios.create({
  baseURL,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ---------- Customers ----------
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

export const createCustomer = (data: any) =>
  api.post('/customers', data).then(res => res.data);

// ---------- Products ----------
export const getProducts = () =>
  api.get('/products?limit=50').then(res => {
    const d = res.data;
    return Array.isArray(d.data) ? d.data : (Array.isArray(d) ? d : []);
  });

export const createProduct = (data: any) =>
  api.post('/products', data).then(res => res.data);

// ---------- Guarantors ----------
export const createGuarantor = (data: any) =>
  api.post('/guarantors', data).then(res => res.data);

export const getGuarantors = (limit = 100) =>
  api.get(`/guarantors?limit=${limit}`).then(res => {
    const d = res.data;
    return Array.isArray(d.data) ? d.data : (Array.isArray(d) ? d : []);
  });

// ---------- Installments ----------
export const createInstallmentPlan = (data: any) =>
  api.post('/installments', data).then(res => res.data);

export const getInstallment = (id: string) =>
  api.get(`/installments/${id}`).then(res => res.data);

export const getInstallmentsByCustomer = (customerId: string) =>
  api.get(`/installments/customer?customer_id=${customerId}`).then(res => res.data);

export const getUpcomingInstallments = (days: number) =>
  api.get(`/installments/upcoming?days=${days}`).then(res => res.data);

// ---------- Payments ----------
export const recordPayment = (data: {
  plan_id: string;
  installment_no: number;
  amount: number;
  method: string;
  payment_date?: string;
  due_date?: string;
  collected_by?: string;
}) => api.post('/installments/payment', data).then(res => res.data);


export const bulkPayment = (data: {
  plan_id: string;
  method: string;
  payment_date?: string;
  collected_by?: string;
  payments: Array<{ installment_no: number; amount: number }>;
}) => api.post('/installments/bulk-payment', data).then(res => res.data);

export const advancePayment = (data: {
  plan_id: string;
  amount: number;
  method: string;
  payment_date?: string;
  collected_by?: string;
}) => api.post('/installments/advance', data).then(res => res.data);


// ---------- Inventory ----------
export const getInventory = (limit = 200) =>
  api.get(`/inventory?limit=${limit}`).then(res => {
    const d = res.data;
    return Array.isArray(d.data) ? d.data : (Array.isArray(d) ? d : []);
  });

export const getAgeingReport = (olderThanDays: number) =>
  api.get(`/inventory/ageing?older_than_days=${olderThanDays}`).then(res => res.data);

export const createInventoryItem = (data: any) =>
  api.post('/inventory', data).then(res => res.data);

// ---------- Accounting ----------
export const getCashFlowProfit = (start: string, end: string) =>
  api.get(`/accounting/profit-loss/cash?start=${start}&end=${end}`).then(res => res.data);

export const getAccrualProfit = (start: string, end: string) =>
  api.get(`/accounting/profit-loss/accrual?start=${start}&end=${end}`).then(res => res.data);

// ---------- Notifications ----------
export const triggerReminders = () =>
  api.post('/notifications/reminders').then(res => res.data);

// ---------- Receipts ----------
export const printReceipt = (paymentId: string) =>
  api.post(`/receipts/print/${paymentId}`).then(res => res.data);

// ---------- Authentication ----------
export const login = (username: string, password: string) =>
  api.post('/auth/login', { username, password }).then(res => res.data);

// ---------- User Management (Admin only) ----------
export const getUsers = () =>
  api.get('/admin/users').then(res => res.data);

export const createUser = (data: any) =>
  api.post('/admin/users', data).then(res => res.data);

export default api;