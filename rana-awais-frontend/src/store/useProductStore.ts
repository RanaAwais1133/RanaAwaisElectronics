// ═══════════════════════════════════════════════════════════════
// ✅ Rana Awais Electronics - Product Store v2
// ✅ Optimistic updates with rollback
// ✅ Real-time SSE sync
// ✅ Pagination, search, bulk operations
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  bulkDeleteProducts,
  getLowStockProducts,
  addStock,
} from '../utils/api';
import { realtime } from '../utils/realtime';
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

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ProductState {
  // Data
  products: Product[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;

  // Search & Filter
  searchQuery: string;
  selectedCategory: string;
  selectedProductId: string | null;

  // Pagination
  pagination: PaginationState;

  // Bulk selection
  selectedIds: Set<string>;
  isBulkMode: boolean;

  // Low stock
  lowStockProducts: Product[];
  lowStockThreshold: number;

  // Real-time
  isRealtimeConnected: boolean;

  // Actions
  fetchProducts: (force?: boolean) => Promise<void>;
  fetchProductById: (id: string) => Promise<Product | null>;
  createProduct: (data: Partial<Product>) => Promise<Product | null>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  searchProducts: (query: string) => Promise<void>;
  bulkDelete: (ids: string[]) => Promise<boolean>;
  addStock: (productId: string, quantity: number, note?: string) => Promise<boolean>;
  fetchLowStock: (threshold?: number) => Promise<void>;

  // UI state
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  setSelectedProduct: (id: string | null) => void;
  setPage: (page: number) => void;
  toggleBulkMode: () => void;
  toggleSelection: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  clearError: () => void;
  reset: () => void;

  // Helpers
  getProductById: (id: string) => Product | undefined;
  getProductsByCategory: (category: string) => Product[];
  getCategories: () => string[];
  getInStockProducts: () => Product[];
  getOutOfStockProducts: () => Product[];
}

// ✅ Cache TTL
const CACHE_TTL = 5 * 1000;
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

// ✅ Process products (ensure in_stock is correct)
const processProducts = (products: any[]): Product[] => {
  return products.map(p => ({
    ...p,
    in_stock: p.stockCount !== undefined ? p.stockCount > 0 : p.in_stock,
  }));
};

export const useProductStore = create<ProductState>()((set, get) => {
  const cached = loadCachedProducts();

  // ✅ Setup real-time SSE listeners
  const setupRealtime = () => {
    // Listen for product created
    realtime.on('product_created', (data: any) => {
      // data comes as { id, product: { ... }, timestamp }
      const productData = data.product || data;
      const productId = data.id || productData.id;
      const state = get();
      const exists = state.products.find(p => p.id === productId);
      if (!exists) {
        const newProduct = processProducts([productData])[0];
        set(state => {
          const products = [newProduct, ...state.products];
          saveCache(products, Date.now());
          return { products, lastFetched: Date.now() };
        });
        toast.success(`🆕 New product added: ${productData.name || productData.nameUrdu}`);
      }
    });

    // Listen for product updated
    realtime.on('product_updated', (data: any) => {
      // data comes as { id, product: { ... }, timestamp }
      const productData = data.product || data;
      const productId = data.id || productData.id;
      set(state => {
        const products = state.products.map(p =>
          p.id === productId ? { ...p, ...productData, in_stock: productData.stockCount !== undefined ? productData.stockCount > 0 : productData.in_stock } : p
        );
        saveCache(products, Date.now());
        return { products, lastFetched: Date.now() };
      });
    });

    // Listen for product deleted
    realtime.on('product_deleted', (data: any) => {
      // data comes as { id, product: null, timestamp }
      const productId = data.id;
      set(state => {
        const products = state.products.filter(p => p.id !== productId);
        saveCache(products, Date.now());
        return { products, lastFetched: Date.now() };
      });
    });

    // Listen for stock added
    realtime.on('stock_added', (data: any) => {
      set(state => {
        // data comes as { id, quantity, product: { ... } }
        const productId = data.id || data.product_id;
        const productData = data.product;
        const newStockCount = productData?.stockCount || 0;
        const products = state.products.map(p =>
          p.id === productId
            ? { ...p, stockCount: newStockCount, in_stock: newStockCount > 0 }
            : p
        );
        saveCache(products, Date.now());
        return { products, lastFetched: Date.now() };
      });
    });

    // Track connection status
    set({ isRealtimeConnected: realtime.connected });
  };

  // Setup listeners once
  setupRealtime();

  return {
    // Initial state
    products: cached.products,
    loading: false,
    error: null,
    lastFetched: cached.lastFetched,
    searchQuery: '',
    selectedCategory: 'all',
    selectedProductId: null,
    pagination: { page: 1, limit: 10000, total: 0, totalPages: 0 },
    selectedIds: new Set(),
    isBulkMode: false,
    lowStockProducts: [],
    lowStockThreshold: 5,
    isRealtimeConnected: false,

    // ✅ Fetch products with pagination (limit=10000 for all products)
    fetchProducts: async (force = false) => {
      const state = get();

      // Check cache
      if (!force && state.lastFetched &&
          Date.now() - state.lastFetched < CACHE_TTL &&
          state.products.length > 0) {
        return;
      }

      set({ loading: true, error: null });

      try {
        const { page, limit } = state.pagination;
        const skip = (page - 1) * limit;
        const data = await getProducts({ skip, limit, category: state.selectedCategory !== 'all' ? state.selectedCategory : undefined });
        const products = processProducts(Array.isArray(data) ? data : []);

        const lastFetched = Date.now();
        saveCache(products, lastFetched);

        set({
          products,
          loading: false,
          lastFetched,
          error: null,
          pagination: {
            ...state.pagination,
            total: products.length,
            totalPages: Math.ceil(products.length / limit),
          },
        });
      } catch (err: any) {
        const errorMsg = err.response?.data?.error || err.message || 'Failed to fetch products';
        console.error('Failed to fetch products:', err);
        set({ loading: false, error: errorMsg });
        toast.error(errorMsg);
      }
    },

    // ✅ Fetch single product by ID
    fetchProductById: async (id: string) => {
      try {
        const { getProductById: getById } = await import('../utils/api');
        const data = await getById(id);
        return data || null;
      } catch (err) {
        console.error('Failed to fetch product:', err);
        return null;
      }
    },

    // ✅ Create product with optimistic update
    createProduct: async (data: Partial<Product>) => {
      // Generate temp ID for optimistic update
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const optimisticProduct: Product = {
        id: tempId,
        name: data.name || '',
        nameUrdu: data.nameUrdu || '',
        price: data.price || 0,
        purchasePrice: data.purchasePrice,
        category: data.category || '',
        description: data.description,
        in_stock: (data.stockCount || 0) > 0,
        stockCount: data.stockCount || 0,
        company: data.company,
        companyUrdu: data.companyUrdu,
        sku: data.sku,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Optimistic add
      set(state => {
        const products = [optimisticProduct, ...state.products];
        saveCache(products, Date.now());
        return { products, lastFetched: Date.now() };
      });

      try {
        const result = await createProduct(data);
        // Replace temp with real product
        set(state => {
          const products = state.products.map(p =>
            p.id === tempId ? { ...result, in_stock: (result.stockCount || 0) > 0 } : p
          );
          saveCache(products, Date.now());
          return { products, lastFetched: Date.now() };
        });
        toast.success(`✅ Product "${result.name || result.nameUrdu}" created`);
        return result;
      } catch (err: any) {
        // Rollback
        set(state => {
          const products = state.products.filter(p => p.id !== tempId);
          saveCache(products, Date.now());
          return { products, lastFetched: Date.now() };
        });
        const errorMsg = err.response?.data?.error || err.message || 'Failed to create product';
        toast.error(errorMsg);
        return null;
      }
    },

    // ✅ Update product with optimistic update
    updateProduct: async (id: string, data: Partial<Product>) => {
      const state = get();
      const original = state.products.find(p => p.id === id);
      if (!original) {
        toast.error('Product not found');
        return false;
      }

      // Optimistic update
      set(state => {
        const products = state.products.map(p =>
          p.id === id ? { ...p, ...data, in_stock: data.stockCount !== undefined ? data.stockCount > 0 : p.in_stock } : p
        );
        saveCache(products, Date.now());
        return { products, lastFetched: Date.now() };
      });

      try {
        await updateProduct(id, data);
        toast.success(`✅ Product updated`);
        return true;
      } catch (err: any) {
        // Rollback
        set(state => {
          const products = state.products.map(p =>
            p.id === id ? original : p
          );
          saveCache(products, Date.now());
          return { products, lastFetched: Date.now() };
        });
        const errorMsg = err.response?.data?.error || err.message || 'Failed to update product';
        toast.error(errorMsg);
        return false;
      }
    },

    // ✅ Delete product with optimistic update
    deleteProduct: async (id: string) => {
      const state = get();
      const original = state.products.find(p => p.id === id);
      if (!original) {
        toast.error('Product not found');
        return false;
      }

      // Optimistic remove
      set(state => {
        const products = state.products.filter(p => p.id !== id);
        saveCache(products, Date.now());
        return { products, lastFetched: Date.now() };
      });

      try {
        await deleteProduct(id);
        // Force cache expiry so next fetchProducts gets fresh data from backend
        localStorage.removeItem(STORAGE_KEYS.LAST_FETCHED);
        localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
        toast.success(`✅ Product deleted`);
        return true;
      } catch (err: any) {
        // Rollback
        set(state => {
          const products = [...state.products, original];
          saveCache(products, Date.now());
          return { products, lastFetched: Date.now() };
        });
        const errorMsg = err.response?.data?.error || err.message || 'Failed to delete product';
        toast.error(errorMsg);
        return false;
      }
    },

    // ✅ Search products
    searchProducts: async (query: string) => {
      if (!query) {
        get().fetchProducts(true);
        return;
      }

      set({ loading: true, error: null });

      try {
        const data = await searchProducts(query);
        const products = processProducts(Array.isArray(data) ? data : []);
        set({
          products,
          loading: false,
          lastFetched: Date.now(),
          pagination: { page: 1, limit: 50, total: products.length, totalPages: Math.ceil(products.length / 50) },
        });
      } catch (err: any) {
        const errorMsg = err.response?.data?.error || err.message || 'Search failed';
        set({ loading: false, error: errorMsg });
        toast.error(errorMsg);
      }
    },

    // ✅ Bulk delete with optimistic update
    bulkDelete: async (ids: string[]) => {
      if (ids.length === 0) return false;

      const state = get();
      const originals = state.products.filter(p => ids.includes(p.id));

      // Optimistic remove
      set(state => {
        const products = state.products.filter(p => !ids.includes(p.id));
        saveCache(products, Date.now());
        return { products, lastFetched: Date.now(), selectedIds: new Set() };
      });

      try {
        await bulkDeleteProducts(ids);
        toast.success(`✅ ${ids.length} products deleted`);
        return true;
      } catch (err: any) {
        // Rollback
        set(state => {
          const products = [...state.products, ...originals];
          saveCache(products, Date.now());
          return { products, lastFetched: Date.now() };
        });
        const errorMsg = err.response?.data?.error || err.message || 'Bulk delete failed';
        toast.error(errorMsg);
        return false;
      }
    },

    // ✅ Add stock with optimistic update
    addStock: async (productId: string, quantity: number, note?: string) => {
      const state = get();
      const product = state.products.find(p => p.id === productId);
      if (!product) {
        toast.error('Product not found');
        return false;
      }

      const oldStockCount = product.stockCount || 0;
      const newStockCount = oldStockCount + quantity;

      // Optimistic update
      set(state => {
        const products = state.products.map(p =>
          p.id === productId
            ? { ...p, stockCount: newStockCount, in_stock: newStockCount > 0 }
            : p
        );
        saveCache(products, Date.now());
        return { products, lastFetched: Date.now() };
      });

      try {
        await addStock(productId, quantity, note);
        toast.success(`✅ Added ${quantity} to stock`);
        return true;
      } catch (err: any) {
        // Rollback
        set(state => {
          const products = state.products.map(p =>
            p.id === productId
              ? { ...p, stockCount: oldStockCount, in_stock: oldStockCount > 0 }
              : p
          );
          saveCache(products, Date.now());
          return { products, lastFetched: Date.now() };
        });
        const errorMsg = err.response?.data?.error || err.message || 'Failed to add stock';
        toast.error(errorMsg);
        return false;
      }
    },

    // ✅ Fetch low stock products
    fetchLowStock: async (threshold?: number) => {
      try {
        const data = await getLowStockProducts(threshold || get().lowStockThreshold);
        set({ lowStockProducts: processProducts(Array.isArray(data) ? data : []) });
      } catch (err) {
        console.error('Failed to fetch low stock products:', err);
      }
    },

    // ✅ UI state setters
    setSearchQuery: (query: string) => set({ searchQuery: query }),
    setSelectedCategory: (category: string) => set({ selectedCategory: category }),
    setSelectedProduct: (id: string | null) => set({ selectedProductId: id }),
    setPage: (page: number) => {
      set(state => ({
        pagination: { ...state.pagination, page },
      }));
      get().fetchProducts(true);
    },
    toggleBulkMode: () => set(state => ({ isBulkMode: !state.isBulkMode, selectedIds: new Set() })),
    toggleSelection: (id: string) => {
      set(state => {
        const newSet = new Set(state.selectedIds);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
        return { selectedIds: newSet };
      });
    },
    selectAll: () => {
      set(state => ({
        selectedIds: new Set(state.products.map(p => p.id)),
      }));
    },
    clearSelection: () => set({ selectedIds: new Set() }),
    clearError: () => set({ error: null }),

    // ✅ Reset
    reset: () => {
      set({
        products: [],
        loading: false,
        error: null,
        lastFetched: null,
        searchQuery: '',
        selectedCategory: 'all',
        selectedProductId: null,
        pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
        selectedIds: new Set(),
        isBulkMode: false,
        lowStockProducts: [],
      });
      localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
      localStorage.removeItem(STORAGE_KEYS.LAST_FETCHED);
    },

    // ✅ Helpers
    getProductById: (id: string) => get().products.find(p => p.id === id),
    getProductsByCategory: (category: string) => {
      if (!category || category === 'all') return get().products;
      return get().products.filter(p => p.category === category);
    },
    getCategories: () => {
      const categories = new Set<string>();
      get().products.forEach(p => {
        if (p.category) categories.add(p.category);
      });
      return ['all', ...Array.from(categories)];
    },
    getInStockProducts: () => get().products.filter(p => p.in_stock && (p.stockCount || 0) > 0),
    getOutOfStockProducts: () => get().products.filter(p => !p.in_stock || (p.stockCount || 0) <= 0),
  };
});

// ✅ Helper hooks
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
export const usePagination = () => useProductStore((state) => state.pagination);
export const useSelectedIds = () => useProductStore((state) => state.selectedIds);
export const useIsBulkMode = () => useProductStore((state) => state.isBulkMode);
export const useLowStockProducts = () => useProductStore((state) => state.lowStockProducts);

// ✅ Utility functions
export const formatProductName = (product: Product, isUrdu = false): string => {
  if (!product) return '';
  return isUrdu ? (product.nameUrdu || product.name) : (product.name || product.nameUrdu);
};

export const formatProductPrice = (product: Product): string => {
  if (!product) return '0';
  return product.price?.toLocaleString() || '0';
};

export const getProductStockStatus = (product: Product): 'in_stock' | 'out_of_stock' | 'low_stock' => {
  const count = product.stockCount || 0;
  if (count <= 0) return 'out_of_stock';
  if (count <= 5) return 'low_stock';
  return 'in_stock';
};

export const getStockStatusLabel = (product: Product, isUrdu = false): string => {
  const status = getProductStockStatus(product);
  switch (status) {
    case 'in_stock':
      return isUrdu ? 'اسٹاک میں' : 'In Stock';
    case 'low_stock':
      return isUrdu ? 'اسٹاک کم' : 'Low Stock';
    case 'out_of_stock':
      return isUrdu ? 'اسٹاک ختم' : 'Out of Stock';
  }
};

export const getStockStatusColor = (product: Product): string => {
  const status = getProductStockStatus(product);
  switch (status) {
    case 'in_stock': return 'text-green-600 bg-green-100';
    case 'low_stock': return 'text-yellow-600 bg-yellow-100';
    case 'out_of_stock': return 'text-red-600 bg-red-100';
  }
};

export default useProductStore;
