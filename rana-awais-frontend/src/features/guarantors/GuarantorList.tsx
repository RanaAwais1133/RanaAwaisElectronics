import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import GuarantorCreate from './GuarantorCreate';
import GuarantorEditModal from './GuarantorEditModal';
import { formatPhone, formatCNIC } from '../../utils/helpers';
import { APP_CONFIG } from '../../config/app';

// ✅ Action Buttons Component
const ActionButtons: React.FC<{
  guarantor: any;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onVerify: (id: string, status: string) => void;
  t: (key: string) => string;
}> = ({ guarantor, onEdit, onDelete, onVerify, t }) => {
  const isPending = guarantor.verificationStatus === 'pending';

  return (
    <div className="flex justify-center items-center gap-1.5 flex-wrap">
      {isPending && (
        <>
          <button
            onClick={() => onVerify(guarantor.id, 'verified')}
            className="px-2.5 py-1.5 text-xs rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 font-medium transition-all"
            title={t('verify')}
          >
            ✓
          </button>
          <button
            onClick={() => onVerify(guarantor.id, 'rejected')}
            className="px-2.5 py-1.5 text-xs rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 font-medium transition-all"
            title={t('reject')}
          >
            ✗
          </button>
        </>
      )}
      <button
        onClick={() => onEdit(guarantor.id)}
        className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all"
        title={t('edit')}
        aria-label={t('edit')}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
      <button
        onClick={() => onDelete(guarantor.id)}
        className="p-2 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all"
        title={t('delete')}
        aria-label={t('delete')}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
};

// ✅ Guarantor Row Component
const GuarantorRow: React.FC<{
  guarantor: any;
  isUrdu: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onVerify: (id: string, status: string) => void;
  t: (key: string) => string;
  index: number;
}> = ({ guarantor, isUrdu, onEdit, onDelete, onVerify, t, index }) => (
  <tr className={`hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all duration-200 ${
    index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/30 dark:bg-gray-800/50'
  }`}>
    <td className="px-5 py-4 font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap">
      {isUrdu ? guarantor.nameUrdu || guarantor.name : guarantor.name}
    </td>
    <td className="px-5 py-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">
      {isUrdu ? (guarantor.fatherNameUrdu || guarantor.father_name_urdu || guarantor.fatherName || guarantor.father_name || '—') : (guarantor.fatherName || guarantor.father_name || '—')}
    </td>
    <td className="px-5 py-4 text-gray-600 dark:text-gray-300 whitespace-nowrap font-mono text-xs" style={{ direction: 'ltr', textAlign: isUrdu ? 'right' : 'left' }}>
      {formatPhone(guarantor.phone)}
    </td>
    <td className="px-5 py-4 text-gray-600 dark:text-gray-300 whitespace-nowrap font-mono text-xs" style={{ direction: 'ltr', textAlign: isUrdu ? 'right' : 'left' }}>
      {guarantor.cnic ? formatCNIC(guarantor.cnic) : '—'}
    </td>
    <td className="px-5 py-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">
      {isUrdu ? guarantor.customerUrdu || guarantor.customerName : guarantor.customerName || '—'}
    </td>
    <td className="px-5 py-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">
      {guarantor.relation || '—'}
    </td>
    <td className="px-5 py-4">
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
        guarantor.verificationStatus === 'verified' 
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' 
          : guarantor.verificationStatus === 'rejected' 
            ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' 
            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
      }`}>
        {guarantor.verificationStatus === 'pending' 
          ? t('pending') 
          : guarantor.verificationStatus === 'verified' 
            ? t('verified') 
            : guarantor.verificationStatus === 'rejected' 
              ? t('rejected') 
              : guarantor.verificationStatus || '—'}
      </span>
    </td>
    <td className="px-5 py-4">
      <ActionButtons
        guarantor={guarantor}
        onEdit={onEdit}
        onDelete={onDelete}
        onVerify={onVerify}
        t={t}
      />
    </td>
  </tr>
);

// ✅ Mobile Card View
const GuarantorCard: React.FC<{
  guarantor: any;
  isUrdu: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onVerify: (id: string, status: string) => void;
  t: (key: string) => string;
}> = ({ guarantor, isUrdu, onEdit, onDelete, onVerify, t }) => {
  const isPending = guarantor.verificationStatus === 'pending';
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-4 space-y-3 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-gray-800 dark:text-white">
            {isUrdu ? guarantor.nameUrdu || guarantor.name : guarantor.name}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {isUrdu ? (guarantor.fatherNameUrdu || guarantor.father_name_urdu || guarantor.fatherName || guarantor.father_name || '—') : (guarantor.fatherName || guarantor.father_name || '—')}
          </p>
        </div>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
          guarantor.verificationStatus === 'verified' 
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' 
            : guarantor.verificationStatus === 'rejected' 
              ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' 
              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
        }`}>
          {guarantor.verificationStatus === 'pending' 
            ? t('pending') 
            : guarantor.verificationStatus === 'verified' 
              ? t('verified') 
              : guarantor.verificationStatus === 'rejected' 
                ? t('rejected') 
                : guarantor.verificationStatus || '—'}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-gray-500 dark:text-gray-400">{isUrdu ? 'فون' : 'Phone'}:</span>
          <span className="ml-1 font-mono" dir="ltr">{formatPhone(guarantor.phone)}</span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">CNIC:</span>
          <span className="ml-1 font-mono" dir="ltr">{guarantor.cnic ? formatCNIC(guarantor.cnic) : '—'}</span>
        </div>
        <div className="col-span-2">
          <span className="text-gray-500 dark:text-gray-400">{isUrdu ? 'گاہک' : 'Customer'}:</span>
          <span className="ml-1">{isUrdu ? guarantor.customerUrdu || guarantor.customerName : guarantor.customerName || '—'}</span>
        </div>
        <div className="col-span-2">
          <span className="text-gray-500 dark:text-gray-400">{isUrdu ? 'رشتہ' : 'Relation'}:</span>
          <span className="ml-1">{guarantor.relation || '—'}</span>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
        {isPending && (
          <>
            <button
              onClick={() => onVerify(guarantor.id, 'verified')}
              className="px-3 py-1.5 text-xs rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 font-medium transition-all"
            >
              ✓ {t('verify')}
            </button>
            <button
              onClick={() => onVerify(guarantor.id, 'rejected')}
              className="px-3 py-1.5 text-xs rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 font-medium transition-all"
            >
              ✗ {t('reject')}
            </button>
          </>
        )}
        <button
          onClick={() => onEdit(guarantor.id)}
          className="px-3 py-1.5 text-xs rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 font-medium transition-all"
        >
          {t('edit')}
        </button>
        <button
          onClick={() => onDelete(guarantor.id)}
          className="px-3 py-1.5 text-xs rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 font-medium transition-all"
        >
          {t('delete')}
        </button>
      </div>
    </div>
  );
};

const GuarantorList: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  
  const [guarantors, setGuarantors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editGuarantorId, setEditGuarantorId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ✅ Page title
  useEffect(() => {
    document.title = `${t('guarantors')} | ${APP_CONFIG.companyName}`;
  }, [t]);

  // ✅ Fetch list
  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/guarantors?limit=500');
      const data = res.data?.data || res.data || [];
      setGuarantors(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(t('error_loading_guarantors'));
      setGuarantors([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // ✅ Handle delete
  const handleDelete = useCallback(async (id: string) => {
    setIsDeleting(true);
    try {
      await api.delete(`/guarantors/${id}`);
      toast.success(isUrdu ? 'ضامن ڈیلیٹ ہو گیا' : t('guarantor_deleted'));
      await fetchList();
    } catch (err) {
      toast.error(isUrdu ? 'ضامن ڈیلیٹ کرنے میں ناکامی' : t('error_deleting_guarantor'));
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  }, [t, fetchList, isUrdu]);

  // ✅ Handle verify
  const handleVerify = useCallback(async (id: string, newStatus: string) => {
    try {
      await api.put(`/guarantors/${id}`, { verificationStatus: newStatus });
      toast.success(newStatus === 'verified' 
        ? (isUrdu ? 'ضامن تصدیق شدہ' : t('guarantor_verified')) 
        : (isUrdu ? 'ضامن مسترد' : t('guarantor_rejected'))
      );
      await fetchList();
    } catch (err) {
      toast.error(isUrdu ? 'ضامن اپ ڈیٹ کرنے میں ناکامی' : t('error_updating_guarantor'));
    }
  }, [t, fetchList, isUrdu]);

  // ✅ Filter
  const filtered = useMemo(() => {
    if (!Array.isArray(guarantors)) return [];
    if (!search) return guarantors;
    const q = search.toLowerCase();
    return guarantors.filter(g =>
      g.name?.toLowerCase().includes(q) ||
      g.nameUrdu?.includes(q) ||
      g.fatherName?.toLowerCase().includes(q) ||
      g.father_name?.toLowerCase().includes(q) ||
      g.fatherNameUrdu?.includes(q) ||
      g.father_name_urdu?.includes(q) ||
      g.phone?.includes(q) ||
      g.cnic?.includes(q) ||
      g.customerName?.toLowerCase().includes(q) ||
      g.customerUrdu?.includes(q) ||
      g.relation?.toLowerCase().includes(q) ||
      g.officePhone?.includes(q) ||
      g.occupation?.toLowerCase().includes(q)
    );
  }, [guarantors, search]);

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
            {t('guarantors')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {filtered.length} {t('guarantors').toLowerCase()}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center px-4 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-2xl text-sm font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-95 transition-all"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 rtl:ml-1.5 rtl:mr-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('add_guarantor')}
        </button>
      </div>

      {/* ✅ Search */}
      <div className="relative mb-6">
        <div className={`absolute inset-y-0 ${isUrdu ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none`}>
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder={isUrdu ? 'ضامن تلاش کریں...' : `${t('search')} ${t('guarantors')}...`}
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">
            {search ? (isUrdu ? 'کوئی ضامن نہیں ملا' : t('no_guarantors_found') || 'No guarantors found') : (isUrdu ? 'کوئی ضامن نہیں' : t('no_guarantors'))}
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
            {filtered.map((g) => (
              <GuarantorCard
                key={g.id}
                guarantor={g}
                isUrdu={isUrdu}
                onEdit={setEditGuarantorId}
                onDelete={setDeleteConfirm}
                onVerify={handleVerify}
                t={t}
              />
            ))}
          </div>

          {/* ✅ Desktop Table View */}
          <div className="hidden sm:block bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:bg-gray-700 sticky top-0 z-10">
                  <tr>
                    <th className="px-5 py-4 text-start text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('name')}</th>
                    <th className="px-5 py-4 text-start text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('father_name') || 'Father Name'}</th>
                    <th className="px-5 py-4 text-start text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('phone')}</th>
                    <th className="px-5 py-4 text-start text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('cnic')}</th>
                    <th className="px-5 py-4 text-start text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('customer')}</th>
                    <th className="px-5 py-4 text-start text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('relation')}</th>
                    <th className="px-5 py-4 text-start text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('status')}</th>
                    <th className="px-5 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {filtered.map((g: any, idx: number) => (
                    <GuarantorRow
                      key={g.id}
                      guarantor={g}
                      isUrdu={isUrdu}
                      onEdit={setEditGuarantorId}
                      onDelete={setDeleteConfirm}
                      onVerify={handleVerify}
                      t={t}
                      index={idx}
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
        <GuarantorCreate 
          onClose={() => setShowCreate(false)} 
          onSuccess={() => { 
            fetchList(); 
            setShowCreate(false); 
          }} 
        />
      )}
      
      {editGuarantorId && (
        <GuarantorEditModal 
          guarantorId={editGuarantorId} 
          onClose={() => setEditGuarantorId(null)} 
          onSuccess={() => { 
            fetchList(); 
            setEditGuarantorId(null); 
          }} 
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
              {isUrdu ? 'کیا آپ واقعی اس ضامن کو ڈیلیٹ کرنا چاہتے ہیں؟' : t('delete_guarantor_confirm')}
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

export default React.memo(GuarantorList);