import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useCustomerStore } from '../../store/useCustomerStore';
import { useAuthStore } from '../../store/useAuthStore';
import CustomerCreateModal from './CustomerCreateModal';
import CustomerEditModal from './CustomerEditModal';
import CustomerHistory from './CustomerHistory';
import api from '../../utils/api';
import { formatPhone, formatCNIC } from '../../utils/helpers';
import { APP_CONFIG } from '../../config/app';
import { offlineDeleteCustomer } from '../../db/offlineActions';

// ✅ Action buttons component for reusability
const ActionButtons: React.FC<{
  onEdit: () => void;
  onDelete: () => void;
  onHistory: () => void;
  t: (key: string) => string;
  canEdit: boolean;
  canDelete: boolean;
}> = ({ onEdit, onDelete, onHistory, t, canEdit, canDelete }) => (
  <div className="flex justify-center gap-1.5">
    <button
      onClick={onHistory}
      className="p-2 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-all active:scale-95"
      title="History"
      aria-label="History"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
      </svg>
    </button>
    {canEdit && (
      <button
        onClick={onEdit}
        className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all active:scale-95"
        title={t('edit')}
        aria-label={t('edit')}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
    )}
    {canDelete && (
      <button
        onClick={onDelete}
        className="p-2 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all active:scale-95"
        title={t('delete')}
        aria-label={t('delete')}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    )}
  </div>
);

// ✅ Customer row component for better readability
const CustomerRow: React.FC<{
  customer: any;
  isUrdu: boolean;
  getGuarantorNames: (ids?: string[]) => string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onHistory: (id: string) => void;
  index: number;
  canEdit: boolean;
  canDelete: boolean;
}> = ({ customer, isUrdu, getGuarantorNames, onEdit, onDelete, onHistory, index, canEdit, canDelete }) => (
  <tr className={`hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all duration-200 ${
    index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/30 dark:bg-gray-800/50'
  }`}>
    <td className="px-5 py-4 font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap">
      {isUrdu ? customer.nameUrdu || customer.name : customer.name}
    </td>
    <td className="px-5 py-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">
      {isUrdu ? (customer.fatherNameUrdu || customer.father_name_urdu || customer.fatherName || customer.father_name || '—') : (customer.fatherName || customer.father_name || '—')}
    </td>
    <td className="px-5 py-4 text-gray-600 dark:text-gray-300 whitespace-nowrap font-mono text-xs" style={{ direction: 'ltr', textAlign: isUrdu ? 'right' : 'left' }}>
      {formatPhone(customer.phone)}
    </td>
    <td className="px-5 py-4 text-gray-600 dark:text-gray-300 whitespace-nowrap font-mono text-xs" style={{ direction: 'ltr', textAlign: isUrdu ? 'right' : 'left' }}>
      {customer.cnic ? formatCNIC(customer.cnic) : '—'}
    </td>
    <td className="px-5 py-4 text-gray-500 dark:text-gray-400 max-w-[180px] truncate" title={isUrdu ? customer.addressUrdu || customer.address : customer.address || ''}>
      {isUrdu ? customer.addressUrdu || customer.address : customer.address || '—'}
    </td>
    <td className="px-5 py-4 text-gray-500 dark:text-gray-400 max-w-[200px] truncate" title={getGuarantorNames(customer.guarantorIds)}>
      {getGuarantorNames(customer.guarantorIds)}
    </td>
    <td className="px-5 py-4 text-center">
      <ActionButtons
        onEdit={() => onEdit(customer.id)}
        onDelete={() => onDelete(customer.id)}
        onHistory={() => onHistory(customer.id)}
        t={(key) => key}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </td>
  </tr>
);

// ✅ Mobile card view
const CustomerCard: React.FC<{
  customer: any;
  isUrdu: boolean;
  getGuarantorNames: (ids?: string[]) => string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  canEdit: boolean;
  canDelete: boolean;
}> = ({ customer, isUrdu, getGuarantorNames, onEdit, onDelete, canEdit, canDelete }) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-4 space-y-3 shadow-sm">
    <div className="flex items-start justify-between">
      <div>
        <h3 className="font-bold text-gray-800 dark:text-white">
          {isUrdu ? customer.nameUrdu || customer.name : customer.name}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {isUrdu ? (customer.fatherNameUrdu || customer.father_name_urdu || customer.fatherName || customer.father_name || '—') : (customer.fatherName || customer.father_name || '—')}
        </p>
      </div>
      <div className="flex gap-1">
        {canEdit && (
          <button
            onClick={() => onEdit(customer.id)}
            className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}
        {canDelete && (
          <button
            onClick={() => onDelete(customer.id)}
            className="p-2 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div>
        <span className="text-gray-500 dark:text-gray-400">{isUrdu ? 'فون' : 'Phone'}:</span>
        <span className="ml-1 font-mono" dir="ltr">{formatPhone(customer.phone)}</span>
      </div>
      <div>
        <span className="text-gray-500 dark:text-gray-400">CNIC:</span>
        <span className="ml-1 font-mono" dir="ltr">{customer.cnic ? formatCNIC(customer.cnic) : '—'}</span>
      </div>
      <div className="col-span-2">
        <span className="text-gray-500 dark:text-gray-400">{isUrdu ? 'پتہ' : 'Address'}:</span>
        <span className="ml-1">{isUrdu ? customer.addressUrdu || customer.address : customer.address || '—'}</span>
      </div>
      <div className="col-span-2">
        <span className="text-gray-500 dark:text-gray-400">{isUrdu ? 'ضامن' : 'Guarantors'}:</span>
        <span className="ml-1">{getGuarantorNames(customer.guarantorIds)}</span>
      </div>
    </div>
  </div>
);

const CustomerList: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { customers, loading, fetchCustomers } = useCustomerStore();
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editCustomerId, setEditCustomerId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [historyCustomerId, setHistoryCustomerId] = useState<string | null>(null);
  const [allGuarantors, setAllGuarantors] = useState<any[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // ✅ Page title
  useEffect(() => {
    document.title = `${t('customers')} | ${APP_CONFIG.companyName}`;
  }, [t]);

  // ✅ Fetch customers
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // ✅ Fetch guarantors
  useEffect(() => {
    if (customers.length > 0) {
      api.get('/guarantors?limit=500')
        .then(res => {
          const d = res.data;
          setAllGuarantors(Array.isArray(d.data) ? d.data : (Array.isArray(d) ? d : []));
        })
        .catch(() => setAllGuarantors([]));
    }
  }, [customers]);

  const isUrdu = i18n.language === 'ur';
  const isStaff = user?.role === 'staff';
  const canEdit = !isStaff;
  const canDelete = !isStaff;

  // ✅ Get guarantor names
  const getGuarantorNames = useCallback((ids?: string[]) => {
    if (!ids || ids.length === 0) return '—';
    const names = ids
      .map(id => {
        const g = allGuarantors.find((x: any) => x.id === id);
        return g ? (isUrdu ? g.nameUrdu || g.name : g.name) : '—';
      })
      .filter(Boolean);
    return names.length ? names.join(', ') : '—';
  }, [allGuarantors, isUrdu]);

  // ✅ Filter customers
  const filtered = useMemo(() => 
    customers.filter(c =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.nameUrdu?.includes(search) ||
      c.fatherName?.toLowerCase().includes(search.toLowerCase()) ||
      c.fatherNameUrdu?.includes(search) ||
      c.phone?.includes(search) ||
      c.cnic?.includes(search) ||
      c.address?.toLowerCase().includes(search.toLowerCase()) ||
      c.addressUrdu?.includes(search) ||
      getGuarantorNames(c.guarantorIds).toLowerCase().includes(search.toLowerCase())
    ),
    [customers, search, getGuarantorNames]
  );

  const removeCustomer = useCustomerStore(s => s.removeCustomer);

  // ✅ Handle delete
  const handleDelete = useCallback(async (id: string) => {
    setIsDeleting(true);
    try {
      await api.delete(`/customers/${id}`);
      toast.success(isUrdu ? 'گاہک ڈیلیٹ ہو گیا' : t('customer_deleted'));
      await fetchCustomers(true);
    } catch (e) {
      // OFFLINE FALLBACK: Delete locally and queue for sync
      console.log('📦 Offline: Caching customer delete locally');
      await offlineDeleteCustomer(id);
      removeCustomer(id); // ✅ Immediate UI update
      toast.success(isUrdu ? 'گاہک آف لائن ڈیلیٹ ہو گیا' : 'Customer deleted offline');
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  }, [t, fetchCustomers, isUrdu, removeCustomer]);

  // ✅ Loading state
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {isUrdu ? 'لوڈ ہو رہا ہے...' : t('loading')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 pb-10">
      {/* ✅ Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight">
            {t('customers')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {filtered.length} {t('customers').toLowerCase()} {search ? `— "${search}"` : ''}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center px-4 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-2xl text-sm font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-95 transition-all"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 rtl:ml-1.5 rtl:mr-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('add_customer')}
        </button>
      </div>

      {/* ✅ Search Bar */}
      <div className="relative mb-6">
        <div className={`absolute inset-y-0 ${isUrdu ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none`}>
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder={isUrdu ? 'گاہک تلاش کریں...' : t('search_customer_placeholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={`w-full ${isUrdu ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3.5 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent shadow-sm transition-all`}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className={`absolute inset-y-0 ${isUrdu ? 'left-0 pl-4' : 'right-0 pr-4'} flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* ✅ Empty State */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-dashed border-gray-300 dark:border-gray-600">
          <svg className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">
            {search ? t('no_customers_found') : (isUrdu ? 'کوئی گاہک نہیں' : t('no_customers'))}
          </h3>
          {search && (
            <button onClick={() => setSearch('')} className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">
              {isUrdu ? 'تلاش صاف کریں' : (t('clear_search') || 'Clear Search')}
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ✅ Mobile Card View */}
          <div className="sm:hidden space-y-3">
            {filtered.map((c) => (
              <CustomerCard
                key={c.id}
                customer={c}
                isUrdu={isUrdu}
                getGuarantorNames={getGuarantorNames}
                onEdit={setEditCustomerId}
                onDelete={setDeleteConfirm}
                canEdit={canEdit}
                canDelete={canDelete}
              />
            ))}
          </div>

          {/* ✅ Desktop Table View */}
          <div className="hidden sm:block bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-sm">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:bg-gray-700 sticky top-0 z-10">
                  <tr>
                    <th className="px-5 py-4 text-start text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('name')}</th>
                    <th className="px-5 py-4 text-start text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('father_name') || 'Father Name'}</th>
                    <th className="px-5 py-4 text-start text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('phone')}</th>
                    <th className="px-5 py-4 text-start text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('cnic')}</th>
                    <th className="px-5 py-4 text-start text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('address')}</th>
                    <th className="px-5 py-4 text-start text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('guarantors')}</th>
                    <th className="px-5 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {filtered.map((c, idx) => (
                    <CustomerRow
                      key={c.id}
                      customer={c}
                      isUrdu={isUrdu}
                      getGuarantorNames={getGuarantorNames}
                      onEdit={setEditCustomerId}
                      onDelete={setDeleteConfirm}
                      onHistory={setHistoryCustomerId}
                      index={idx}
                      canEdit={canEdit}
                      canDelete={canDelete}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ✅ Modals */}
      {showCreate && (
        <CustomerCreateModal 
          onClose={() => setShowCreate(false)} 
          onSuccess={() => { 
            fetchCustomers(true); 
            setShowCreate(false); 
          }} 
        />
      )}
      
      {editCustomerId && (
        <CustomerEditModal 
          customerId={editCustomerId} 
          onClose={() => setEditCustomerId(null)} 
          onSuccess={() => { 
            fetchCustomers(true); 
            setEditCustomerId(null); 
          }} 
        />
      )}

      {/* ✅ History Modal */}
      {historyCustomerId && (
        <CustomerHistory
          customerId={historyCustomerId}
          onClose={() => setHistoryCustomerId(null)}
        />
      )}

      {/* ✅ Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                {isUrdu ? 'ڈیلیٹ کی تصدیق' : t('confirm_delete')}
              </h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {isUrdu ? 'کیا آپ واقعی اس گاہک کو ڈیلیٹ کرنا چاہتے ہیں؟' : t('delete_customer_confirm')}
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setDeleteConfirm(null)} 
                className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-medium transition-all"
              >
                {isUrdu ? 'منسوخ کریں' : t('cancel')}
              </button>
              <button 
                onClick={() => handleDelete(deleteConfirm)} 
                disabled={isDeleting}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-red-500/25"
              >
                {isDeleting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    {isUrdu ? 'ڈیلیٹ ہو رہا...' : t('deleting')}
                  </span>
                ) : (
                  isUrdu ? 'ڈیلیٹ کریں' : t('delete')
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(CustomerList);