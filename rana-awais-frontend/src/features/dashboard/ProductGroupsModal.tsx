import React, { useEffect, useState } from 'react';
import api from '../../utils/api';

interface ProductGroupsModalProps {
  isUrdu: boolean;
  lowStockOnly?: boolean;
  onClose: () => void;
  onSelectProduct?: (productName: string) => void;
}

const ProductGroupsModal: React.FC<ProductGroupsModalProps> = ({ isUrdu, lowStockOnly = false, onClose, onSelectProduct }) => {
  const [productGroups, setProductGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch fresh data when modal opens - use fast endpoint
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSearchQuery('');
    
    const endpoint = lowStockOnly ? '/dashboard/low-stock-products' : '/dashboard/product-groups';
    
    api.get(endpoint)
      .then(res => {
        if (!cancelled) {
          const groups = res.data?.productGroups || [];
          setProductGroups(groups);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProductGroups([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [lowStockOnly]);

  // Filter product groups
  const filteredGroups = productGroups.filter((pg: any) => {
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = (pg.name || '').toLowerCase();
      const nameUrdu = (pg.nameUrdu || '').toLowerCase();
      const company = (pg.company || '').toLowerCase();
      if (!name.includes(q) && !nameUrdu.includes(q) && !company.includes(q)) {
        return false;
      }
    }
    // Low stock filter
    if (lowStockOnly && (pg.totalStock || 0) > 5) {
      return false;
    }
    return true;
  });

  const totalStock = filteredGroups.reduce((s: number, g: any) => s + (g.totalStock || 0), 0);
  const totalValue = filteredGroups.reduce((s: number, g: any) => s + (g.totalValue || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {lowStockOnly ? (isUrdu ? 'کم اسٹاک والے مصنوعات' : 'Low Stock Products') : (isUrdu ? 'مصنوعات کے گروپ' : 'Product Groups')}
              </h2>
              <p className="text-xs text-gray-500">
                {filteredGroups.length} {isUrdu ? 'گروپس' : 'groups'} — 
                {isUrdu ? 'کل اسٹاک' : 'Total Stock'}: {totalStock} — 
                {isUrdu ? 'کل ویلیو' : 'Total Value'}: Rs. {totalValue.toLocaleString()}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        {/* Search Bar */}
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isUrdu ? 'پروڈکٹ تلاش کریں...' : 'Search products...'}
              className="w-full pl-10 pr-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-400">{isUrdu ? 'لوڈ ہو رہا ہے...' : 'Loading...'}</p>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
              </div>
              <p className="text-gray-400 font-medium">
                {lowStockOnly ? (isUrdu ? 'کوئی کم اسٹاک والا مصنوعات نہیں' : 'No low stock products') : (isUrdu ? 'کوئی مماثلت نہیں' : 'No matching products')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50">
                    <th className="px-3 py-2.5 text-start text-[10px] font-bold text-gray-500 uppercase tracking-wider">#</th>
                    <th className="px-3 py-2.5 text-start text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isUrdu ? 'نام' : 'Name'}</th>
                    <th className="px-3 py-2.5 text-start text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isUrdu ? 'کمپنی' : 'Company'}</th>
                    <th className="px-3 py-2.5 text-end text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isUrdu ? 'کل اسٹاک' : 'Total Stock'}</th>
                    <th className="px-3 py-2.5 text-end text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isUrdu ? 'اوسط قیمت' : 'Avg Price'}</th>
                    <th className="px-3 py-2.5 text-end text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isUrdu ? 'کل قیمت' : 'Total Value'}</th>
                    <th className="px-3 py-2.5 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isUrdu ? 'ورژن' : 'Variants'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                    {filteredGroups.map((pg: any, idx: number) => (
                    <tr key={idx} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors cursor-pointer" onClick={() => { if (onSelectProduct) onSelectProduct(pg.name || pg._id); onClose(); }}>
                      <td className="px-3 py-2.5 text-gray-400 font-mono text-xs text-center">{idx + 1}</td>
                      <td className="px-3 py-2.5">
                        <span className="font-semibold text-gray-800 dark:text-white text-xs">{pg.name || pg._id}</span>
                        {pg.nameUrdu && pg.nameUrdu !== pg.name && <span className="text-[10px] text-gray-400 block">{pg.nameUrdu}</span>}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-300">{pg.company || '—'}</td>
                      <td className="px-3 py-2.5 text-end">
                        <span className={`font-bold text-xs ${(pg.totalStock || 0) <= 5 ? 'text-red-600' : 'text-gray-800 dark:text-white'}`}>{pg.totalStock || 0}</span>
                      </td>
                      <td className="px-3 py-2.5 text-end text-xs text-gray-600">Rs. {Math.round(pg.avgPrice || 0).toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-end">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">Rs. {Math.round(pg.totalValue || 0).toLocaleString()}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold">{pg.variantCount || 1}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductGroupsModal;