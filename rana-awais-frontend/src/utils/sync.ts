import { offlineDB, OfflineRecord, SyncLog } from '../db/indexeddb';
import api from './api';

// ═══════════════════════════════════════════════════════════════
// ✅ Rana Awais Electronics - Auto Sync Engine v4
// ✅ Push pending records to server when online
// ✅ Pull latest data from server periodically
// ✅ Conflict resolution with server-wins strategy
// ✅ Full sync logging and error tracking
// ═══════════════════════════════════════════════════════════════

const SYNC_INTERVAL = 30 * 1000; // 30 seconds
const FULL_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MAX_RETRY = 5;

type SyncCallback = (status: SyncStatus) => void;

export interface SyncStatus {
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  lastSync: Date | null;
  lastSyncResult: 'success' | 'failed' | null;
  error: string | null;
  progress: {
    current: number;
    total: number;
  };
  isOnline: boolean;
  lastFullSync: Date | null;
}

class SyncEngine {
  private isSyncing = false;
  private syncTimer: NodeJS.Timeout | null = null;
  private fullSyncTimer: NodeJS.Timeout | null = null;
  private listeners: Set<SyncCallback> = new Set();
  private status: SyncStatus = {
    isSyncing: false,
    pendingCount: 0,
    failedCount: 0,
    lastSync: null,
    lastSyncResult: null,
    error: null,
    progress: { current: 0, total: 0 },
    isOnline: navigator.onLine,
    lastFullSync: null,
  };

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('🟢 Online - Starting sync...');
      this.updateStatus({ isOnline: true });
      this.syncNow();
    });

    window.addEventListener('offline', () => {
      console.log('🔴 Offline - Sync paused');
      this.updateStatus({ isOnline: false, isSyncing: false });
    });

    // Listen for service worker messages
    navigator.serviceWorker?.addEventListener('message', (event) => {
      if (event.data?.type === 'SYNC_NOW') {
        this.syncNow();
      }
    });
  }

  // ═══════════════════════════════════════════
  // 📢 STATUS MANAGEMENT
  // ═══════════════════════════════════════════

  private updateStatus(partial: Partial<SyncStatus>) {
    this.status = { ...this.status, ...partial };
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(cb => cb(this.status));
  }

  subscribe(callback: SyncCallback): () => void {
    this.listeners.add(callback);
    callback(this.status);
    return () => this.listeners.delete(callback);
  }

  getStatus(): SyncStatus {
    return { ...this.status };
  }

  // ═══════════════════════════════════════════
  // 🚀 START / STOP
  // ═══════════════════════════════════════════

  start() {
    if (this.syncTimer) return;
    console.log('🔄 Sync engine started');

    // Initial sync
    this.syncNow();

    // Periodic sync
    this.syncTimer = setInterval(() => {
      if (navigator.onLine) {
        this.syncNow();
      }
    }, SYNC_INTERVAL);

    // Full sync (pull all data)
    this.fullSyncTimer = setInterval(() => {
      if (navigator.onLine) {
        this.fullSync();
      }
    }, FULL_SYNC_INTERVAL);
  }

  stop() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    if (this.fullSyncTimer) {
      clearInterval(this.fullSyncTimer);
      this.fullSyncTimer = null;
    }
    console.log('🔄 Sync engine stopped');
  }

  // ═══════════════════════════════════════════
  // 🔄 PUSH SYNC (Send pending records to server)
  // ═══════════════════════════════════════════

  async syncNow(): Promise<boolean> {
    if (this.isSyncing || !navigator.onLine) return false;

    this.isSyncing = true;
    this.updateStatus({ isSyncing: true, error: null });

    const startTime = new Date();
    let recordsProcessed = 0;
    let recordsFailed = 0;

    try {
      const pendingRecords = await offlineDB.getPendingRecords();
      const failedRecords = await offlineDB.getFailedRecords();
      const allRecords = [...pendingRecords, ...failedRecords.filter(r => r.retry_count < MAX_RETRY)];

      if (allRecords.length === 0) {
        this.updateStatus({
          isSyncing: false,
          pendingCount: 0,
          failedCount: 0,
          lastSync: new Date(),
          lastSyncResult: 'success',
          progress: { current: 0, total: 0 },
        });
        this.isSyncing = false;
        return true;
      }

      this.updateStatus({
        progress: { current: 0, total: allRecords.length },
      });

      for (let i = 0; i < allRecords.length; i++) {
        const record = allRecords[i];
        this.updateStatus({
          progress: { current: i + 1, total: allRecords.length },
        });

        try {
          await this.pushRecord(record);
          await offlineDB.markAsSynced(record.id!);
          recordsProcessed++;
        } catch (error: any) {
          await offlineDB.markAsFailed(record.id!, error.message || 'Unknown error');
          recordsFailed++;
        }
      }

      // Clean up synced records
      await offlineDB.clearSynced();

      const pendingCount = await offlineDB.getPendingCount();
      const failedCount = await offlineDB.getFailedCount();

      // Log sync result
      const syncStatus: 'success' | 'partial' | 'failed' = 
        recordsFailed === 0 ? 'success' : 
        recordsProcessed > 0 ? 'partial' : 'failed';

      await offlineDB.addSyncLog({
        sync_type: 'push',
        status: syncStatus,
        records_processed: recordsProcessed,
        records_failed: recordsFailed,
        error_message: recordsFailed > 0 ? `${recordsFailed} records failed` : undefined,
        started_at: startTime,
        completed_at: new Date(),
      });

      this.updateStatus({
        isSyncing: false,
        pendingCount,
        failedCount,
        lastSync: new Date(),
        lastSyncResult: syncStatus === 'success' ? 'success' : 'failed',
        error: recordsFailed > 0 ? `${recordsFailed} records failed to sync` : null,
        progress: { current: 0, total: 0 },
      });

      this.isSyncing = false;
      return recordsFailed === 0;
    } catch (error: any) {
      await offlineDB.addSyncLog({
        sync_type: 'push',
        status: 'failed',
        records_processed: recordsProcessed,
        records_failed: recordsFailed,
        error_message: error.message || 'Sync failed',
        started_at: startTime,
        completed_at: new Date(),
      });

      this.updateStatus({
        isSyncing: false,
        error: error.message || 'Sync failed',
        lastSync: new Date(),
        lastSyncResult: 'failed',
      });
      this.isSyncing = false;
      return false;
    }
  }

  private async pushRecord(record: OfflineRecord): Promise<void> {
    const { entity_type, operation, data, record_id } = record;

    let endpoint = '';
    let method: 'post' | 'put' | 'delete' = 'post';

    switch (entity_type) {
      case 'installment':
        endpoint = '/installments';
        break;
      case 'payment':
        // Payment has multiple endpoints
        if (data?.bulk_payment) {
          endpoint = '/installments/bulk-payment';
        } else if (data?.advance_payment) {
          endpoint = '/installments/advance';
        } else {
          endpoint = '/installments/payment';
        }
        break;
      case 'customer':
        endpoint = '/customers';
        break;
      case 'guarantor':
        endpoint = '/guarantors';
        break;
      case 'product':
        endpoint = '/products';
        break;
      case 'inventory':
        endpoint = '/inventory';
        break;
      case 'promise':
        endpoint = '/promises';
        break;
      case 'receipt':
        endpoint = '/receipts';
        break;
      case 'expense':
        endpoint = '/expenses';
        break;
    }

    switch (operation) {
      case 'create':
        method = 'post';
        break;
      case 'update':
        method = 'put';
        endpoint += `/${record_id}`;
        break;
      case 'delete':
        method = 'delete';
        endpoint += `/${record_id}`;
        break;
    }

    // If custom endpoint is set, use it
    if (record.endpoint) {
      endpoint = record.endpoint;
    }

    // ✅ Add timestamp for conflict detection
    const payload = {
      ...data,
      _synced_at: new Date().toISOString(),
      _device_id: localStorage.getItem('device_id') || 'unknown',
    };

    await api[method](endpoint, payload);
  }


  // ═══════════════════════════════════════════
  // 📥 PULL SYNC (Fetch latest data from server)
  // ═══════════════════════════════════════════

  async fullSync(): Promise<boolean> {
    if (!navigator.onLine) return false;

    const startTime = new Date();

    try {
      console.log('📥 Full sync started...');

      // Pull all data in parallel
      const [customersRes, productsRes, installmentsRes, promisesRes, dashboardRes, guarantorsRes, inventoryRes, expensesRes, paymentsRes, plansRes] = await Promise.allSettled([
        api.get('/customers?limit=500'),
        api.get('/products?limit=500'),
        api.get('/installments?limit=500'),
        api.get('/promises?limit=500'),
        api.get('/dashboard/summary'),
        api.get('/guarantors?limit=500'),
        api.get('/inventory?limit=500'),
        api.get('/expenses?limit=500'),
        api.get('/payments?limit=500'),
        api.get('/installments/plans?limit=500'),
      ]);

      let recordsProcessed = 0;
      let recordsFailed = 0;

      // Update caches
      if (customersRes.status === 'fulfilled') {
        const customers = customersRes.value.data?.data || customersRes.value.data || [];
        if (Array.isArray(customers) && customers.length > 0) {
          await offlineDB.cacheCustomers(customers);
          recordsProcessed += customers.length;
        }
      } else {
        recordsFailed++;
      }

      if (productsRes.status === 'fulfilled') {
        const products = productsRes.value.data?.data || productsRes.value.data || [];
        if (Array.isArray(products) && products.length > 0) {
          await offlineDB.cacheProducts(products);
          recordsProcessed += products.length;
        }
      } else {
        recordsFailed++;
      }

      if (installmentsRes.status === 'fulfilled') {
        const installments = installmentsRes.value.data?.data || installmentsRes.value.data || [];
        if (Array.isArray(installments) && installments.length > 0) {
          await offlineDB.cacheInstallments(installments);
          recordsProcessed += installments.length;
        }
      } else {
        recordsFailed++;
      }

      if (promisesRes.status === 'fulfilled') {
        const promises = promisesRes.value.data?.data || promisesRes.value.data || [];
        if (Array.isArray(promises) && promises.length > 0) {
          await offlineDB.cachePromises(promises);
          recordsProcessed += promises.length;
        }
      } else {
        recordsFailed++;
      }

      if (dashboardRes.status === 'fulfilled') {
        const dashboard = dashboardRes.value.data?.data || dashboardRes.value.data;
        if (dashboard) {
          await offlineDB.cacheDashboardSummary(dashboard);
          recordsProcessed++;
        }
      } else {
        recordsFailed++;
      }

      if (guarantorsRes.status === 'fulfilled') {
        const guarantors = guarantorsRes.value.data?.data || guarantorsRes.value.data || [];
        if (Array.isArray(guarantors) && guarantors.length > 0) {
          await offlineDB.cacheGuarantors(guarantors);
          recordsProcessed += guarantors.length;
        }
      } else {
        recordsFailed++;
      }

      if (inventoryRes.status === 'fulfilled') {
        const inventory = inventoryRes.value.data?.data || inventoryRes.value.data || [];
        if (Array.isArray(inventory) && inventory.length > 0) {
          await offlineDB.cacheInventory(inventory);
          recordsProcessed += inventory.length;
        }
      } else {
        recordsFailed++;
      }

      if (expensesRes.status === 'fulfilled') {
        const expenses = expensesRes.value.data?.data || expensesRes.value.data || [];
        if (Array.isArray(expenses) && expenses.length > 0) {
          await offlineDB.cacheExpenses(expenses);
          recordsProcessed += expenses.length;
        }
      } else {
        recordsFailed++;
      }

      if (paymentsRes.status === 'fulfilled') {
        const payments = paymentsRes.value.data?.data || paymentsRes.value.data || [];
        if (Array.isArray(payments) && payments.length > 0) {
          await offlineDB.cachePayments(payments);
          recordsProcessed += payments.length;
        }
      } else {
        recordsFailed++;
      }

      if (plansRes.status === 'fulfilled') {
        const plans = plansRes.value.data?.data || plansRes.value.data || [];
        if (Array.isArray(plans) && plans.length > 0) {
          await offlineDB.cachePlans(plans);
          recordsProcessed += plans.length;
        }
      } else {
        recordsFailed++;
      }

      // Log sync result
      await offlineDB.addSyncLog({
        sync_type: 'pull',
        status: recordsFailed === 0 ? 'success' : 'partial',
        records_processed: recordsProcessed,
        records_failed: recordsFailed,
        started_at: startTime,
        completed_at: new Date(),
      });

      this.updateStatus({
        lastFullSync: new Date(),
      });

      console.log(`📥 Full sync completed: ${recordsProcessed} records processed, ${recordsFailed} failed`);
      return recordsFailed === 0;
    } catch (error: any) {
      console.error('Full sync failed:', error);
      
      await offlineDB.addSyncLog({
        sync_type: 'pull',
        status: 'failed',
        records_processed: 0,
        records_failed: 1,
        error_message: error.message || 'Full sync failed',
        started_at: startTime,
        completed_at: new Date(),
      });

      return false;
    }
  }

  // ═══════════════════════════════════════════
  // 📝 QUEUE OFFLINE OPERATIONS
  // ═══════════════════════════════════════════

  async queueOperation(
    entity_type: OfflineRecord['entity_type'],
    operation: OfflineRecord['operation'],
    record_id: string,
    data: any,
    endpoint?: string
  ): Promise<void> {
    await offlineDB.addRecord({
      record_id,
      entity_type,
      operation,
      data,
      sync_status: 'pending',
      created_at: new Date(),
      retry_count: 0,
      worker_id: localStorage.getItem('user_id') || undefined,
      device_id: localStorage.getItem('device_id') || undefined,
      endpoint,
    });

    // Update pending count
    const pendingCount = await offlineDB.getPendingCount();
    this.updateStatus({ pendingCount });

    // Try to sync immediately if online
    if (navigator.onLine) {
      setTimeout(() => this.syncNow(), 500);
    }
  }

  // ═══════════════════════════════════════════
  // 🔄 RETRY FAILED
  // ═══════════════════════════════════════════

  async retryFailed(): Promise<void> {
    const records = await offlineDB.retryFailed();
    if (records.length > 0) {
      this.syncNow();
    }
  }

  // ═══════════════════════════════════════════
  // 🧹 CLEAR ALL
  // ═══════════════════════════════════════════

  async clearAll(): Promise<void> {
    await offlineDB.clearAll();
    this.updateStatus({
      pendingCount: 0,
      failedCount: 0,
      progress: { current: 0, total: 0 },
    });
  }

  // ═══════════════════════════════════════════
  // 📊 GET SYNC HISTORY
  // ═══════════════════════════════════════════

  async getSyncHistory(limit = 20): Promise<SyncLog[]> {
    return offlineDB.getRecentSyncLogs(limit);
  }
}

export const syncEngine = new SyncEngine();
export default syncEngine;
