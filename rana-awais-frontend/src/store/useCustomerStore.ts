import { create } from 'zustand';
import { getCustomers } from '../utils/api';
import toast from 'react-hot-toast';

// ✅ Types
export interface Customer {
  id: string;
  name: string;
  nameUrdu: string;
  fatherName?: string;
  father_name?: string;
  fatherNameUrdu?: string;
  father_name_urdu?: string;
  phone: string;
  cnic: string;
  address: string;
  addressUrdu: string;
  residential?: string;
  occupant?: string;
  residentialAddress?: string;
  officeAddress?: string;
  accountNo?: string;
  costNo?: string;
  processNo?: string;
  reprAsCost?: string;
  reprAsGar?: string;
  prepAC?: string;
  guarantorIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface CustomerState {
  customers: Customer[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  searchQuery: string;
  selectedCustomerId: string | null;
  fetchCustomers: (force?: boolean) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSelectedCustomer: (id: string | null) => void;
  getCustomerById: (id: string) => Customer | undefined;
  getCustomerByPhone: (phone: string) => Customer | undefined;
  searchCustomers: (query: string) => Customer[];
  addCustomer: (customer: Customer) => void;
  updateCustomer: (id: string, customer: Partial<Customer>) => void;
  removeCustomer: (id: string) => void;
  clearError: () => void;
  reset: () => void;
}

// ✅ Cache TTL - 5 minutes
const CACHE_TTL = 5 * 60 * 1000;

// ✅ Storage keys
const STORAGE_KEYS = {
  CUSTOMERS: 'customers_cache',
  LAST_FETCHED: 'customers_last_fetched',
};

// ✅ Load cached data
const loadCachedCustomers = (): { customers: Customer[]; lastFetched: number | null } => {
  try {
    const cached = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    const lastFetched = localStorage.getItem(STORAGE_KEYS.LAST_FETCHED);
    return {
      customers: cached ? JSON.parse(cached) : [],
      lastFetched: lastFetched ? parseInt(lastFetched, 10) : null,
    };
  } catch {
    return { customers: [], lastFetched: null };
  }
};

// ✅ Save cache
const saveCache = (customers: Customer[], lastFetched: number) => {
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    localStorage.setItem(STORAGE_KEYS.LAST_FETCHED, String(lastFetched));
  } catch {
    // Silently fail
  }
};

// ✅ Create store WITHOUT persist middleware to avoid infinite re-render loops
export const useCustomerStore = create<CustomerState>()((set, get) => {
  const cached = loadCachedCustomers();
  
  return {
    customers: cached.customers,
    loading: false,
    error: null,
    lastFetched: cached.lastFetched,
    searchQuery: '',
    selectedCustomerId: null,

    // ✅ Fetch customers with cache
    fetchCustomers: async (force = false) => {
      const state = get();
      
      // Check cache
      if (!force && state.lastFetched && 
          Date.now() - state.lastFetched < CACHE_TTL && 
          state.customers.length > 0) {
        return;
      }

      set({ loading: true, error: null });
      
      try {
        const data = await getCustomers(0, 10000);
        const customers = Array.isArray(data) ? data : [];
        const lastFetched = Date.now();
        saveCache(customers, lastFetched);
        set({ 
          customers, 
          loading: false, 
          lastFetched,
          error: null 
        });
      } catch (err: any) {
        const errorMsg = err.response?.data?.error || err.message || 'Failed to fetch customers';
        console.error('Failed to fetch customers:', err);
        set({ 
          customers: [], 
          loading: false, 
          error: errorMsg 
        });
        toast.error(errorMsg);
      }
    },

    // ✅ Set search query
    setSearchQuery: (query: string) => set({ searchQuery: query }),

    // ✅ Set selected customer
    setSelectedCustomer: (id: string | null) => set({ selectedCustomerId: id }),

    // ✅ Get customer by ID
    getCustomerById: (id: string) => {
      return get().customers.find(c => c.id === id);
    },

    // ✅ Get customer by phone
    getCustomerByPhone: (phone: string) => {
      const cleaned = phone.replace(/\D/g, '');
      return get().customers.find(c => c.phone.replace(/\D/g, '') === cleaned);
    },

    // ✅ Search customers
    searchCustomers: (query: string) => {
      if (!query) return get().customers;
      
      const q = query.toLowerCase();
      return get().customers.filter(c =>
        c.name?.toLowerCase().includes(q) ||
        c.nameUrdu?.includes(q) ||
        c.fatherName?.toLowerCase().includes(q) ||
        c.fatherNameUrdu?.includes(q) ||
        c.phone?.includes(q) ||
        c.cnic?.includes(q) ||
        c.address?.toLowerCase().includes(q) ||
        c.addressUrdu?.includes(q) ||
        c.accountNo?.toLowerCase().includes(q) ||
        c.costNo?.toLowerCase().includes(q) ||
        c.processNo?.toLowerCase().includes(q)
      );
    },

    // ✅ Add customer
    addCustomer: (customer: Customer) => {
      set(state => {
        const customers = [customer, ...state.customers];
        const lastFetched = Date.now();
        saveCache(customers, lastFetched);
        return { customers, lastFetched };
      });
    },

    // ✅ Update customer
    updateCustomer: (id: string, customerData: Partial<Customer>) => {
      set(state => {
        const customers = state.customers.map(c => 
          c.id === id ? { ...c, ...customerData } : c
        );
        const lastFetched = Date.now();
        saveCache(customers, lastFetched);
        return { customers, lastFetched };
      });
    },

    // ✅ Remove customer
    removeCustomer: (id: string) => {
      set(state => {
        const customers = state.customers.filter(c => c.id !== id);
        const lastFetched = Date.now();
        saveCache(customers, lastFetched);
        return { customers, lastFetched };
      });
    },

    // ✅ Clear error
    clearError: () => set({ error: null }),

    // ✅ Reset store
    reset: () => {
      set({
        customers: [],
        loading: false,
        error: null,
        lastFetched: null,
        searchQuery: '',
        selectedCustomerId: null,
      });
      localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
      localStorage.removeItem(STORAGE_KEYS.LAST_FETCHED);
    },
  };
});

// ✅ Helper hooks - use direct state access to avoid infinite loops
export const useCustomers = () => useCustomerStore((state) => state.customers);
export const useCustomerLoading = () => useCustomerStore((state) => state.loading);
export const useCustomerError = () => useCustomerStore((state) => state.error);
export const useSelectedCustomer = () => {
  const customers = useCustomerStore((state) => state.customers);
  const selectedId = useCustomerStore((state) => state.selectedCustomerId);
  if (!selectedId) return null;
  return customers.find(c => c.id === selectedId) || null;
};

// ✅ Utility function to format customer for display
export const formatCustomerName = (customer: Customer, isUrdu = false): string => {
  if (!customer) return '';
  return isUrdu ? (customer.nameUrdu || customer.name) : (customer.name || customer.nameUrdu);
};

export const formatCustomerFullName = (customer: Customer, isUrdu = false): string => {
  if (!customer) return '';
  const name = formatCustomerName(customer, isUrdu);
  const father = isUrdu 
    ? (customer.fatherNameUrdu || customer.fatherName || '')
    : (customer.fatherName || '');
  return father ? `${name} (${father})` : name;
};

export default useCustomerStore;
