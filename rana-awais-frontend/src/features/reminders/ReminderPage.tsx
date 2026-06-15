import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { formatPhone } from '../../utils/helpers';

const ReminderPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');

  const fetchUpcoming = async () => {
    setLoading(true);
    try {
      const res = await api.get('/installments/upcoming?days=3');
      setItems(res.data || []);
    } catch (err) { toast.error(t('error_loading')); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchUpcoming(); }, []);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const toggleAll = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(filtered.map(i => i.id)));
    else setSelectedIds(new Set());
  };

  const sendToSelected = async () => {
    if (selectedIds.size === 0) return;
    setSending(true);
    let count = 0;
    for (const item of items) {
      if (selectedIds.has(item.id)) {
        try {
          // upcoming API returns customer_id in the response
          const custId = item.customer_id || item.id;
          await api.post('/notifications/send', { customerId: custId, planId: item.id, installmentNo: item.installment_no });
          count++;
        } catch (err) { toast.error(t('send_failed_single', { no: item.installment_no })); }
      }
    }
    if (count > 0) toast.success(t('reminders_sent_count', { count }));
    else toast.error(t('no_reminders_sent'));
    setSelectedIds(new Set()); setSending(false);
  };

  const openWhatsApp = (item: any) => {
    const digits = (item.phone || '').replace(/[\s\-+]/g, '');
    let phone = digits;
    if (phone.startsWith('0')) phone = '92' + phone.slice(1);
    if (!phone.startsWith('92')) phone = '92' + phone;

    const due = new Date(item.due_date);
    const today = new Date();
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const urgencyText = diffDays <= 1 ? (isUrdu ? '⚠️ فوری! ' : '⚠️ URGENT! ') : '';

    const msg = isUrdu
      ? `${urgencyText}محترم ${item.customer_name || ''} صاحب،\n\nآپ کی قسط نمبر ${item.installment_no} (کل ${item.total_installments || '?'} میں سے) بمبلغ Rs. ${item.amount} مورخہ ${due.toLocaleDateString('ur-PK', { year: 'numeric', month: 'long', day: 'numeric' })} کو واجب الادا ہے۔\n\nباقی ماندہ اقساط: ${item.remaining_installments || '?'}\n\nبراہ کرم بروقت ادائیگی کریں تاکہ جرمانے سے بچ سکیں۔\n\nشکریہ\nرانا اویس الیکٹرانکس`
      : `${urgencyText}Dear ${item.customer_name || ''},\n\nYour installment #${item.installment_no} of Rs. ${item.amount} (out of ${item.total_installments || '?'}) is due on ${due.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.\n\nRemaining installments: ${item.remaining_installments || '?'}\n\nPlease pay on time to avoid fine.\n\nThank you,\nRANA-AWAIS Electronics`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(i =>
      (i.customer_name || '').toLowerCase().includes(q) ||
      (i.customer_urdu || '').includes(q) ||
      (i.phone || '').includes(q) ||
      (i.product_name || '').toLowerCase().includes(q) ||
      String(i.installment_no).includes(q)
    );
  }, [items, search]);

  const totalSelected = selectedIds.size;
  const totalAmountDue = useMemo(() => 
    items.filter(i => selectedIds.has(i.id)).reduce((s, i) => s + (i.amount || 0), 0), [items, selectedIds]
  );

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 pb-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight">{t('reminders')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('reminders_subtitle')}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={fetchUpcoming} className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-2xl text-sm font-semibold shadow-lg shadow-blue-500/25 transition-all active:scale-95">
            <svg className="w-4 h-4 mr-1.5 rtl:ml-1.5 rtl:mr-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            {t('refresh')}
          </button>
          <button onClick={sendToSelected} disabled={totalSelected === 0 || sending} className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-2xl text-sm font-semibold shadow-lg shadow-emerald-500/25 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
            {sending ? (
              <span className="flex items-center gap-2"><div className="spinner spinner-sm"></div>{t('sending')}</span>
            ) : (
              <><svg className="w-4 h-4 mr-1.5 rtl:ml-1.5 rtl:mr-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>{t('send_selected')} ({totalSelected})</>
            )}
          </button>
        </div>
      </div>

      {/* Selected Summary */}
      {totalSelected > 0 && (
        <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-900/10 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-800 flex flex-wrap justify-between items-center gap-3">
          <div className="flex gap-4">
            <div><p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase">{t('selected_installments')}</p><p className="text-lg font-bold text-emerald-800 dark:text-emerald-200">{totalSelected}</p></div>
            <div><p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase">{t('total_amount')}</p><p className="text-lg font-bold text-emerald-800 dark:text-emerald-200">Rs. {(totalAmountDue || 0).toFixed(2)}</p></div>
          </div>
          <button onClick={() => setSelectedIds(new Set())} className="text-xs text-emerald-600 hover:text-emerald-800 font-medium">{t('clear_selection') || 'Clear'}</button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <div className={`absolute inset-y-0 ${isUrdu ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none`}><svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" /></svg></div>
        <input type="text" placeholder={t('search') + ' reminders...'} value={search} onChange={e => setSearch(e.target.value)} className={`w-full ${isUrdu ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3.5 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent shadow-sm`} />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="spinner"></div></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-dashed border-gray-300 dark:border-gray-600">
          <svg className="mx-auto h-14 w-14 text-gray-300 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          <h3 className="text-lg font-bold text-gray-500 dark:text-gray-400">{search ? t('no_reminders_found') || 'No matching reminders' : t('no_upcoming_reminders')}</h3>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">{t('no_upcoming_reminders_desc')}</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:bg-white dark:text-gray-900">
                  <th className="px-4 py-4 w-10"><input type="checkbox" checked={totalSelected === filtered.length && filtered.length > 0} onChange={e => toggleAll(e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" /></th>
                  <th className="px-4 py-4 text-start text-xs font-bold text-gray-500 dark:text-gray-900 uppercase tracking-wider">{t('customer')}</th>
                  <th className="px-4 py-4 text-start text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('phone')}</th>
                  <th className="px-4 py-4 text-start text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('product')}</th>
                  <th className="px-4 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">#</th>
                  <th className="px-4 py-4 text-start text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('due_date')}</th>
                  <th className="px-4 py-4 text-end text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('amount')}</th>
                  <th className="px-4 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">WhatsApp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {filtered.map((item: any, idx: number) => {
                  const due = new Date(item.due_date);
                  const today = new Date();
                  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  const isUrgent = diffDays <= 1;
                  return (
                    <tr key={item.id} className={`hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all duration-200 ${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/30 dark:bg-gray-800/50'} ${isUrgent ? 'border-l-2 border-l-red-500' : ''}`}>
                      <td className="px-4 py-3.5"><input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelection(item.id)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" /></td>
                      <td className="px-4 py-3.5 font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap">
                        {isUrdu ? item.customer_urdu || item.customer_name : item.customer_name}
                        {isUrgent && <span className="ml-2 text-xs text-red-500 font-bold">⚠️</span>}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300 font-mono text-xs">{formatPhone(item.phone)}</td>
                      <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300">{item.product_name || '—'}</td>
                      <td className="px-4 py-3.5 text-center font-mono font-semibold text-gray-800 dark:text-white">{item.installment_no}</td>
                      <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300 text-xs whitespace-nowrap">
                        {`${String(due.getDate()).padStart(2,'0')}/${String(due.getMonth()+1).padStart(2,'0')}/${due.getFullYear()}`}
                        {diffDays <= 3 && <span className="block text-xs text-red-500 font-medium mt-0.5">{isUrdu ? `${diffDays} دن باقی` : `${diffDays}d left`}</span>}
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold text-gray-800 dark:text-white">Rs. {(item.amount || 0).toFixed(2)}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${isUrgent ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                          {isUrgent ? (isUrdu ? 'فوری' : 'URGENT') : (isUrdu ? 'زیر التواء' : 'Due')}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button onClick={() => openWhatsApp(item)} className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl text-xs font-semibold shadow-lg shadow-green-500/25 transition-all active:scale-95" title={t('open_whatsapp')}>
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          {t('send_whatsapp')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReminderPage;

