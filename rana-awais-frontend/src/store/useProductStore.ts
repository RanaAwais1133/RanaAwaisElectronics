import { create } from 'zustand';
import { getProducts } from '../utils/api';

export interface Product {
  id: string;
  name: string;
  nameUrdu: string;
  price: number;
  purchasePrice?: number;
  category: string;
  description?: string;
  in_stock: boolean;
  stockCount?: number;
  company?: string;
  companyUrdu?: string;
}

interface ProductState {
  products: Product[];
  loading: boolean;
  lastFetched: number | null;
  fetchProducts: (force?: boolean) => Promise<void>;
}

const CACHE_TTL = 30000; // 30 seconds cache

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  loading: false,
  lastFetched: null,
  fetchProducts: async (force = false) => {
    const state = get();
    // Use cache if data exists and not expired
    if (!force && state.lastFetched && Date.now() - state.lastFetched < CACHE_TTL && state.products.length > 0) {
      return;
    }
    set({ loading: true });
    try {
      const data = await getProducts();
      set({ products: data || [], loading: false, lastFetched: Date.now() });
    } catch (err) {
      console.error('Failed to fetch products:', err);
      set({ products: [], loading: false });
    }
  },
}));
