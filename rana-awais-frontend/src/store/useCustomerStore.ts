import { create } from 'zustand';
import { getCustomers } from '../utils/api';

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
  guarantorIds?: string[];
}
interface CustomerState {
  customers: Customer[];
  loading: boolean;
  lastFetched: number | null;
  fetchCustomers: (force?: boolean) => Promise<void>;
}

const CACHE_TTL = 30000; // 30 seconds cache

export const useCustomerStore = create<CustomerState>((set, get) => ({
  customers: [],
  loading: false,
  lastFetched: null,
  fetchCustomers: async (force = false) => {
    const state = get();
    // Use cache if data exists and not expired
    if (!force && state.lastFetched && Date.now() - state.lastFetched < CACHE_TTL && state.customers.length > 0) {
      return;
    }
    set({ loading: true });
    try {
      const data = await getCustomers(0, 10000);
      set({ customers: data || [], loading: false, lastFetched: Date.now() });
    } catch (err) {
      console.error('Failed to fetch customers:', err);
      set({ customers: [], loading: false });
    }
  },
}));
