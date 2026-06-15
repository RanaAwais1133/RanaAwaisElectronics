import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useCustomerStore } from '../../store/useCustomerStore';
import CustomerCreateModal from './CustomerCreateModal';
import CustomerEditModal from './CustomerEditModal';
import api from '../../utils/api';
import { formatPhone, formatCNIC } from '../../utils/helpers';


const CustomerList: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { customers, loading, fetchCustomers } = useCustomerStore();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editCustomerId, setEditCustomerId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [allGuarantors, setAllGuarantors] = useState<any[]>([]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Fetch guarantors separately when customers change
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

  const filtered = useMemo(() => 
    customers.filter(c =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.nameUrdu?.includes(search) ||
      c.fatherName?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.cnic?.includes(search) ||
      c.address?.toLowerCase().includes(search.toLowerCase()) ||
      c.addressUrdu?.includes(search) ||
      getGuarantorNames(c.guarantorIds).toLowerCase().includes(search.toLowerCase())
    ),
  [customers, search, getGuarantorNames]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await api.delete(`/customers/${id}`);
      toast.success(t('customer_deleted'));
      fetchCustomers();
    } catch (e) {
      toast.error(t('error_deleting_customer'));
    }
    setDeleteConfirm(null);
  }, [t, fetchCustomers]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4">
      {/* Header */}
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
          className="inline-flex items-center px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-2xl text-sm font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-95 transition-all"
        >
          <svg className="w-5 h-5 mr-1.5 rtl:ml-1.5 rtl:mr-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('add_customer')}
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <div className={`absolute inset-y-0 ${isUrdu ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none`}>
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder={t('search_customer_placeholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={`w-full ${isUrdu ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3.5 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent shadow-sm transition-all`}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className={`absolute inset-y-0 ${isUrdu ? 'left-0 pl-4' : 'right-0 pr-4'} flex items-center text-gray-400 hover:text-gray-600`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-dashed border-gray-300 dark:border-gray-600">
          <svg className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">
            {search ? t('no_customers_found') : t('no_customers')}
          </h3>
          {search && (
            <button onClick={() => setSearch('')} className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">
              {t('clear_search') || 'Clear Search'}
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:bg-white dark:text-gray-900">
                  <th className="px-5 py-4 text-start text-xs font-bold text-gray-500 dark:text-gray-900 uppercase tracking-wider">{t('name')}</th>
                  <th className="px-5 py-4 text-start text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('father_name') || 'Father Name'}</th>
                  <th className="px-5 py-4 text-start text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('phone')}</th>
                  <th className="px-5 py-4 text-start text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('cnic')}</th>
                  <th className="px-5 py-4 text-start text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('address')}</th>
                  <th className="px-5 py-4 text-start text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('guarantors')}</th>
                  <th className="px-5 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {filtered.map((c, idx) => (
                  <tr key={c.id} className={`hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all duration-200 ${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/30 dark:bg-gray-800/50'}`}>
                    <td className="px-5 py-4 font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap">
                      {isUrdu ? c.nameUrdu || c.name : c.name}
                    </td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {isUrdu ? (c.fatherNameUrdu || c.father_name_urdu || c.fatherName || c.father_name || '—') : (c.fatherName || c.father_name || '—')}
                    </td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-300 whitespace-nowrap font-mono text-xs" style={{direction:'ltr',textAlign:isUrdu?'right':'left'}}>
                      {formatPhone(c.phone)}
                    </td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-300 whitespace-nowrap font-mono text-xs" style={{direction:'ltr',textAlign:isUrdu?'right':'left'}}>
                      {c.cnic ? formatCNIC(c.cnic) : '—'}
                    </td>
                    <td className="px-5 py-4 text-gray-500 dark:text-gray-400 max-w-[180px] truncate" title={isUrdu ? c.addressUrdu || c.address : c.address || ''}>
                      {isUrdu ? c.addressUrdu || c.address : c.address || '—'}
                    </td>
                    <td className="px-5 py-4 text-gray-500 dark:text-gray-400 max-w-[200px] truncate" title={getGuarantorNames(c.guarantorIds)}>
                      {getGuarantorNames(c.guarantorIds)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex justify-center gap-1.5">
                        <button
                          onClick={() => setEditCustomerId(c.id)}
                          className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all"
                          title={t('edit')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(c.id)}
                          className="p-2 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all"
                          title={t('delete')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && (
        <CustomerCreateModal onClose={() => setShowCreate(false)} onSuccess={() => { fetchCustomers(); setShowCreate(false); }} />
      )}
      {editCustomerId && (
        <CustomerEditModal customerId={editCustomerId} onClose={() => setEditCustomerId(null)} onSuccess={() => { fetchCustomers(); setEditCustomerId(null); }} />
      )}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">{t('confirm_delete')}</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('delete_customer_confirm')}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-medium transition-all">{t('cancel')}</button>
              <button onClick={() => handleDelete(deleteConfirm!)} className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-red-500/25">{t('delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(CustomerList);
