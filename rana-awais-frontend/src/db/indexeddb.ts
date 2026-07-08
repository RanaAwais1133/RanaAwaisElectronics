import Dexie, { Table } from 'dexie';

// ═══════════════════════════════════════════════════════════════
// ✅ Rana Awais Electronics - IndexedDB Schema v6
// ✅ Full offline-first support with sync queue
// ═══════════════════════════════════════════════════════════════

// ✅ Offline Record - For any entity type (sync queue)
export interface OfflineRecord {
  id?: number;
  record_id: string;
  entity_type: 'installment' | 'payment' | 'customer' | 'guarantor' | 'product' | 'inventory' | 'promise' | 'receipt' | 'expense';
  operation: 'create' | 'update' | 'delete';
  data: any;
  sync_status: 'pending' | 'synced' | 'failed';
  created_at: Date;
  retry_count: number;
  error_message?: string;
  worker_id?: string;
  device_id?: string;
  endpoint?: string; // The API endpoint to call
  method?: string;   // The HTTP method to use
}

// ✅ Sync Log - Track sync history
export interface SyncLog {
  id?: number;
  sync_type: 'push' | 'pull' | 'manual';
  status: 'success' | 'partial' | 'failed';
  records_processed: number;
  records_failed: number;
  error_message?: string;
  started_at: Date;
  completed_at: Date;
}

// ✅ Offline Installment - For quick offline access
export interface OfflineInstallment {
  id?: number;
  installment_id: string;
  customer_id: string;
  customer_name: string;
  customer_name_urdu?: string;
  customer_phone: string;
  product_name: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  installment_amount: number;
  total_installments: number;
  paid_installments: number;
  due_date: string;
  status: 'active' | 'completed' | 'defaulted';
  worker_id: string;
  device_id: string;
  sync_status: 'pending' | 'synced' | 'failed';
  created_at: Date;
  updated_at: Date;
  cached_at: Date;
}

// ✅ Offline Customer Cache - For offline viewing
export interface OfflineCustomer {
  id?: string;
  name: string;
  nameUrdu: string;
  phone: string;
  cnic: string;
  address: string;
  addressUrdu: string;
  fatherName?: string;
  fatherNameUrdu?: string;
  totalPlans?: number;
  activePlans?: number;
  totalAmount?: number;
  paidAmount?: number;
  remainingAmount?: number;
  cached_at: Date;
}

// ✅ Offline Product Cache - For offline viewing
export interface OfflineProduct {
  id?: string;
  name: string;
  nameUrdu: string;
  price: number;
  category: string;
  company?: string;
  stock?: number;
  cached_at: Date;
}

// ✅ Offline Guarantor Cache
export interface OfflineGuarantor {
  id?: string;
  customer_id: string;
  name: string;
  nameUrdu: string;
  phone: string;
  cnic: string;
  address: string;
  addressUrdu: string;
  cached_at: Date;
}

// ✅ Offline Dashboard Stats
export interface OfflineDashboardStats {
  id?: number;
  today_collections: number;
  today_due: number;
  overdue_count: number;
  overdue_amount: number;
  pending_promises: number;
  total_active_plans: number;
  total_customers: number;
  cached_at: Date;
}

// ✅ Offline Payment Cache
export interface OfflinePayment {
  id?: number;
  payment_id: string;
  plan_id: string;
  customer_id: string;
  customer_name: string;
  amount: number;
  method: string;
  installment_no: number;
  payment_date: string;
  collected_by?: string;
  cached_at: Date;
}

// ✅ Offline Promise Cache
export interface OfflinePromise {
  id?: number;
  promise_id: string;
  customer_id: string;
  customer_name: string;
  plan_id: string;
  installment_no: number;
  promise_date: string;
  amount: number;
  status: 'pending' | 'kept' | 'broken';
  remarks?: string;
  cached_at: Date;
}

// ✅ Offline Dashboard Summary (full)
export interface OfflineDashboardSummary {
  id?: number;
  data: any; // Full dashboard summary JSON
  cached_at: Date;
}

// ✅ Offline Inventory Cache
export interface OfflineInventory {
  id?: string;
  product_name: string;
  product_urdu?: string;
  serialNumber?: string;
  serial_number?: string;
  model?: string;
  company?: string;
  color?: string;
  status: string;
  purchaseDate?: string;
  purchase_date?: string;
  cached_at: Date;
}

// ✅ Offline Report Cache
export interface OfflineReport {
  id?: number;
  report_type: string;
  report_data: any;
  cached_at: Date;
}

// ✅ Offline Plan Cache (full installment plans with installments array)
export interface OfflinePlan {
  id?: string;
  customerId: string;
  customerName?: string;
  productId?: string;
  totalAmount: number;
  downPayment: number;
  remainingAmount: number;
  numInstallments: number;
  installmentAmount: number;
  status: string;
  installments: any[];
  payments?: any[];
  createdBy?: string;
  createdAt?: string;
  cached_at: Date;
}

// ✅ Offline Expense Cache
export interface OfflineExpense {
  id?: string;
  description: string;
  descriptionUrdu?: string;
  amount: number;
  category: string;
  date: string;
  paid_by?: string;
  notes?: string;
  cached_at: Date;
}

class RanaAwaisDB extends Dexie {
  records!: Table<OfflineRecord, number>;
  syncLogs!: Table<SyncLog, number>;
  installments!: Table<OfflineInstallment, number>;
  customers!: Table<OfflineCustomer, string>;
  products!: Table<OfflineProduct, string>;
  guarantors!: Table<OfflineGuarantor, string>;
  dashboard!: Table<OfflineDashboardStats, number>;
  payments!: Table<OfflinePayment, number>;
  promises!: Table<OfflinePromise, number>;
  dashboardSummary!: Table<OfflineDashboardSummary, number>;
  inventory!: Table<OfflineInventory, string>;
  reports!: Table<OfflineReport, number>;
  plans!: Table<OfflinePlan, string>;
  expenses!: Table<OfflineExpense, string>;

  constructor() {
    super('RanaAwaisElectronicsDB');
    
    this.version(6).stores({
      records: '++id, record_id, entity_type, sync_status, created_at, worker_id, endpoint',
      syncLogs: '++id, sync_type, status, started_at',
      installments: '++id, installment_id, customer_id, status, sync_status, due_date, worker_id, cached_at',
      customers: 'id, name, phone, cached_at',
      products: 'id, name, category, cached_at',
      guarantors: 'id, customer_id, phone, cached_at',
      dashboard: '++id, cached_at',
      payments: '++id, payment_id, plan_id, customer_id, cached_at',
      promises: '++id, promise_id, customer_id, plan_id, status, cached_at',
      dashboardSummary: '++id, cached_at',
      inventory: 'id, product_name, status, cached_at',
      reports: '++id, report_type, cached_at',
      plans: 'id, customerId, status, cached_at',
      expenses: 'id, category, date, cached_at',
    });
  }

  // ═══════════════════════════════════════════
  // 📝 RECORDS (Offline Queue)
  // ═══════════════════════════════════════════

  async getPendingCount(): Promise<number> {
    return this.records.where('sync_status').equals('pending').count();
  }

  async getFailedCount(): Promise<number> {
    return this.records.where('sync_status').equals('failed').count();
  }

  async getPendingRecords(): Promise<OfflineRecord[]> {
    return this.records.where('sync_status').equals('pending').toArray();
  }

  async addRecord(record: Omit<OfflineRecord, 'id'>): Promise<number> {
    return this.records.add(record);
  }

  async markAsSynced(recordId: number): Promise<void> {
    await this.records.update(recordId, { sync_status: 'synced' });
  }

  async markAsFailed(recordId: number, error: string): Promise<void> {
    const record = await this.records.get(recordId);
    await this.records.update(recordId, {
      sync_status: 'failed',
      error_message: error,
      retry_count: (record?.retry_count || 0) + 1,
    });
  }

  async clearSynced(): Promise<void> {
    await this.records.where('sync_status').equals('synced').delete();
  }

  async getFailedRecords(): Promise<OfflineRecord[]> {
    return this.records.where('sync_status').equals('failed').toArray();
  }

  async retryFailed(): Promise<OfflineRecord[]> {
    const failed = await this.getFailedRecords();
    for (const record of failed) {
      if (record.retry_count < 5) {
        await this.records.update(record.id!, { sync_status: 'pending' });
      }
    }
    return this.getPendingRecords();
  }

  // ═══════════════════════════════════════════
  // 📋 SYNC LOGS
  // ═══════════════════════════════════════════

  async addSyncLog(log: Omit<SyncLog, 'id'>): Promise<number> {
    return this.syncLogs.add(log);
  }

  async getLastSyncTime(): Promise<Date | null> {
    const logs = await this.syncLogs
      .where('status')
      .equals('success')
      .reverse()
      .limit(1)
      .toArray();
    return logs.length > 0 ? logs[0].completed_at : null;
  }

  async getRecentSyncLogs(limit = 10): Promise<SyncLog[]> {
    return this.syncLogs
      .orderBy('started_at')
      .reverse()
      .limit(limit)
      .toArray();
  }

  // ═══════════════════════════════════════════
  // 👥 CUSTOMERS (Offline Cache)
  // ═══════════════════════════════════════════

  async cacheCustomers(customers: OfflineCustomer[]): Promise<void> {
    await this.customers.clear();
    await this.customers.bulkAdd(customers.map(c => ({ ...c, cached_at: new Date() })));
  }

  async getCachedCustomers(): Promise<OfflineCustomer[]> {
    return this.customers.toArray();
  }

  async getCachedCustomer(id: string): Promise<OfflineCustomer | undefined> {
    return this.customers.get(id);
  }

  async searchCachedCustomers(query: string): Promise<OfflineCustomer[]> {
    const q = query.toLowerCase();
    const all = await this.customers.toArray();
    return all.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.nameUrdu?.includes(q) ||
      c.phone?.includes(q) ||
      c.cnic?.includes(q)
    );
  }

  async addCachedCustomer(customer: OfflineCustomer): Promise<void> {
    await this.customers.put({ ...customer, cached_at: new Date() });
  }

  async updateCachedCustomer(id: string, data: Partial<OfflineCustomer>): Promise<void> {
    const existing = await this.customers.get(id);
    if (existing) {
      await this.customers.update(id, { ...data, cached_at: new Date() });
    } else {
      // If not exists, add it
      await this.customers.put({ ...data, id, cached_at: new Date() } as OfflineCustomer);
    }
  }

  async deleteCachedCustomer(id: string): Promise<void> {
    await this.customers.delete(id);
  }

  // ═══════════════════════════════════════════
  // 📦 PRODUCTS (Offline Cache)
  // ═══════════════════════════════════════════

  async cacheProducts(products: OfflineProduct[]): Promise<void> {
    await this.products.clear();
    await this.products.bulkAdd(products.map(p => ({ ...p, cached_at: new Date() })));
  }

  async getCachedProducts(): Promise<OfflineProduct[]> {
    return this.products.toArray();
  }

  async getCachedProduct(id: string): Promise<OfflineProduct | undefined> {
    return this.products.get(id);
  }

  async searchCachedProducts(query: string): Promise<OfflineProduct[]> {
    const q = query.toLowerCase();
    const all = await this.products.toArray();
    return all.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.nameUrdu?.includes(q) ||
      p.category?.toLowerCase().includes(q) ||
      p.company?.toLowerCase().includes(q)
    );
  }

  // ═══════════════════════════════════════════
  // 📊 INSTALLMENTS (Offline Cache)
  // ═══════════════════════════════════════════

  async cacheInstallments(installments: OfflineInstallment[]): Promise<void> {
    await this.installments.clear();
    await this.installments.bulkAdd(installments.map(i => ({ ...i, cached_at: new Date() })));
  }

  async getCachedInstallments(): Promise<OfflineInstallment[]> {
    return this.installments.toArray();
  }

  async getCachedInstallment(id: string): Promise<OfflineInstallment | undefined> {
    return this.installments.where('installment_id').equals(id).first();
  }

  async getCachedInstallmentsByCustomer(customerId: string): Promise<OfflineInstallment[]> {
    return this.installments.where('customer_id').equals(customerId).toArray();
  }

  // ═══════════════════════════════════════════
  // 💰 PAYMENTS (Offline Cache)
  // ═══════════════════════════════════════════

  async cachePayments(payments: OfflinePayment[]): Promise<void> {
    await this.payments.clear();
    await this.payments.bulkAdd(payments.map(p => ({ ...p, cached_at: new Date() })));
  }

  async getCachedPayments(): Promise<OfflinePayment[]> {
    return this.payments.toArray();
  }

  async getCachedPaymentsByPlan(planId: string): Promise<OfflinePayment[]> {
    return this.payments.where('plan_id').equals(planId).toArray();
  }

  // ═══════════════════════════════════════════
  // 🤝 PROMISES (Offline Cache)
  // ═══════════════════════════════════════════

  async cachePromises(promises: OfflinePromise[]): Promise<void> {
    await this.promises.clear();
    await this.promises.bulkAdd(promises.map(p => ({ ...p, cached_at: new Date() })));
  }

  async getCachedPromises(): Promise<OfflinePromise[]> {
    return this.promises.toArray();
  }

  async getCachedPromisesByCustomer(customerId: string): Promise<OfflinePromise[]> {
    return this.promises.where('customer_id').equals(customerId).toArray();
  }

  // ═══════════════════════════════════════════
  // 📊 DASHBOARD SUMMARY (Offline Cache)
  // ═══════════════════════════════════════════

  async cacheDashboardSummary(data: any): Promise<void> {
    await this.dashboardSummary.clear();
    await this.dashboardSummary.add({ data, cached_at: new Date() });
  }

  async getCachedDashboardSummary(): Promise<any | null> {
    const cached = await this.dashboardSummary.toArray();
    if (cached.length > 0) {
      return cached[0].data;
    }
    return null;
  }

  // ═══════════════════════════════════════════
  // 📊 STATS
  // ═══════════════════════════════════════════

  async getStats(): Promise<{
    pending: number;
    failed: number;
    customers: number;
    products: number;
    installments: number;
    payments: number;
    promises: number;
  }> {
    const [pending, failed, customers, products, installments, payments, promises] = await Promise.all([
      this.getPendingCount(),
      this.getFailedCount(),
      this.customers.count(),
      this.products.count(),
      this.installments.count(),
      this.payments.count(),
      this.promises.count(),
    ]);
    return { pending, failed, customers, products, installments, payments, promises };
  }

  // ═══════════════════════════════════════════
  // 🧹 CLEAR ALL
  // ═══════════════════════════════════════════

  async clearAll(): Promise<void> {
    await Promise.all([
      this.records.clear(),
      this.installments.clear(),
      this.customers.clear(),
      this.products.clear(),
      this.payments.clear(),
      this.promises.clear(),
      this.dashboardSummary.clear(),
      this.syncLogs.clear(),
      this.expenses.clear(),
    ]);
  }

  // ═══════════════════════════════════════════
  // 🔄 BULK CACHE UPDATE HELPERS
  // ═══════════════════════════════════════════

  async updateCustomerCache(id: string, data: Partial<OfflineCustomer>): Promise<void> {
    const existing = await this.customers.get(id);
    if (existing) {
      await this.customers.update(id, { ...data, cached_at: new Date() });
    }
  }

  async updateInstallmentCache(installmentId: string, data: Partial<OfflineInstallment>): Promise<void> {
    const existing = await this.installments.where('installment_id').equals(installmentId).first();
    if (existing && existing.id) {
      await this.installments.update(existing.id, { ...data, cached_at: new Date() });
    }
  }

  // ═══════════════════════════════════════════
  // 📦 INVENTORY (Offline Cache)
  // ═══════════════════════════════════════════

  async cacheInventory(items: OfflineInventory[]): Promise<void> {
    await this.inventory.clear();
    await this.inventory.bulkAdd(items.map(i => ({ ...i, cached_at: new Date() })));
  }

  async getCachedInventory(): Promise<OfflineInventory[]> {
    return this.inventory.toArray();
  }

  async getCachedInventoryItem(id: string): Promise<OfflineInventory | undefined> {
    return this.inventory.get(id);
  }

  async searchCachedInventory(query: string): Promise<OfflineInventory[]> {
    const q = query.toLowerCase();
    const all = await this.inventory.toArray();
    return all.filter(i =>
      i.product_name?.toLowerCase().includes(q) ||
      i.product_urdu?.includes(q) ||
      i.serialNumber?.toLowerCase().includes(q) ||
      i.serial_number?.toLowerCase().includes(q) ||
      i.model?.toLowerCase().includes(q) ||
      i.company?.toLowerCase().includes(q)
    );
  }

  // ═══════════════════════════════════════════
  // 📊 REPORTS (Offline Cache)
  // ═══════════════════════════════════════════

  async cacheReport(reportType: string, data: any): Promise<void> {
    await this.reports.where('report_type').equals(reportType).delete();
    await this.reports.add({ report_type: reportType, report_data: data, cached_at: new Date() });
  }

  async getCachedReport(reportType: string): Promise<any | null> {
    const cached = await this.reports.where('report_type').equals(reportType).toArray();
    if (cached.length > 0) {
      return cached[0].report_data;
    }
    return null;
  }

  // ═══════════════════════════════════════════
  // 📋 PLANS (Full Offline Cache)
  // ═══════════════════════════════════════════

  async cachePlans(plans: OfflinePlan[]): Promise<void> {
    await this.plans.clear();
    await this.plans.bulkAdd(plans.map(p => ({ ...p, cached_at: new Date() })));
  }

  async getCachedPlans(): Promise<OfflinePlan[]> {
    return this.plans.toArray();
  }

  async getCachedPlan(id: string): Promise<OfflinePlan | undefined> {
    return this.plans.get(id);
  }

  async getCachedPlansByCustomer(customerId: string): Promise<OfflinePlan[]> {
    return this.plans.where('customerId').equals(customerId).toArray();
  }

  async addCachedPlan(plan: OfflinePlan): Promise<void> {
    await this.plans.add({ ...plan, cached_at: new Date() });
  }

  async updateCachedPlan(id: string, data: Partial<OfflinePlan>): Promise<void> {
    const existing = await this.plans.get(id);
    if (existing) {
      await this.plans.update(id, { ...data, cached_at: new Date() });
    }
  }

  // ═══════════════════════════════════════════
  // 🤝 GUARANTORS (Offline Cache)
  // ═══════════════════════════════════════════

  async cacheGuarantors(guarantors: OfflineGuarantor[]): Promise<void> {
    await this.guarantors.clear();
    await this.guarantors.bulkAdd(guarantors.map(g => ({ ...g, cached_at: new Date() })));
  }

  async getCachedGuarantors(): Promise<OfflineGuarantor[]> {
    return this.guarantors.toArray();
  }

  async getCachedGuarantor(id: string): Promise<OfflineGuarantor | undefined> {
    return this.guarantors.get(id);
  }

  async getCachedGuarantorsByCustomer(customerId: string): Promise<OfflineGuarantor[]> {
    return this.guarantors.where('customer_id').equals(customerId).toArray();
  }

  async searchCachedGuarantors(query: string): Promise<OfflineGuarantor[]> {
    const q = query.toLowerCase();
    const all = await this.guarantors.toArray();
    return all.filter(g =>
      g.name?.toLowerCase().includes(q) ||
      g.nameUrdu?.includes(q) ||
      g.phone?.includes(q) ||
      g.cnic?.includes(q)
    );
  }

  // ═══════════════════════════════════════════
  // 💸 EXPENSES (Offline Cache)
  // ═══════════════════════════════════════════

  async cacheExpenses(expenses: OfflineExpense[]): Promise<void> {
    await this.expenses.clear();
    await this.expenses.bulkAdd(expenses.map(e => ({ ...e, cached_at: new Date() })));
  }

  async getCachedExpenses(): Promise<OfflineExpense[]> {
    return this.expenses.toArray();
  }

  async getCachedExpense(id: string): Promise<OfflineExpense | undefined> {
    return this.expenses.get(id);
  }

  async getCachedExpensesByCategory(category: string): Promise<OfflineExpense[]> {
    return this.expenses.where('category').equals(category).toArray();
  }

  async getCachedExpensesByDateRange(start: string, end: string): Promise<OfflineExpense[]> {
    const all = await this.expenses.toArray();
    return all.filter(e => e.date >= start && e.date <= end);
  }
}

export const offlineDB = new RanaAwaisDB();
