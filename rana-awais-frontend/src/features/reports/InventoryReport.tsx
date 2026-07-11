import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import { useAuthStore } from '../../store/useAuthStore';
import { useClientStore } from '../../store/useClientStore';

const InventoryReport: React.FC = () => {
  const { i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const currentUser = useAuthStore(s => s.user);
  const clientInfo = useClientStore(s => s.info);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const PER_PAGE = 25;
  useEffect(() => {
    document.title = `${isUrdu ? 'انوینٹری رپورٹ' : 'Inventory Report'} | ${clientInfo.name}`;
  }, [isUrdu, clientInfo.name]);

  useEffect(() => { fetchInventory(); }, []);

  const fetchInventory = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/products?limit=200');
      const d = res.data;
      let list: any[] = [];
      if (Array.isArray(d)) list = d;
      else if (d?.data && Array.isArray(d.data)) list = d.data;
      else if (d?.products && Array.isArray(d.products)) list = d.products;
      // Map products to inventory-style format
      list = list.map((p: any) => ({
        productId: p.id || p._id,
        product_name: p.name || p.product_name,
        product_name_urdu: p.name_urdu || p.nameUrdu,
        company: p.company || '',
        model: p.model || '',
        status: 'in_stock',
        quantity: p.stock_count || p.stockCount || p.quantity || 0,
        purchase_price: p.purchase_price || p.purchasePrice || p.price || 0,
        sellingPrice: p.price || p.selling_price || p.sellingPrice || 0,
      }));
      setItems(list);
    } catch (err) {
      setError(isUrdu ? 'انوینٹری ڈیٹا لوڈ کرنے میں ناکامی' : 'Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Group items by product
  const productGroups = useMemo(() => {
    const groups: Record<string, any> = {};
    
    items.forEach(item => {
      const pid = item.productId || 'unknown';
      if (!groups[pid]) {
        groups[pid] = {
          productId: pid,
          product_name: item.product_name || '',
          product_name_urdu: item.product_name_urdu || '',
          company: item.company || '',
          model: item.model || '',
          totalItems: 0,
          inStock: 0,
          sold: 0,
          returned: 0,
          totalValue: 0,
          sellingPrice: item.purchase_price || 0,
        };
      }
      groups[pid].totalItems++;
      if (item.status === 'in_stock') groups[pid].inStock++;
      else if (item.status === 'sold') groups[pid].sold++;
      else if (item.status === 'returned') groups[pid].returned++;
      groups[pid].totalValue += (item.purchase_price || 0) * (item.quantity || 1);
    });
    
    return Object.values(groups);
  }, [items]);

  const filteredProducts = useMemo(() => {
    let data = [...productGroups];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(p =>
        (p.product_name || '').toLowerCase().includes(q) ||
        (p.product_name_urdu || '').includes(q) ||
        (p.company || '').toLowerCase().includes(q) ||
        (p.model || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      if (statusFilter === 'in_stock') data = data.filter(p => p.inStock > 0);
      else if (statusFilter === 'sold') data = data.filter(p => p.sold > 0);
      else if (statusFilter === 'returned') data = data.filter(p => p.returned > 0);
    }
    return data;
  }, [productGroups, search, statusFilter]);

  const totalValue = useMemo(() => {
    return filteredProducts.reduce((sum, p) => sum + p.totalValue, 0);
  }, [filteredProducts]);

  const inStockCount = useMemo(() => {
    return productGroups.reduce((sum, p) => sum + p.inStock, 0);
  }, [productGroups]);

  const soldCount = useMemo(() => {
    return productGroups.reduce((sum, p) => sum + p.sold, 0);
  }, [productGroups]);


  // ✅ Product-wise grouped print
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rows = filteredProducts.map((p, idx) => `
      <tr>
        <td style="border:1px solid #e5e7eb;padding:6px;text-align:center;">${idx + 1}</td>
        <td style="border:1px solid #e5e7eb;padding:6px;">${isUrdu && p.product_name_urdu ? p.product_name_urdu : p.product_name || '—'}</td>
        <td style="border:1px solid #e5e7eb;padding:6px;text-align:center;">${p.totalItems}</td>
        <td style="border:1px solid #e5e7eb;padding:6px;text-align:center;">${p.inStock}</td>
        <td style="border:1px solid #e5e7eb;padding:6px;text-align:center;">${p.sold}</td>
        <td style="border:1px solid #e5e7eb;padding:6px;text-align:right;">Rs. ${(p.sellingPrice || 0).toLocaleString()}</td>
        <td style="border:1px solid #e5e7eb;padding:6px;text-align:right;">Rs. ${(p.totalValue || 0).toLocaleString()}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
      <head><title>${isUrdu ? 'انوینٹری رپورٹ' : 'Inventory Report'}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1f2937; }
        h1 { text-align: center; font-size: 20px; font-weight: 700; margin-bottom: 5px; color: #111827; }
        .subtitle { text-align: center; font-size: 12px; color: #6b7280; margin-bottom: 20px; }
        .summary { display: flex; justify-content: center; gap: 30px; margin-bottom: 20px; }
        .summary-item { text-align: center; }
        .summary-item .label { font-size: 11px; color: #6b7280; }
        .summary-item .value { font-size: 16px; font-weight: 700; color: #111827; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #f3f4f6; border:1px solid #e5e7eb; padding: 8px 6px; font-weight: 600; color: #374151; font-size: 11px; }
        td { border:1px solid #e5e7eb; padding: 6px; }
        .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #9ca3af; }
        @media print { body { padding: 15px; } }
      </style>
      </head>
      <body>
        <h1>${clientInfo.name}</h1>
        <div class="subtitle">${isUrdu ? 'انوینٹری رپورٹ' : 'Inventory Report'} — ${new Date().toLocaleDateString()}</div>
        <div class="summary">
          <div class="summary-item"><div class="label">${isUrdu ? 'کل پروڈکٹس' : 'Total Products'}</div><div class="value">${filteredProducts.length}</div></div>
          <div class="summary-item"><div class="label">${isUrdu ? 'اسٹاک میں' : 'In Stock'}</div><div class="value">${inStockCount}</div></div>
          <div class="summary-item"><div class="label">${isUrdu ? 'فروخت شدہ' : 'Sold'}</div><div class="value">${soldCount}</div></div>
          <div class="summary-item"><div class="label">${isUrdu ? 'کل قیمت' : 'Total Value'}</div><div class="value">Rs. ${totalValue.toLocaleString()}</div></div>
        </div>
        <table>
          <thead><tr>
            <th>#</th><th>${isUrdu ? 'پروڈکٹ' : 'Product'}</th>
            <th>${isUrdu ? 'کل' : 'Total'}</th>
            <th>${isUrdu ? 'اسٹاک' : 'Stock'}</th>
            <th>${isUrdu ? 'فروخت' : 'Sold'}</th>
            <th>${isUrdu ? 'فی قیمت' : 'Unit Price'}</th>
            <th>${isUrdu ? 'کل قیمت' : 'Total Value'}</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer">
          ${isUrdu ? (clientInfo.nameUr || clientInfo.name) : clientInfo.name} — ${isUrdu ? 'پرنٹ کی تاریخ' : 'Print Date'}: ${new Date().toLocaleDateString()} | ${isUrdu ? 'تیار کردہ' : 'Generated By'}: ${currentUser?.displayName || currentUser?.username || '—'}
        </div>
        <script>window.onload=function(){setTimeout(function(){window.print();window.close()},300)}</script>
      </body></html>
    `);
    printWindow.document.close();
  };


  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 pb-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight">
            {isUrdu ? 'انوینٹری رپورٹ' : 'Inventory Report'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isUrdu ? 'اسٹاک اور قیمتوں کی مکمل رپورٹ' : 'Complete stock and pricing report'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            disabled={filteredProducts.length === 0}
            className="px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            {isUrdu ? 'پرنٹ کریں' : 'Print'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {isUrdu ? 'کل آئٹمز' : 'Total Items'}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{items.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {isUrdu ? 'اسٹاک میں' : 'In Stock'}
          </p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{inStockCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {isUrdu ? 'فروخت شدہ' : 'Sold'}
          </p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{soldCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {isUrdu ? 'کل قیمت' : 'Total Value'}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">Rs. {totalValue.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={isUrdu ? 'پروڈکٹ، سیریل، کمپنی تلاش کریں...' : 'Search product, serial, company...'}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent outline-none transition-colors"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-gray-400 outline-none transition-colors"
          >
            <option value="all">{isUrdu ? 'تمام حالتیں' : 'All Status'}</option>
            <option value="in_stock">{isUrdu ? 'اسٹاک میں' : 'In Stock'}</option>
            <option value="sold">{isUrdu ? 'فروخت شدہ' : 'Sold'}</option>
            <option value="returned">{isUrdu ? 'واپس شدہ' : 'Returned'}</option>
          </select>
        </div>
      </div>

      {/* Report Content */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Print Header */}
        <div className="hidden print:block text-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{clientInfo.name}</h2>
          <p className="text-sm text-gray-500">{isUrdu ? 'انوینٹری رپورٹ' : 'Inventory Report'}</p>
          <p className="text-xs text-gray-400">{new Date().toLocaleDateString()}</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-10 h-10 border-4 border-gray-900 dark:border-white border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400">{isUrdu ? 'لوڈ ہو رہا ہے...' : 'Loading...'}</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-full">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-red-500 font-medium">{error}</p>
            <button onClick={fetchInventory} className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm">
              {isUrdu ? 'دوبارہ کوشش کریں' : 'Retry'}
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (

          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-gray-400 font-medium">{isUrdu ? 'کوئی انوینٹری نہیں' : 'No inventory items found'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-4 py-3.5 text-start text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
                  <th className="px-4 py-3.5 text-start text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {isUrdu ? 'پروڈکٹ' : 'Product'}
                  </th>
                  <th className="px-4 py-3.5 text-start text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {isUrdu ? 'کمپنی' : 'Company'}
                  </th>
                  <th className="px-4 py-3.5 text-start text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {isUrdu ? 'ماڈل' : 'Model'}
                  </th>
                  <th className="px-4 py-3.5 text-center text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {isUrdu ? 'کل' : 'Total'}
                  </th>
                  <th className="px-4 py-3.5 text-center text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {isUrdu ? 'اسٹاک' : 'Stock'}
                  </th>
                  <th className="px-4 py-3.5 text-center text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {isUrdu ? 'فروخت' : 'Sold'}
                  </th>
                  <th className="px-4 py-3.5 text-end text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {isUrdu ? 'کل قیمت' : 'Total Value'}
                  </th>

                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {filteredProducts.map((p, idx) => (
                  <tr key={p.productId} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{String(idx + 1).padStart(2, '0')}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gray-800 dark:text-white">
                        {isUrdu && p.product_name_urdu ? p.product_name_urdu : p.product_name || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{p.company || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{p.model || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold text-gray-800 dark:text-white">{p.totalItems}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        {p.inStock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                        {p.sold}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-end">
                      <span className="font-bold text-gray-800 dark:text-white">
                        Rs. {(p.totalValue || 0).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                ))}

              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryReport;