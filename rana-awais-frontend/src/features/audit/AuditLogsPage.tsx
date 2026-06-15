import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const actionColors: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  UPDATE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  DELETE: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  PAYMENT: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  BULK_PAYMENT: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  ADVANCE_PAYMENT: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
};

const entityIcons: Record<string, string> = {
  product: '📦',
  customer: '👤',
  guarantor: '🛡️',
  installment_plan: '📋',
  user: '👥',
};

// Parse details string like "Amount: 5000.00 | Installment: 3 | Method: cash | Remaining: 25000.00 | AppliedTo: 3"
// into structured key-value pairs
const parseDetails = (details: string): { key: string; value: string }[] => {
  if (!details) return [];
  return details.split('|').map(part => {
    const trimmed = part.trim();
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx > 0) {
      return {
        key: trimmed.substring(0, colonIdx).trim(),
        value: trimmed.substring(colonIdx + 1).trim(),
      };
    }
    return { key: '', value: trimmed };
  });
};

const AuditLogsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [page, setPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const limit = 50;
  const [detailModal, setDetailModal] = useState<any>(null);

  const fetchLogs = (p: number = 1) => {
    setLoading(true); setError(false);
    api.get(`/audit-logs?page=${p}&limit=${limit}`)
      .then(res => {
        setLogs(res.data.logs || []);
        setTotalLogs(res.data.total || 0);
        setPage(res.data.page || 1);
      })
      .catch(() => { toast.error(t('error_loading_audit')); setError(true); })
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchLogs(1); }, []);

  const totalPages = Math.ceil(totalLogs / limit);

  const isUrdu = i18n.language === 'ur';

  const filtered = useMemo(() => {
    let data = [...logs];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((l: any) =>
        (l.action || '').toLowerCase().includes(q) ||
        (l.entity || '').toLowerCase().includes(q) ||
        (l.entity_id || '').toLowerCase().includes(q) ||
        (l.user_name || '').toLowerCase().includes(q) ||
        (l.user_id || '').toLowerCase().includes(q) ||
        (l.details || '').toLowerCase().includes(q)
      );
    }
    if (filterAction) data = data.filter((l: any) => l.action === filterAction);
    if (filterEntity) data = data.filter((l: any) => l.entity === filterEntity);
    return data;
  }, [logs, search, filterAction, filterEntity]);

  const uniqueActions: string[] = useMemo(() => {
    const actions: string[] = [];
    logs.forEach((log: any) => {
      if (log.action && !actions.includes(log.action)) {
        actions.push(log.action);
      }
    });
    return actions;
  }, [logs]);

  const uniqueEntities: string[] = useMemo(() => {
    const entities: string[] = [];
    logs.forEach((log: any) => {
      if (log.entity && !entities.includes(log.entity)) {
        entities.push(log.entity);
      }
    });
    return entities;
  }, [logs]);

  const formatDate = (ts: string) => {
    if (!ts) return '';
    const d = new Date(ts);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  };

  const formatTime = (ts: string) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString(isUrdu ? 'ur-PK' : 'en-PK', { hour:'2-digit', minute:'2-digit' });
  };

  const formatFullDate = (ts: string) => {
    if (!ts) return '';
    return new Date(ts).toLocaleDateString(isUrdu ? 'ur-PK' : 'en-PK', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' });
  };

  // Mobile card view for each log
  const LogCard = ({ log }: { log: any }) => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${actionColors[log.action] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
          {log.action}
        </span>
        <span className="text-xs text-gray-400">{entityIcons[log.entity] || '📄'} {log.entity}</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono text-gray-500">{log.entity_id?.slice(-8) || '—'}</span>
        <span className="text-gray-400">{formatDate(log.timestamp)} · {formatTime(log.timestamp)}</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {log.user_name ? (
            <>
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold">
                {(log.user_name || '?')[0].toUpperCase()}
              </div>
              <span className="font-semibold text-gray-800 dark:text-gray-100 text-xs">{log.user_name}</span>
            </>
          ) : (
            <span className="text-gray-400 text-xs">—</span>
          )}
        </div>
        <button
          onClick={() => setDetailModal(log)}
          className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-800/40 dark:hover:to-indigo-800/40 transition-all active:scale-95"
        >
          📋 {isUrdu ? 'دیکھیں' : 'View'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 pb-10 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight">{t('audit_logs')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{filtered.length} entries</p>
        </div>
        <button onClick={() => fetchLogs(page)} className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-500 rounded-2xl text-sm font-semibold text-gray-700 dark:text-gray-200 shadow-sm transition-all active:scale-95">
          <svg className="w-4 h-4 mr-1.5 rtl:ml-1.5 rtl:mr-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          {t('refresh')}
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <div className={`absolute inset-y-0 ${isUrdu ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none`}><svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" /></svg></div>
          <input type="text" placeholder={t('search') + ' audit logs...'} value={search} onChange={e => setSearch(e.target.value)} className={`w-full ${isUrdu ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-2.5 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-400`} />
        </div>
        <select value={filterAction} onChange={e => setFilterAction(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded-2xl px-4 py-2.5 bg-white dark:bg-gray-800 text-sm">
          <option value="">{t('action')}</option>
          {uniqueActions.map((a: string) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filterEntity} onChange={e => setFilterEntity(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded-2xl px-4 py-2.5 bg-white dark:bg-gray-800 text-sm">
          <option value="">{t('entity')}</option>
          {uniqueEntities.map((e: string) => <option key={e} value={e}>{e}</option>)}
        </select>
        {(search || filterAction || filterEntity) && (
          <button onClick={() => { setSearch(''); setFilterAction(''); setFilterEntity(''); }} className="px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all">{t('clear_filters') || 'Clear'}</button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
      ) : error ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-300 dark:border-gray-600">
          <p className="text-gray-500 mb-3">{t('error_loading_audit')}</p>
          <button onClick={() => fetchLogs(page)} className="text-blue-600 font-semibold underline">{t('retry')}</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-dashed border-gray-300 dark:border-gray-600">
          <svg className="mx-auto h-14 w-14 text-gray-300 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <p className="text-gray-500 font-medium">{t('no_audit_logs')}</p>
        </div>
      ) : (
        <>
          {/* MOBILE CARD VIEW */}
          <div className="sm:hidden space-y-3">
            {filtered.map((log: any, idx: number) => (
              <LogCard key={idx} log={log} />
            ))}
          </div>

          {/* DESKTOP TABLE VIEW */}
          <div className="hidden sm:block bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 overflow-hidden">
            <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
              <table className="w-full min-w-[800px] text-sm">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:bg-white dark:text-gray-900 sticky top-0 z-10">
                  <tr>
                    <th className="px-5 py-4 text-start text-xs font-bold text-gray-500 dark:text-gray-900 uppercase tracking-wider">{t('action')}</th>
                    <th className="px-5 py-4 text-start text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('entity')}</th>
                    <th className="px-5 py-4 text-start text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('entity_id')}</th>
                    <th className="px-5 py-4 text-start text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('user')}</th>
                    <th className="px-5 py-4 text-start text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('timestamp')}</th>
                    <th className="px-5 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{isUrdu ? 'تفصیل' : 'Details'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {filtered.map((log: any, idx: number) => (
                    <tr key={idx} className={`hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all duration-200 ${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/30 dark:bg-gray-800/50'}`}>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${actionColors[log.action] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-700 dark:text-gray-200 font-medium">
                        {entityIcons[log.entity] || '📄'} {log.entity}
                      </td>
                      <td className="px-5 py-4 text-xs font-mono text-gray-500 dark:text-gray-400">{log.entity_id?.slice(-8) || '—'}</td>
                      <td className="px-5 py-4">
                        {log.user_name ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {(log.user_name || '?')[0].toUpperCase()}
                            </div>
                            <span className="font-semibold text-gray-800 dark:text-gray-100">{log.user_name}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">
                        {formatDate(log.timestamp)}
                        <span className="mx-1 text-gray-300 dark:text-gray-600">·</span>
                        {formatTime(log.timestamp)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={() => setDetailModal(log)}
                          className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-800/40 dark:hover:to-indigo-800/40 transition-all active:scale-95"
                        >
                          📋 {isUrdu ? 'دیکھیں' : 'View'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-2">
          <button
            onClick={() => fetchLogs(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
          >
            ← {isUrdu ? 'پچھلا' : 'Prev'}
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => fetchLogs(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 disabled:opacity-40 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
          >
            {isUrdu ? 'اگلا' : 'Next'} →
          </button>
        </div>
      )}

      {/* DETAILS MODAL */}
      {detailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50" onClick={() => setDetailModal(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto mx-2" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-gray-800 z-10 flex justify-between items-center px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                📋 {isUrdu ? 'مکمل تفصیل' : 'Full Details'}
              </h3>
              <button onClick={() => setDetailModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-xl">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{isUrdu ? 'عمل' : 'Action'}</p>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${actionColors[detailModal.action] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                    {detailModal.action}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{isUrdu ? 'ہستی' : 'Entity'}</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{entityIcons[detailModal.entity] || '📄'} {detailModal.entity}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">ID</p>
                  <p className="text-sm font-mono text-gray-800 dark:text-gray-100 break-all">{detailModal.entity_id || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{isUrdu ? 'صارف' : 'User'}</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{detailModal.user_name || detailModal.user_id?.slice(-8) || '—'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{isUrdu ? 'تاریخ و وقت' : 'Timestamp'}</p>
                  <p className="text-sm text-gray-800 dark:text-gray-100">{formatFullDate(detailModal.timestamp)}</p>
                </div>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{isUrdu ? 'تفصیل' : 'Details'}</p>
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
                  {detailModal.details ? (
                    <div className="space-y-2">
                      {parseDetails(detailModal.details).map((item, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          {item.key ? (
                            <>
                              <span className="font-bold text-gray-700 dark:text-gray-200 whitespace-nowrap min-w-[100px]">{item.key}:</span>
                              <span className="text-gray-800 dark:text-gray-100 font-medium">{item.value}</span>
                            </>
                          ) : (
                            <span className="text-gray-800 dark:text-gray-100 font-mono">{item.value}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">{isUrdu ? 'کوئی تفصیل نہیں' : 'No details available'}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-5 py-3 flex justify-end">
              <button onClick={() => setDetailModal(null)} className="px-5 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all">
                {isUrdu ? 'بند کریں' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogsPage;

