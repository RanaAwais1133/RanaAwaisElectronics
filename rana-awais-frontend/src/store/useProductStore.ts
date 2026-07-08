import { create } from 'zustand';
import { getProducts } from '../utils/api';
import toast from 'react-hot-toast';

// ✅ Types
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
  sku?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ProductState {
  products: Product[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  searchQuery: string;
  selectedCategory: string;
  selectedProductId: string | null;
  isFetching: boolean;
  fetchProducts: (force?: boolean) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  setSelectedProduct: (id: string | null) => void;
  getProductById: (id: string) => Product | undefined;
  getProductsByCategory: (category: string) => Product[];
  searchProducts: (query: string) => Product[];
  getCategories: () => string[];
  getInStockProducts: () => Product[];
  getOutOfStockProducts: () => Product[];
  addProduct: (product: Product) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  removeProduct: (id: string) => void;
  clearError: () => void;
  reset: () => void;
}

// ✅ Cache TTL - 5 seconds (balanced for freshness & performance)
const CACHE_TTL = 5 * 1000;

// ✅ Storage keys
const STORAGE_KEYS = {
  PRODUCTS: 'products_cache',
  LAST_FETCHED: 'products_last_fetched',
};

// ✅ Load cached data
const loadCachedProducts = (): { products: Product[]; lastFetched: number | null } => {
  try {
    const cached = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    const lastFetched = localStorage.getItem(STORAGE_KEYS.LAST_FETCHED);
    return {
      products: cached ? JSON.parse(cached) : [],
      lastFetched: lastFetched ? parseInt(lastFetched, 10) : null,
    };
  } catch {
    return { products: [], lastFetched: null };
  }
};

// ✅ Save cache
const saveCache = (products: Product[], lastFetched: number) => {
  try {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    localStorage.setItem(STORAGE_KEYS.LAST_FETCHED, String(lastFetched));
  } catch {
    // Silently fail
  }
};

// ✅ Create store WITHOUT persist middleware to avoid infinite re-render loops
export const useProductStore = create<ProductState>()((set, get) => {
  const cached = loadCachedProducts();
  
  return {
    products: cached.products,
    loading: false,
    error: null,
    lastFetched: cached.lastFetched,
    searchQuery: '',
    selectedCategory: 'all',
    isFetching: false,
    selectedProductId: null,

    // ✅ Fetch products with cache
    fetchProducts: async (force = false) => {
      const state = get();

      // Prevent concurrent fetches (unless forced)
      if (state.isFetching && !force) return;

      // Check cache (skip if forced)
      if (!force && state.lastFetched && 
          Date.now() - state.lastFetched < CACHE_TTL && 
          state.products.length > 0) {
        return;
      }

      set({ loading: true, isFetching: true, error: null });

      try {
        const data = await getProducts();
        const products = Array.isArray(data) ? data : [];
        
        // Ensure in_stock is set based on stockCount
        const processedProducts = products.map(p => ({
          ...p,
          in_stock: p.stockCount !== undefined ? p.stockCount > 0 : p.in_stock,
        }));

        const lastFetched = Date.now();
        saveCache(processedProducts, lastFetched);

        set({
          products: processedProducts,
          loading: false,
          isFetching: false,
          lastFetched,
          error: null,
        });
      } catch (err: any) {
        const errorMsg = err.response?.data?.error || err.message || 'Failed to fetch products';
        console.error('Failed to fetch products:', err);
        set({
          products: [],
          loading: false,
          isFetching: false,
          error: errorMsg,
        });
        toast.error(errorMsg);
      }
    },

    // ✅ Set search query
    setSearchQuery: (query: string) => set({ searchQuery: query }),

    // ✅ Set selected category
    setSelectedCategory: (category: string) => set({ selectedCategory: category }),

    // ✅ Set selected product
    setSelectedProduct: (id: string | null) => set({ selectedProductId: id }),

    // ✅ Get product by ID
    getProductById: (id: string) => {
      return get().products.find(p => p.id === id);
    },

    // ✅ Get products by category
    getProductsByCategory: (category: string) => {
      if (!category || category === 'all') return get().products;
      return get().products.filter(p => p.category === category);
    },

    // ✅ Search products
    searchProducts: (query: string) => {
      if (!query) return get().products;

      const q = query.toLowerCase();
      return get().products.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.nameUrdu?.includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.company?.toLowerCase().includes(q) ||
        p.companyUrdu?.includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q)
      );
    },

    // ✅ Get categories
    getCategories: () => {
      const categories = new Set<string>();
      get().products.forEach(p => {
        if (p.category) categories.add(p.category);
      });
      return ['all', ...Array.from(categories)];
    },

    // ✅ Get in-stock products
    getInStockProducts: () => {
      return get().products.filter(p => p.in_stock && (p.stockCount || 0) > 0);
    },

    // ✅ Get out-of-stock products
    getOutOfStockProducts: () => {
      return get().products.filter(p => !p.in_stock || (p.stockCount || 0) <= 0);
    },

    // ✅ Add product
    addProduct: (product: Product) => {
      set(state => {
        const products = [product, ...state.products];
        const lastFetched = Date.now();
        saveCache(products, lastFetched);
        return { products, lastFetched };
      });
    },

    // ✅ Update product
    updateProduct: (id: string, productData: Partial<Product>) => {
      set(state => {
        const products = state.products.map(p =>
          p.id === id ? { ...p, ...productData } : p
        );
        const lastFetched = Date.now();
        saveCache(products, lastFetched);
        return { products, lastFetched };
      });
    },

    // ✅ Remove product
    removeProduct: (id: string) => {
      set(state => {
        const products = state.products.filter(p => p.id !== id);
        const lastFetched = Date.now();
        saveCache(products, lastFetched);
        return { products, lastFetched };
      });
    },

    // ✅ Clear error
    clearError: () => set({ error: null }),

    // ✅ Reset store
    reset: () => {
      set({
        products: [],
        loading: false,
        error: null,
        lastFetched: null,
        searchQuery: '',
        selectedCategory: 'all',
        selectedProductId: null,
      });
      localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
      localStorage.removeItem(STORAGE_KEYS.LAST_FETCHED);
    },
  };
});

// ✅ Helper hooks - use direct state access to avoid infinite loops
export const useProducts = () => useProductStore((state) => state.products);
export const useProductLoading = () => useProductStore((state) => state.loading);
export const useProductError = () => useProductStore((state) => state.error);
export const useSelectedProduct = () => {
  const products = useProductStore((state) => state.products);
  const selectedId = useProductStore((state) => state.selectedProductId);
  if (!selectedId) return null;
  return products.find(p => p.id === selectedId) || null;
};
export const useCategories = () => useProductStore((state) => {
  const categories = new Set<string>();
  state.products.forEach(p => {
    if (p.category) categories.add(p.category);
  });
  return ['all', ...Array.from(categories)];
});

// ✅ Utility functions
export const formatProductName = (product: Product, isUrdu = false): string => {
  if (!product) return '';
  return isUrdu ? (product.nameUrdu || product.name) : (product.name || product.nameUrdu);
};

export const formatProductPrice = (product: Product): string => {
  if (!product) return '0';
  return product.price?.toLocaleString() || '0';
};

export const getProductStockStatus = (product: Product): 'in_stock' | 'out_of_stock' => {
  return (product.in_stock && (product.stockCount || 0) > 0) ? 'in_stock' : 'out_of_stock';
};

export const getStockStatusLabel = (product: Product, isUrdu = false): string => {
  const status = getProductStockStatus(product);
  return status === 'in_stock' ? (isUrdu ? 'اسٹاک میں' : 'In Stock') : (isUrdu ? 'اسٹاک ختم' : 'Out of Stock');
};

export default useProductStore;
