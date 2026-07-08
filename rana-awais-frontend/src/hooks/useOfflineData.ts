import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';
import { offlineDB } from '../db/indexeddb';

// ✅ Cache TTL in milliseconds
const CACHE_TTL = {
  DASHBOARD: 5 * 60 * 1000, // 5 minutes
  CUSTOMERS: 10 * 60 * 1000, // 10 minutes
  PRODUCTS: 10 * 60 * 1000,
  INSTALLMENTS: 5 * 60 * 1000,
  PAYMENTS: 5 * 60 * 1000,
  PROMISES: 5 * 60 * 1000,
};

interface OfflineDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  isOffline: boolean;
  isStale: boolean; // Data is from cache but might be stale
  lastUpdated: Date | null;
}

interface OfflineDataOptions {
  cacheKey?: string;
  cacheTTL?: number;
  skipCache?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

type CacheUpdater<T> = (data: T) => Promise<void>;
type CacheReader<T> = () => Promise<T | null>;

/**
 * ✅ useOfflineData - Offline-First Data Fetching Hook
 * 
 * Strategy:
 * 1. Show cached data immediately (if available)
 * 2. Fetch fresh data from API in background
 * 3. Update cache with fresh data
 * 4. If offline, keep showing cached data
 * 
 * @param apiEndpoint - The API endpoint to fetch from
 * @param cacheReader - Function to read from IndexedDB cache
 * @param cacheUpdater - Function to update IndexedDB cache
 * @param options - Additional options
 */
export function useOfflineData<T = any>(
  apiEndpoint: string | null,
  cacheReader: CacheReader<T>,
  cacheUpdater: CacheUpdater<T>,
  options: OfflineDataOptions = {}
) {
  const [state, setState] = useState<OfflineDataState<T>>({
    data: null,
    loading: true,
    error: null,
    isOffline: false,
    isStale: false,
    lastUpdated: null,
  });

  const isMounted = useRef(true);
  const fetchIdRef = useRef(0);

  const fetchData = useCallback(async (skipCache = false) => {
    if (!apiEndpoint) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    const fetchId = ++fetchIdRef.current;

    // Step 1: Try to load from cache first (instant)
    if (!skipCache) {
      try {
        const cachedData = await cacheReader();
        if (cachedData && isMounted.current && fetchId === fetchIdRef.current) {
          setState({
            data: cachedData,
            loading: true, // Still loading fresh data
            error: null,
            isOffline: false,
            isStale: true,
            lastUpdated: new Date(),
          });
        }
      } catch (e) {
        // Cache read failed, continue to network
      }
    }

    // Step 2: Try network
    try {
      const response = await api.get(apiEndpoint);
      const freshData = response.data?.data || response.data;

      if (isMounted.current && fetchId === fetchIdRef.current) {
        setState({
          data: freshData,
          loading: false,
          error: null,
          isOffline: false,
          isStale: false,
          lastUpdated: new Date(),
        });

        // Update cache in background
        try {
          await cacheUpdater(freshData);
        } catch (e) {
          // Cache update failed, silently continue
        }

        // Call onSuccess callback
        if (options.onSuccess) {
          options.onSuccess(freshData);
        }
      }
    } catch (err: any) {
      // Network failed - check if we have cached data
      const isOffline = !navigator.onLine || 
        err.message?.includes('Network Error') || 
        err.code === 'ERR_NETWORK';

      if (isMounted.current && fetchId === fetchIdRef.current) {
        // If we already have data from cache, keep it
        setState(prev => {
          if (prev.data) {
            return {
              ...prev,
              loading: false,
              isOffline: true,
              isStale: true,
              error: isOffline ? null : (err.response?.data?.error || err.message),
            };
          }
          return {
            data: null,
            loading: false,
            error: isOffline ? 'You are offline' : (err.response?.data?.error || err.message),
            isOffline,
            isStale: false,
            lastUpdated: null,
          };
        });

        if (options.onError) {
          options.onError(isOffline ? 'Offline' : err.message);
        }
      }
    }
  }, [apiEndpoint, cacheReader, cacheUpdater, options.onSuccess, options.onError]);

  // Initial fetch
  useEffect(() => {
    isMounted.current = true;
    fetchData(options.skipCache);
    return () => {
      isMounted.current = false;
    };
  }, [apiEndpoint]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      // When coming back online, refresh data
      fetchData(false);
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [fetchData]);

  const refresh = useCallback(() => {
    fetchData(true); // Skip cache, force network
  }, [fetchData]);

  return {
    ...state,
    refresh,
    // Helper to check if we should show loading skeleton
    isLoading: state.loading && !state.data,
    // Helper to check if we have data to display
    hasData: !!state.data,
  };
}

/**
 * ✅ useOfflineCustomers - Offline-First Customers Hook
 */
export function useOfflineCustomers(searchQuery?: string) {
  const endpoint = searchQuery 
    ? `/customers/search?q=${encodeURIComponent(searchQuery)}&limit=50`
    : '/customers?limit=200';

  const cacheReader = useCallback(async () => {
    if (searchQuery) {
      return offlineDB.searchCachedCustomers(searchQuery);
    }
    return offlineDB.getCachedCustomers();
  }, [searchQuery]);

  const cacheUpdater = useCallback(async (data: any) => {
    const customers = Array.isArray(data) ? data : (data?.data || []);
    if (customers.length > 0) {
      await offlineDB.cacheCustomers(customers);
    }
  }, []);

  return useOfflineData(endpoint, cacheReader, cacheUpdater, {
    cacheTTL: CACHE_TTL.CUSTOMERS,
  });
}

/**
 * ✅ useOfflineProducts - Offline-First Products Hook
 */
export function useOfflineProducts() {
  const cacheReader = useCallback(async () => {
    return offlineDB.getCachedProducts();
  }, []);

  const cacheUpdater = useCallback(async (data: any) => {
    const products = Array.isArray(data) ? data : (data?.data || []);
    if (products.length > 0) {
      await offlineDB.cacheProducts(products);
    }
  }, []);

  return useOfflineData('/products?limit=200', cacheReader, cacheUpdater, {
    cacheTTL: CACHE_TTL.PRODUCTS,
  });
}

/**
 * ✅ useOfflineInstallments - Offline-First Installments Hook
 */
export function useOfflineInstallments() {
  const cacheReader = useCallback(async () => {
    return offlineDB.getCachedInstallments();
  }, []);

  const cacheUpdater = useCallback(async (data: any) => {
    const installments = Array.isArray(data) ? data : (data?.data || []);
    if (installments.length > 0) {
      await offlineDB.cacheInstallments(installments);
    }
  }, []);

  return useOfflineData('/installments?limit=200', cacheReader, cacheUpdater, {
    cacheTTL: CACHE_TTL.INSTALLMENTS,
  });
}

/**
 * ✅ useOfflineDashboard - Offline-First Dashboard Hook
 */
export function useOfflineDashboard() {
  const cacheReader = useCallback(async () => {
    return offlineDB.getCachedDashboardSummary();
  }, []);

  const cacheUpdater = useCallback(async (data: any) => {
    await offlineDB.cacheDashboardSummary(data);
  }, []);

  return useOfflineData('/dashboard/summary', cacheReader, cacheUpdater, {
    cacheTTL: CACHE_TTL.DASHBOARD,
  });
}

/**
 * ✅ useOfflinePayments - Offline-First Payments Hook
 */
export function useOfflinePayments(planId?: string) {
  const endpoint = planId ? `/payments/plan/${planId}` : null;

  const cacheReader = useCallback(async () => {
    if (planId) {
      return offlineDB.getCachedPaymentsByPlan(planId);
    }
    return offlineDB.getCachedPayments();
  }, [planId]);

  const cacheUpdater = useCallback(async (data: any) => {
    const payments = Array.isArray(data) ? data : (data?.data || []);
    if (payments.length > 0) {
      await offlineDB.cachePayments(payments);
    }
  }, []);

  return useOfflineData(endpoint, cacheReader, cacheUpdater, {
    cacheTTL: CACHE_TTL.PAYMENTS,
  });
}

/**
 * ✅ useOfflinePromises - Offline-First Promises Hook
 */
export function useOfflinePromises() {
  const cacheReader = useCallback(async () => {
    return offlineDB.getCachedPromises();
  }, []);

  const cacheUpdater = useCallback(async (data: any) => {
    const promises = Array.isArray(data) ? data : (data?.data || []);
    if (promises.length > 0) {
      await offlineDB.cachePromises(promises);
    }
  }, []);

  return useOfflineData('/promises/pending', cacheReader, cacheUpdater, {
    cacheTTL: CACHE_TTL.PROMISES,
  });
}

export default useOfflineData;
