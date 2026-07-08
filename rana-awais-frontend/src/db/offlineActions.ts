// ═══════════════════════════════════════════════════════════════
// ✅ Rana Awais Electronics - Offline Actions v1
// ✅ Centralized offline CRUD operations
// ✅ Updates IndexedDB cache + sync queue simultaneously
// ✅ Ensures UI consistency when offline
// ═══════════════════════════════════════════════════════════════

import { offlineDB, OfflineCustomer, OfflineProduct, OfflineGuarantor, OfflinePayment, OfflinePlan, OfflineInventory, OfflineExpense } from './indexeddb';
import { syncEngine } from '../utils/sync';

// ═══════════════════════════════════════════════════════════════
// 👥 CUSTOMER ACTIONS
// ═══════════════════════════════════════════════════════════════

export async function offlineCreateCustomer(customer: any): Promise<void> {
  // 1. Update IndexedDB cache immediately
  await offlineDB.addCachedCustomer({
    id: customer.id,
    name: customer.name || '',
    nameUrdu: customer.nameUrdu || '',
    phone: customer.phone || '',
    cnic: customer.cnic || '',
    address: customer.address || '',
    addressUrdu: customer.addressUrdu || '',
    fatherName: customer.fatherName || customer.father_name || '',
    fatherNameUrdu: customer.fatherNameUrdu || customer.father_name_urdu || '',
    cached_at: new Date(),
  });

  // 2. Queue for sync
  await syncEngine.queueOperation('customer', 'create', customer.id, customer);
}

export async function offlineUpdateCustomer(id: string, data: any): Promise<void> {
  // 1. Update IndexedDB cache immediately
  await offlineDB.updateCachedCustomer(id, {
    name: data.name,
    nameUrdu: data.nameUrdu,
    phone: data.phone,
    cnic: data.cnic,
    address: data.address,
    addressUrdu: data.addressUrdu,
    fatherName: data.fatherName || data.father_name,
    fatherNameUrdu: data.fatherNameUrdu || data.father_name_urdu,
  });

  // 2. Queue for sync
  await syncEngine.queueOperation('customer', 'update', id, data);
}

export async function offlineDeleteCustomer(id: string): Promise<void> {
  // 1. Delete from IndexedDB cache immediately
  await offlineDB.deleteCachedCustomer(id);

  // 2. Queue for sync
  await syncEngine.queueOperation('customer', 'delete', id, { id });
}

// ═══════════════════════════════════════════════════════════════
// 📦 PRODUCT ACTIONS
// ═══════════════════════════════════════════════════════════════

export async function offlineCreateProduct(product: any): Promise<void> {
  await offlineDB.products.put({
    id: product.id,
    name: product.name || '',
    nameUrdu: product.nameUrdu || '',
    price: product.price || 0,
    category: product.category || '',
    company: product.company || '',
    stock: product.stock || 0,
    cached_at: new Date(),
  });

  await syncEngine.queueOperation('product', 'create', product.id, product);
}

export async function offlineUpdateProduct(id: string, data: any): Promise<void> {
  const existing = await offlineDB.products.get(id);
  if (existing) {
    await offlineDB.products.update(id, {
      name: data.name,
      nameUrdu: data.nameUrdu,
      price: data.price,
      category: data.category,
      company: data.company,
      stock: data.stock,
      cached_at: new Date(),
    });
  }

  await syncEngine.queueOperation('product', 'update', id, data);
}

export async function offlineDeleteProduct(id: string): Promise<void> {
  await offlineDB.products.delete(id);
  await syncEngine.queueOperation('product', 'delete', id, { id });
}

// ═══════════════════════════════════════════════════════════════
// 🤝 GUARANTOR ACTIONS
// ═══════════════════════════════════════════════════════════════

export async function offlineCreateGuarantor(guarantor: any): Promise<void> {
  await offlineDB.guarantors.put({
    id: guarantor.id,
    customer_id: guarantor.customer_id || guarantor.customerId || '',
    name: guarantor.name || '',
    nameUrdu: guarantor.nameUrdu || '',
    phone: guarantor.phone || '',
    cnic: guarantor.cnic || '',
    address: guarantor.address || '',
    addressUrdu: guarantor.addressUrdu || '',
    cached_at: new Date(),
  });

  await syncEngine.queueOperation('guarantor', 'create', guarantor.id, guarantor);
}

export async function offlineUpdateGuarantor(id: string, data: any): Promise<void> {
  const existing = await offlineDB.guarantors.get(id);
  if (existing) {
    await offlineDB.guarantors.update(id, {
      name: data.name,
      nameUrdu: data.nameUrdu,
      phone: data.phone,
      cnic: data.cnic,
      address: data.address,
      addressUrdu: data.addressUrdu,
      cached_at: new Date(),
    });
  }

  await syncEngine.queueOperation('guarantor', 'update', id, data);
}

export async function offlineDeleteGuarantor(id: string): Promise<void> {
  await offlineDB.guarantors.delete(id);
  await syncEngine.queueOperation('guarantor', 'delete', id, { id });
}

// ═══════════════════════════════════════════════════════════════
// 💰 PAYMENT ACTIONS
// ═══════════════════════════════════════════════════════════════

export async function offlineCreatePayment(payment: any): Promise<void> {
  await offlineDB.payments.add({
    payment_id: payment.id || payment.payment_id || '',
    plan_id: payment.plan_id || payment.planId || '',
    customer_id: payment.customer_id || payment.customerId || '',
    customer_name: payment.customer_name || payment.customerName || '',
    amount: payment.amount || 0,
    method: payment.method || 'cash',
    installment_no: payment.installment_no || payment.installmentNo || 0,
    payment_date: payment.payment_date || payment.paymentDate || payment.transactionDate || new Date().toISOString().split('T')[0],
    collected_by: payment.collected_by || payment.collectedBy || '',
    cached_at: new Date(),
  });

  // Determine entity type based on payment type
  const entityType = payment.bulk_payment ? 'installment' : 'payment';
  await syncEngine.queueOperation(entityType as any, 'create', payment.id || 'new', payment);
}

// ═══════════════════════════════════════════════════════════════
// 📋 INSTALLMENT PLAN ACTIONS
// ═══════════════════════════════════════════════════════════════

export async function offlineCreatePlan(plan: any): Promise<void> {
  await offlineDB.plans.add({
    id: plan.id,
    customerId: plan.customerId || plan.customer_id || '',
    customerName: plan.customerName || '',
    productId: plan.productId || plan.product_id || '',
    totalAmount: plan.totalAmount || plan.total_amount || 0,
    downPayment: plan.downPayment || plan.down_payment || 0,
    remainingAmount: plan.remainingAmount || plan.remaining_amount || 0,
    numInstallments: plan.numInstallments || plan.num_installments || 0,
    installmentAmount: plan.installmentAmount || plan.installment_amount || 0,
    status: plan.status || 'active',
    installments: plan.installments || plan.schedule || [],
    payments: [],
    createdBy: plan.createdBy || plan.created_by || '',
    createdAt: plan.createdAt || plan.created_at || new Date().toISOString(),
    cached_at: new Date(),
  });

  await syncEngine.queueOperation('installment', 'create', plan.id, plan);
}

export async function offlineUpdatePlan(id: string, data: any): Promise<void> {
  const existing = await offlineDB.plans.get(id);
  if (existing) {
    await offlineDB.plans.update(id, {
      ...data,
      cached_at: new Date(),
    });
  }

  await syncEngine.queueOperation('installment', 'update', id, data);
}

export async function offlineDeletePlan(id: string): Promise<void> {
  await offlineDB.plans.delete(id);
  await syncEngine.queueOperation('installment', 'delete', id, { id });
}

// ═══════════════════════════════════════════════════════════════
// 📦 INVENTORY ACTIONS
// ═══════════════════════════════════════════════════════════════

export async function offlineCreateInventoryItem(item: any): Promise<void> {
  await offlineDB.inventory.put({
    id: item.id,
    product_name: item.product_name || item.productName || item.name || '',
    product_urdu: item.product_urdu || item.productUrdu || item.nameUrdu || '',
    serialNumber: item.serialNumber || item.serial_number || '',
    serial_number: item.serial_number || item.serialNumber || '',
    model: item.model || '',
    company: item.company || '',
    color: item.color || '',
    status: item.status || 'available',
    purchaseDate: item.purchaseDate || item.purchase_date || '',
    purchase_date: item.purchase_date || item.purchaseDate || '',
    cached_at: new Date(),
  });

  await syncEngine.queueOperation('inventory', 'create', item.id, item);
}

export async function offlineUpdateInventoryItem(id: string, data: any): Promise<void> {
  const existing = await offlineDB.inventory.get(id);
  if (existing) {
    await offlineDB.inventory.update(id, {
      ...data,
      cached_at: new Date(),
    });
  }

  await syncEngine.queueOperation('inventory', 'update', id, data);
}

export async function offlineDeleteInventoryItem(id: string): Promise<void> {
  await offlineDB.inventory.delete(id);
  await syncEngine.queueOperation('inventory', 'delete', id, { id });
}

// ═══════════════════════════════════════════════════════════════
// 💸 EXPENSE ACTIONS
// ═══════════════════════════════════════════════════════════════

export async function offlineCreateExpense(expense: any): Promise<void> {
  await offlineDB.expenses.put({
    id: expense.id,
    description: expense.description || '',
    descriptionUrdu: expense.descriptionUrdu || '',
    amount: expense.amount || 0,
    category: expense.category || 'general',
    date: expense.date || expense.expense_date || new Date().toISOString().split('T')[0],
    paid_by: expense.paid_by || expense.paidBy || '',
    notes: expense.notes || '',
    cached_at: new Date(),
  });

  await syncEngine.queueOperation('expense', 'create', expense.id, expense);
}

export async function offlineUpdateExpense(id: string, data: any): Promise<void> {
  const existing = await offlineDB.expenses.get(id);
  if (existing) {
    await offlineDB.expenses.update(id, {
      ...data,
      cached_at: new Date(),
    });
  }

  await syncEngine.queueOperation('expense', 'update', id, data);
}

export async function offlineDeleteExpense(id: string): Promise<void> {
  await offlineDB.expenses.delete(id);
  await syncEngine.queueOperation('expense', 'delete', id, { id });
}

// ═══════════════════════════════════════════════════════════════
// 🤝 PROMISE ACTIONS
// ═══════════════════════════════════════════════════════════════

export async function offlineCreatePromise(promise: any): Promise<void> {
  await offlineDB.promises.add({
    promise_id: promise.id || promise.promise_id || '',
    customer_id: promise.customer_id || promise.customerId || '',
    customer_name: promise.customer_name || promise.customerName || '',
    plan_id: promise.plan_id || promise.planId || '',
    installment_no: promise.installment_no || promise.installmentNo || 0,
    promise_date: promise.promise_date || promise.promiseDate || new Date().toISOString().split('T')[0],
    amount: promise.amount || 0,
    status: promise.status || 'pending',
    remarks: promise.remarks || '',
    cached_at: new Date(),
  });

  await syncEngine.queueOperation('promise', 'create', promise.id, promise);
}

export async function offlineUpdatePromise(id: string, data: any): Promise<void> {
  const existing = await offlineDB.promises.where('promise_id').equals(id).first();
  if (existing && existing.id) {
    await offlineDB.promises.update(existing.id, {
      ...data,
      cached_at: new Date(),
    });
  }

  await syncEngine.queueOperation('promise', 'update', id, data);
}

// ═══════════════════════════════════════════════════════════════
// 📋 RECEIPT ACTIONS
// ═══════════════════════════════════════════════════════════════

export async function offlineCreateReceipt(receipt: any): Promise<void> {
  await syncEngine.queueOperation('receipt', 'create', receipt.id || 'new', receipt);
}

export default {
  offlineCreateCustomer,
  offlineUpdateCustomer,
  offlineDeleteCustomer,
  offlineCreateProduct,
  offlineUpdateProduct,
  offlineDeleteProduct,
  offlineCreateGuarantor,
  offlineUpdateGuarantor,
  offlineDeleteGuarantor,
  offlineCreatePayment,
  offlineCreatePlan,
  offlineUpdatePlan,
  offlineDeletePlan,
  offlineCreateInventoryItem,
  offlineUpdateInventoryItem,
  offlineDeleteInventoryItem,
  offlineCreateExpense,
  offlineUpdateExpense,
  offlineDeleteExpense,
  offlineCreatePromise,
  offlineUpdatePromise,
  offlineCreateReceipt,
};
