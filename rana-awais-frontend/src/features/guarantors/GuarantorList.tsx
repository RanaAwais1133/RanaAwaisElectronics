import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import GuarantorCreate from './GuarantorCreate';
import GuarantorEditModal from './GuarantorEditModal';
import { formatPhone, formatCNIC } from '../../utils/helpers';


const GuarantorList: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [guarantors, setGuarantors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editGuarantorId, setEditGuarantorId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/guarantors?limit=200');
      const data = res.data?.data || res.data || [];
      // ✅ Ensure data is always an array
      setGuarantors(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(t('error_loading_guarantors'));
      setGuarantors([]); // ✅ Set empty array on error
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchList(); }, [fetchList]);


  const handleDelete = useCallback(async (id: string) => {
    try {
      await api.delete(`/guarantors/${id}`);
      toast.success(t('guarantor_deleted'));
      fetchList();
    } catch (err) { toast.error(t('error_deleting_guarantor')); }
    setDeleteConfirm(null);
  }, [t, fetchList]);

  const handleVerify = useCallback(async (id: string, newStatus: string) => {
    try {
      await api.put(`/guarantors/${id}`, { verificationStatus: newStatus });
      toast.success(newStatus === 'verified' ? t('guarantor_verified') : t('guarantor_rejected'));
      fetchList();
    } catch (err) { toast.error(t('error_updating_guarantor')); }
  }, [t, fetchList]);

  const isUrdu = i18n.language === 'ur';

  // ✅ FIXED: Added Array.isArray check before filter
  const filtered = useMemo(() => 
    Array.isArray(guarantors) ? guarantors.filter(g =>
      g.name?.toLowerCase().includes(search.toLowerCase()) ||
      g.nameUrdu?.includes(search) ||
      g.fatherName?.toLowerCase().includes(search.toLowerCase()) ||
      g.father_name?.toLowerCase().includes(search.toLowerCase()) ||
      g.fatherNameUrdu?.includes(search) ||
      g.father_name_urdu?.includes(search) ||
      g.phone?.includes(search) ||
      g.cnic?.includes(search) ||
      g.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      g.customerUrdu?.includes(search) ||
      g.relation?.toLowerCase().includes(search.toLowerCase())
    ) : []
  , [guarantors, search]);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight">{t('guarantors')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{filtered.length} {t('guarantors').toLowerCase()}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-2xl text-sm font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-95 transition-all">
          <svg className="w-5 h-5 mr-1.5 rtl:ml-1.5 rtl:mr-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          {t('add_guarantor')}
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <div className={`absolute inset-y-0 ${isUrdu ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none`}>
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" /></svg>
        </div>
        <input type="text" placeholder={t('search') + ' ' + t('guarantors') + '...'} value={search} onChange={e => setSearch(e.target.value)} className={`w-full ${isUrdu ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3.5 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent shadow-sm`} />
        {search && (
          <button onClick={() => setSearch('')} className={`absolute inset-y-0 ${isUrdu ? 'left-0 pl-4' : 'right-0 pr-4'} flex items-center text-gray-400 hover:text-gray-600`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="spinner"></div></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-dashed border-gray-300 dark:border-gray-600">
          <svg className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">{search ? (t('no_guarantors_found') || 'No guarantors found') : t('no_guarantors')}</h3>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:bg-white dark:text-gray-900">
                  <th className="px-5 py-4 text-start text-xs font-bold text-gray-500 dark:text-gray-900 uppercase tracking-wider">{t('name')}</th>
                  <th className="px-5 py-4 text-start text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('father_name') || 'Father Name'}</th>
                  <th className="px-5 py-4 text-start text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('phone')}</th>
                  <th className="px-5 py-4 text-start text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('cnic')}</th>
                  <th className="px-5 py-4 text-start text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('customer')}</th>
                  <th className="px-5 py-4 text-start text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('relation')}</th>
                  <th className="px-5 py-4 text-start text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('status')}</th>
                  <th className="px-5 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {filtered.map((g: any, idx: number) => (
                  <tr key={g.id} className={`hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all duration-200 ${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/30 dark:bg-gray-800/50'}`}>
                    <td className="px-5 py-4 font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap">{isUrdu ? g.nameUrdu || g.name : g.name}</td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">{isUrdu ? (g.fatherNameUrdu || g.father_name_urdu || g.fatherName || g.father_name || '—') : (g.fatherName || g.father_name || '—')}</td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-300 whitespace-nowrap font-mono text-xs" style={{direction:'ltr',textAlign:isUrdu?'right':'left'}}>{formatPhone(g.phone)}</td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-300 whitespace-nowrap font-mono text-xs" style={{direction:'ltr',textAlign:isUrdu?'right':'left'}}>{g.cnic ? formatCNIC(g.cnic) : '—'}</td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">{isUrdu ? g.customerUrdu || g.customerName : g.customerName || '—'}</td>
                    <td className="px-5 py-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">{g.relation || '—'}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        g.verificationStatus === 'verified' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
                        g.verificationStatus === 'rejected' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' :
                        'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                      }`}>
                        {g.verificationStatus === 'pending' ? t('pending') : g.verificationStatus === 'verified' ? t('verified') : g.verificationStatus === 'rejected' ? t('rejected') : g.verificationStatus || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-center items-center gap-1.5">
                        {g.verificationStatus === 'pending' && (
                          <>
                            <button onClick={() => handleVerify(g.id, 'verified')} className="px-2.5 py-1.5 text-xs rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 font-medium transition-all" title={t('verify')}>✓</button>
                            <button onClick={() => handleVerify(g.id, 'rejected')} className="px-2.5 py-1.5 text-xs rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 font-medium transition-all" title={t('reject')}>✗</button>
                          </>
                        )}
                        <button onClick={() => setEditGuarantorId(g.id)} className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all" title={t('edit')}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                        <button onClick={() => setDeleteConfirm(g.id)} className="p-2 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all" title={t('delete')}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && <GuarantorCreate onClose={() => setShowCreate(false)} onSuccess={() => { fetchList(); setShowCreate(false); }} />}
      {editGuarantorId && <GuarantorEditModal guarantorId={editGuarantorId} onClose={() => setEditGuarantorId(null)} onSuccess={() => { fetchList(); setEditGuarantorId(null); }} />}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center"><svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg></div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">{t('confirm_delete')}</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('delete_guarantor_confirm')}</p>
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

export default React.memo(GuarantorList);