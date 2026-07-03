import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import { formatPhone } from '../../utils/helpers';

interface DashboardModalProps {
  title: string;
  endpoint: string;
  onClose: () => void;
  isUrdu: boolean;
}

type DataType = 'customers' | 'products' | 'inventory' | 'installments' | 'payments' | 'accounting' | 'unknown';

// Consistent name display logic used in both print and UI
const displayName = (item: any, isUrdu: boolean): string => {
  if (isUrdu) {
    return item.name_urdu || item.customer_urdu || item.customer_name || item.name || '—';
  }
  return item.customer_name || item.name || item.name_urdu || item.customer_urdu || '—';
};

const DashboardModal: React.FC<DashboardModalProps> = ({ title, endpoint, onClose, isUrdu }) => {
  const { t } = useTranslation();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Auto-detect data type based on endpoint and data fields
  const dataType: DataType = useMemo(() => {
    if (data.length === 0) return 'unknown';
    const first = data[0];

    // Check for accounting data first (revenue/profit objects)
    if (first._type === 'accounting') return 'accounting';

    // Check endpoint first
    if (endpoint.includes('/products')) return 'products';
    if (endpoint.includes('/inventory')) return 'inventory';
    if (endpoint.includes('/customers')) return 'customers';
    if (endpoint.includes('/installments') || endpoint.includes('/dashboard/today-due') || endpoint.includes('/dashboard/overdue') || endpoint.includes('/dashboard/monthly-due')) return 'installments';
    if (endpoint.includes('/payments')) return 'payments';

    // Auto-detect from fields - check installment-related fields first
    if (first.installment_no !== undefined || first.plan_id || first.due_date) return 'installments';
    if (first.customer_name || first.name_urdu || first.father_name || first.fatherName) return 'customers';
    if (first.product_name || first.item_name || first.category || first.stock !== undefined || first.quantity !== undefined || first.purchasePrice !== undefined) {
      if (first.phone === undefined && first.customer_name === undefined) return 'products';
    }
    if (first.transaction_date || first.payment_method) return 'payments';
    if (first.quantity !== undefined || first.purchase_price) return 'inventory';

    return 'unknown';
  }, [data, endpoint]);

  // 🔹 Inventory Grouping: group by product_id or name, sum quantity and total value
  const groupedData = useMemo(() => {
    if (dataType !== 'inventory') return data;

    const grouped = new Map<string, any>();
    data.forEach((item) => {
      const key = item.product_id || item.name || 'Unknown';
      if (!grouped.has(key)) {
        grouped.set(key, {
          name: item.name || item.product_name || item.item_name || 'Unknown',
          product_id: item.product_id,
          quantity: 0,
          purchase_price: item.purchasePrice || item.purchase_price || 0,
          total_value: 0,
          status: item.status,
          createdAt: item.createdAt || item.created_at || item.purchase_date,
          // store first item for reference
        });
      }
      const group = grouped.get(key);
      // if item has quantity field, use that, else count as 1
      const qty = item.quantity ?? 1;
      group.quantity += qty;
      const price = item.purchasePrice || item.purchase_price || 0;
      group.total_value += price * qty;
    });
    return Array.from(grouped.values());
  }, [data, dataType]);

  useEffect(() => {
    setLoading(true);
    setError('');
    api.get(endpoint)
      .then(res => {
        const d = res.data;
        let items: any[] = [];

        if (Array.isArray(d)) {
          items = d;
        } else if (d?.data && Array.isArray(d.data)) {
          items = d.data;
        } else if (d?.records && Array.isArray(d.records)) {
          items = d.records;
        } else if (d?.results && Array.isArray(d.results)) {
          items = d.results;
        } else if (d?.items && Array.isArray(d.items)) {
          items = d.items;
        } else if (d?.installments && Array.isArray(d.installments)) {
          items = d.installments;
        } else if (d?.payments && Array.isArray(d.payments)) {
          items = d.payments;
        } else if (d?.customers && Array.isArray(d.customers)) {
          items = d.customers;
        } else if (d?.products && Array.isArray(d.products)) {
          items = d.products;
        } else if (d?.inventory && Array.isArray(d.inventory)) {
          items = d.inventory;
        } else if (typeof d === 'object' && d !== null) {
          // Check for total-paid response: { total_paid, customers }
          if ('total_paid' in d && 'customers' in d) {
            // This is the total-paid endpoint response
            const totalPaid = d.total_paid || 0;
            const custList = Array.isArray(d.customers) ? d.customers : [];
            
            // Add a summary row
            items.push({
              _type: 'accounting',
              label: isUrdu ? 'کل ادا شدہ رقم' : 'Total Paid Amount',
              label_urdu: 'کل ادا شدہ رقم',
              amount: totalPaid,
              icon: 'paid'
            });
            
            // Add customer-wise rows
            custList.forEach((cust: any) => {
              items.push({
                _type: 'accounting',
                label: isUrdu ? (cust.customer_name_urdu || cust.customer_name) : (cust.customer_name || cust.customer_name_urdu),
                label_urdu: cust.customer_name_urdu || cust.customer_name,
                amount: cust.paid_amount || 0,
                icon: 'customer',
                customer_id: cust.customer_id,
                phone: cust.phone,
                father_name: cust.father_name,
                payment_count: cust.payment_count
              });
            });
          } else if ('pending_total' in d && 'customers' in d) {
            // This is the pending-total endpoint response
            const pendingTotal = d.pending_total || 0;
            const custList = Array.isArray(d.customers) ? d.customers : [];
            
            // Add a summary row
            items.push({
              _type: 'accounting',
              label: isUrdu ? 'کل بقایا رقم' : 'Total Pending Amount',
              label_urdu: 'کل بقایا رقم',
              amount: pendingTotal,
              icon: 'pending'
            });
            
            // Add customer-wise rows
            custList.forEach((cust: any) => {
              items.push({
                _type: 'accounting',
                label: isUrdu ? (cust.customer_name_urdu || cust.customer_name) : (cust.customer_name || cust.customer_name_urdu),
                label_urdu: cust.customer_name_urdu || cust.customer_name,
                amount: cust.pending_amount || 0,
                icon: 'customer',
                customer_id: cust.customer_id,
                phone: cust.phone,
                father_name: cust.father_name,
                installment_count: cust.installment_count
              });
            });
          } else if ('revenue' in d || 'profit' in d) {
            const rows: any[] = [];
            if (d.revenue !== undefined) {
              rows.push({
                _type: 'accounting',
                label: isUrdu ? 'آمدنی' : 'Revenue',
                label_urdu: 'آمدنی',
                amount: d.revenue,
                icon: 'revenue'
              });
            }
            if (d.profit !== undefined) {
              rows.push({
                _type: 'accounting',
                label: isUrdu ? 'منافع' : 'Profit',
                label_urdu: 'منافع',
                amount: d.profit,
                icon: 'profit'
              });
            }
            if (d.pending_total !== undefined) {
              rows.push({
                _type: 'accounting',
                label: isUrdu ? 'کل بقایا' : 'Total Pending',
                label_urdu: 'کل بقایا',
                amount: d.pending_total,
                icon: 'pending'
              });
            }
            if (rows.length > 0) {
              items = rows;
            }
          } else {
            const arrayField = Object.values(d).find(v => Array.isArray(v));
            if (arrayField) {
              items = arrayField as any[];
            }
          }
        }

        setData(items);
      })
      .catch(() => {
        setError(isUrdu ? 'ڈیٹا لوڈ کرنے میں ناکامی' : 'Failed to load data');
      })
      .finally(() => setLoading(false));
  }, [endpoint, isUrdu]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const getColumns = () => {
      switch (dataType) {
        case 'customers':
          return { headers: ['#', isUrdu ? 'نام' : 'Name', isUrdu ? 'والد' : 'Father', isUrdu ? 'فون' : 'Phone', isUrdu ? 'پتہ' : 'Address', isUrdu ? 'رقم' : 'Amount', isUrdu ? 'تاریخ' : 'Date'],
                   fields: ['name', 'father_name', 'phone', 'address', 'amount', 'date'] };
        case 'products':
          return { headers: ['#', isUrdu ? 'نام' : 'Name', isUrdu ? 'زمرہ' : 'Category', isUrdu ? 'اسٹاک' : 'Stock', isUrdu ? 'قیمت' : 'Price', isUrdu ? 'تاریخ' : 'Date'],
                   fields: ['name', 'category', 'stock', 'price', 'date'] };
        case 'inventory':
          return { headers: ['#', isUrdu ? 'نام' : 'Name', isUrdu ? 'مقدار' : 'Qty', isUrdu ? 'فی قیمت' : 'Unit Price', isUrdu ? 'کل قیمت' : 'Total Value', isUrdu ? 'حالت' : 'Status', isUrdu ? 'تاریخ' : 'Date'],
                   fields: ['name', 'quantity', 'price', 'total_value', 'status', 'date'] };
        case 'installments':
          return { headers: ['#', isUrdu ? 'نام' : 'Name', isUrdu ? 'والد' : 'Father', isUrdu ? 'فون' : 'Phone', isUrdu ? 'قسط' : 'Inst#', isUrdu ? 'کل رقم' : 'Total', isUrdu ? 'ادا شدہ' : 'Paid', isUrdu ? 'بقایا' : 'Pending', isUrdu ? 'باقی اقساط' : 'Remaining', isUrdu ? 'تاریخ' : 'Date', isUrdu ? 'حالت' : 'Status'],
                   fields: ['name', 'father_name', 'phone', 'installment_no', 'total_amount', 'paid_amount', 'pending_amount', 'remaining', 'date', 'status'] };
        case 'payments':
          return { headers: ['#', isUrdu ? 'گاہک' : 'Customer', isUrdu ? 'رقم' : 'Amount', isUrdu ? 'طریقہ' : 'Method', isUrdu ? 'حوالہ' : 'Ref#', isUrdu ? 'تاریخ' : 'Date'],
                   fields: ['name', 'amount', 'method', 'reference', 'date'] };
        default: {
          // For unknown type, dynamically detect available fields from data
          const sampleFields = data.length > 0 ? Object.keys(data[0]) : [];
          const hasFather = sampleFields.some(f => f.includes('father'));
          const hasPhone = sampleFields.some(f => f === 'phone' || f === 'customer_phone');
          const hasAddress = sampleFields.some(f => f.includes('address'));
          const hasStatus = sampleFields.some(f => f === 'paid' || f === 'status');
          const hasQty = sampleFields.some(f => f === 'quantity' || f === 'stock' || f === 'stockCount');
          const hasCategory = sampleFields.some(f => f === 'category');
          
          const headers = ['#', isUrdu ? 'نام' : 'Name'];
          const fields = ['name'];
          
          if (hasCategory) { headers.push(isUrdu ? 'زمرہ' : 'Category'); fields.push('category'); }
          if (hasFather) { headers.push(isUrdu ? 'والد' : 'Father'); fields.push('father_name'); }
          if (hasPhone) { headers.push(isUrdu ? 'فون' : 'Phone'); fields.push('phone'); }
          if (hasAddress) { headers.push(isUrdu ? 'پتہ' : 'Address'); fields.push('address'); }
          if (hasQty) { headers.push(isUrdu ? 'مقدار' : 'Qty'); fields.push('quantity'); }
          headers.push(isUrdu ? 'رقم' : 'Amount'); fields.push('amount');
          if (hasStatus) { headers.push(isUrdu ? 'حالت' : 'Status'); fields.push('status'); }
          headers.push(isUrdu ? 'تاریخ' : 'Date'); fields.push('date');
          
          return { headers, fields };
        }
      }
    };

    const cols = getColumns();
    // For inventory, use groupedData
    const printData = dataType === 'inventory' ? groupedData : data;
    const rows = printData.map((item: any, idx: number) => {
      const vals = cols.fields.map(f => {
        switch (f) {
          case 'name': return displayName(item, isUrdu);
          case 'father_name': return item.father_name || item.fatherName || '—';
          case 'phone': return item.phone || item.customer_phone || '—';
          case 'address': return isUrdu ? (item.address_urdu || item.address || '—') : (item.address || '—');
          case 'amount': return `Rs. ${Number(item.amount || item.total || item.pending_amount || item.price || item.purchase_price || 0).toLocaleString()}`;
          case 'date': return item.due_date ? new Date(item.due_date).toLocaleDateString() : item.date || item.createdAt || item.created_at ? new Date(item.createdAt || item.created_at || item.date).toLocaleDateString() : '—';
          case 'category': return item.category || '—';
          case 'stock': return String(item.stockCount ?? item.stock ?? item.quantity ?? item.current_stock ?? '—');
          case 'price': return `Rs. ${Number(item.price || item.purchase_price || item.selling_price || 0).toLocaleString()}`;
          case 'quantity': return String(item.quantity ?? item.stock ?? '—');
          case 'total_value': return `Rs. ${Number(item.total_value || 0).toLocaleString()}`;
          case 'total': return `Rs. ${Number((item.quantity || 0) * (item.purchase_price || 0)).toLocaleString()}`;
          case 'installment_no': return `${item.installment_no || '—'}/${item.total_installments || '—'}`;
          case 'total_amount': return `Rs. ${Number(item.total_amount || item.amount || 0).toLocaleString()}`;
          case 'paid_amount': return `Rs. ${Number(item.paid_amount || (item.paid ? item.amount : 0) || 0).toLocaleString()}`;
          case 'pending_amount': return `Rs. ${Number(item.pending_amount || (!item.paid ? item.amount : 0) || 0).toLocaleString()}`;
          case 'remaining': return String(item.remaining ?? '—');
          case 'status': return item.paid ? (isUrdu ? 'ادا شدہ' : 'Paid') : (isUrdu ? 'زیر التوا' : 'Pending');
          case 'method': return item.payment_method || item.method || '—';
          case 'reference': return item.reference_no || item.check_no || item.transaction_id || '—';
          default: return '—';
        }
      });
      return `<tr><td style="border:1px solid #e5e7eb;padding:6px 4px;text-align:center;font-size:11px;">${idx + 1}</td>${vals.map(v => `<td style="border:1px solid #e5e7eb;padding:6px 4px;font-size:11px;white-space:nowrap;">${v}</td>`).join('')}</tr>`;
    }).join('');

    printWindow.document.write(`
      <html>
      <head><title>${title}</title>
      <style>
        @page { size: landscape; margin: 8mm; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #1f2937; }
        h1 { text-align: center; font-size: 18px; font-weight: 700; margin-bottom: 15px; color: #111827; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { background: #1f2937; color: white; border:1px solid #374151; padding: 8px 6px; font-weight: 600; font-size: 10px; text-align: center; }
        td { border:1px solid #e5e7eb; padding: 6px 4px; }
        .footer { text-align: center; margin-top: 15px; font-size: 10px; color: #9ca3af; }
        @media print { body { padding: 10px; } }
      </style>
      </head>
      <body>
        <h1>${title}</h1>
        <table><thead><tr>${cols.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>
        <div class="footer">Rana Awais Autos and Electronics — ${new Date().toLocaleDateString()}</div>
        <script>window.onload=function(){setTimeout(function(){window.print();window.close()},300)}</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  // Render table rows based on detected data type
  const renderRows = () => {
    // For inventory, use groupedData
    const displayData = dataType === 'inventory' ? groupedData : data;
    return displayData.map((item: any, idx: number) => {
      switch (dataType) {
        // ========== CUSTOMERS ==========
        case 'customers':
          return (
            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
              <td className="px-4 py-3 text-gray-400 font-mono text-xs text-center">{idx + 1}</td>
              <td className="px-4 py-3">
                <div className="font-semibold text-gray-800 dark:text-white text-sm">
                  {displayName(item, isUrdu)}
                </div>
                {item.name_urdu && !isUrdu && (
                  <div className="text-[10px] text-gray-400 mt-0.5" dir="rtl">{item.name_urdu}</div>
                )}
              </td>
              <td className="px-4 py-3">
                <span className="text-xs text-gray-600 dark:text-gray-300">{item.father_name || item.fatherName || '—'}</span>
              </td>
              <td className="px-4 py-3">
                <span className="font-mono text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded">
                  {item.phone ? formatPhone(item.phone) : '—'}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="text-xs text-gray-500 dark:text-gray-400 max-w-[150px] block truncate" title={item.address || item.address_urdu}>
                  {isUrdu ? (item.address_urdu || item.address || '—') : (item.address || item.address_urdu || '—')}
                </span>
              </td>
              <td className="px-4 py-3 text-end">
                <span className="font-bold text-gray-800 dark:text-white text-sm whitespace-nowrap">
                  Rs. {Number(item.pending_amount || item.total_amount || 0).toLocaleString()}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded">
                  {item.created_at || item.createdAt ? new Date(item.created_at || item.createdAt).toLocaleDateString() : '—'}
                </span>
              </td>
            </tr>
          );

        // ========== PRODUCTS ==========
        case 'products':
          return (
            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
              <td className="px-4 py-3 text-gray-400 font-mono text-xs text-center">{idx + 1}</td>
              <td className="px-4 py-3">
                <div className="font-semibold text-gray-800 dark:text-white text-sm">
                  {isUrdu ? (item.name_urdu || item.name || '—') : (item.name || '—')}
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="text-xs text-gray-600 dark:text-gray-300">{item.category || '—'}</span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className={`text-xs font-semibold px-2 py-1 rounded ${(item.stockCount ?? item.stock ?? item.quantity ?? 0) <= 5 ? 'text-red-600 bg-red-50 dark:bg-red-900/30' : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30'}`}>
                  {item.stockCount ?? item.stock ?? item.quantity ?? item.current_stock ?? '—'}
                </span>
              </td>
              <td className="px-4 py-3 text-end">
                <span className="font-bold text-gray-800 dark:text-white text-sm whitespace-nowrap">
                  Rs. {Number(item.price || item.selling_price || 0).toLocaleString()}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded">
                  {item.createdAt || item.created_at ? new Date(item.createdAt || item.created_at).toLocaleDateString() : '—'}
                </span>
              </td>
            </tr>
          );

        // ========== INVENTORY (GROUPED) ==========
        case 'inventory':
          return (
            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
              <td className="px-4 py-3 text-gray-400 font-mono text-xs text-center">{idx + 1}</td>
              <td className="px-4 py-3">
                <div className="font-semibold text-gray-800 dark:text-white text-sm">
                  {isUrdu ? (item.name_urdu || item.name || '—') : (item.name || '—')}
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 px-2 py-1 rounded bg-gray-50 dark:bg-gray-700/50">
                  {item.quantity ?? 0}
                </span>
              </td>
              <td className="px-4 py-3 text-end">
                <span className="text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  Rs. {Number(item.purchase_price || 0).toLocaleString()}
                </span>
              </td>
              <td className="px-4 py-3 text-end">
                <span className="font-bold text-gray-800 dark:text-white text-sm whitespace-nowrap">
                  Rs. {Number(item.total_value || 0).toLocaleString()}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className="text-xs font-semibold px-2 py-1 rounded bg-gray-50 dark:bg-gray-700/50">
                  {item.status === 'in_stock' ? (isUrdu ? 'اسٹاک میں' : 'In Stock') : (isUrdu ? 'فروخت شدہ' : 'Sold')}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded">
                  {item.createdAt || item.created_at ? new Date(item.createdAt || item.created_at).toLocaleDateString() : '—'}
                </span>
              </td>
            </tr>
          );

        // ========== INSTALLMENTS ==========
        case 'installments': {
          const totalAmt = item.total_amount || item.amount || 0;
          const paidAmt = item.paid_amount || (item.paid ? item.amount : 0) || 0;
          const pendingAmt = item.pending_amount || (!item.paid ? item.amount : 0) || 0;
          const remaining = item.remaining ?? (item.total_installments ? item.total_installments - (item.paid_count || 0) : '—');
          const totalInst = item.total_installments ?? '—';
          return (
            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
              <td className="px-4 py-3 text-gray-400 font-mono text-xs text-center">{idx + 1}</td>
              <td className="px-4 py-3">
                <div className="font-semibold text-gray-800 dark:text-white text-sm">
                  {displayName(item, isUrdu)}
                </div>
                {item.father_name && (
                  <div className="text-[10px] text-gray-400 mt-0.5">{isUrdu ? 'والد: ' : 'Father: '}{item.father_name}</div>
                )}
              </td>
              <td className="px-4 py-3">
                <span className="text-xs text-gray-600 dark:text-gray-300">{item.father_name || '—'}</span>
              </td>
              <td className="px-4 py-3">
                <span className="font-mono text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded">
                  {item.phone ? formatPhone(item.phone) : '—'}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                  {item.installment_no || '—'}/{totalInst}
                </span>
              </td>
              <td className="px-4 py-3 text-end">
                <span className="font-bold text-gray-800 dark:text-white text-sm whitespace-nowrap">
                  Rs. {Number(totalAmt).toLocaleString()}
                </span>
              </td>
              <td className="px-4 py-3 text-end">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                  Rs. {Number(paidAmt).toLocaleString()}
                </span>
              </td>
              <td className="px-4 py-3 text-end">
                <span className="text-xs font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">
                  Rs. {Number(pendingAmt).toLocaleString()}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                  {remaining}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded">
                  {item.due_date ? new Date(item.due_date).toLocaleDateString() : (item.createdAt || item.created_at ? new Date(item.createdAt || item.created_at).toLocaleDateString() : '—')}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  item.paid
                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30'
                    : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${item.paid ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  {item.paid ? (isUrdu ? 'ادا شدہ' : 'Paid') : (isUrdu ? 'زیر التوا' : 'Pending')}
                </span>
              </td>
            </tr>
          );
        }

        // ========== ACCOUNTING (Revenue/Profit) ==========
        case 'accounting':
          return (
            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
              <td className="px-4 py-3 text-gray-400 font-mono text-xs text-center">{idx + 1}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${
                    item.icon === 'profit' 
                      ? 'bg-emerald-100 dark:bg-emerald-900/40' 
                      : item.icon === 'revenue'
                      ? 'bg-blue-100 dark:bg-blue-900/40'
                      : item.icon === 'paid'
                      ? 'bg-green-100 dark:bg-green-900/40'
                      : 'bg-amber-100 dark:bg-amber-900/40'
                  }`}>
                    {item.icon === 'profit' ? (
                      <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    ) : item.icon === 'revenue' ? (
                      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : item.icon === 'paid' ? (
                      <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <span className="font-semibold text-gray-800 dark:text-white text-sm">
                    {isUrdu ? (item.label_urdu || item.label) : item.label}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-end">
                <span className={`text-lg font-bold ${
                  item.icon === 'profit' 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : item.icon === 'paid'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-900 dark:text-white'
                }`}>
                  Rs. {Number(item.amount || 0).toLocaleString()}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className="text-xs text-gray-400">
                  {new Date().toLocaleDateString()}
                </span>
              </td>
            </tr>
          );

        // ========== PAYMENTS ==========
        case 'payments':
          return (
            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
              <td className="px-4 py-3 text-gray-400 font-mono text-xs text-center">{idx + 1}</td>
              <td className="px-4 py-3">
                <div className="font-semibold text-gray-800 dark:text-white text-sm">
                  {displayName(item, isUrdu)}
                </div>
                {item.customer_phone && (
                  <div className="text-[10px] text-gray-400 mt-0.5">{item.customer_phone}</div>
                )}
              </td>
              <td className="px-4 py-3 text-end">
                <span className="font-bold text-gray-800 dark:text-white text-sm whitespace-nowrap">
                  Rs. {Number(item.amount || 0).toLocaleString()}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                  {item.payment_method || item.method || (isUrdu ? 'نقد' : 'Cash')}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded">
                  {item.reference_no || item.check_no || item.transaction_id || '—'}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded">
                  {item.transaction_date ? new Date(item.transaction_date).toLocaleDateString() : (item.createdAt || item.created_at ? new Date(item.createdAt || item.created_at).toLocaleDateString() : '—')}
                </span>
              </td>
            </tr>
          );

        // ========== UNKNOWN / DEFAULT ==========
        default:
          return (
            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
              <td className="px-4 py-3 text-gray-400 font-mono text-xs text-center">{idx + 1}</td>
              <td className="px-4 py-3">
                <span className="text-sm text-gray-800 dark:text-white">
                  {item.name || item.customer_name || item.product_name || item.item_name || '—'}
                </span>
              </td>
              <td className="px-4 py-3 text-end">
                <span className="font-bold text-gray-800 dark:text-white text-sm">
                  Rs. {Number(item.amount || item.total || item.price || 0).toLocaleString()}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {item.createdAt || item.created_at ? new Date(item.createdAt || item.created_at).toLocaleDateString() : '—'}
                </span>
              </td>
            </tr>
          );
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col border border-gray-200 dark:border-gray-700"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <svg className="w-5 h-5 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {dataType === 'inventory' ? groupedData.length : data.length} {isUrdu ? 'ریکارڈز' : 'records'} — {dataType}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!loading && ((dataType === 'inventory' ? groupedData.length : data.length) > 0) && (
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-xs font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-200"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                {isUrdu ? 'پرنٹ' : 'Print'}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
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
            </div>
          ) : (dataType === 'inventory' ? groupedData.length : data.length) === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-400 font-medium">{isUrdu ? 'کوئی ڈیٹا نہیں' : 'No data found'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50">
                    <th className="px-4 py-3 text-start text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider w-10">#</th>
                    {dataType === 'customers' && (
                      <>
                        <th className="px-4 py-3 text-start text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'نام' : 'Name'}</th>
                        <th className="px-4 py-3 text-start text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'والد' : 'Father'}</th>
                        <th className="px-4 py-3 text-start text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'فون' : 'Phone'}</th>
                        <th className="px-4 py-3 text-start text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'پتہ' : 'Address'}</th>
                        <th className="px-4 py-3 text-end text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'رقم' : 'Amount'}</th>
                        <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'تاریخ' : 'Date'}</th>
                      </>
                    )}
                    {dataType === 'products' && (
                      <>
                        <th className="px-4 py-3 text-start text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'نام' : 'Name'}</th>
                        <th className="px-4 py-3 text-start text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'زمرہ' : 'Category'}</th>
                        <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'اسٹاک' : 'Stock'}</th>
                        <th className="px-4 py-3 text-end text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'قیمت' : 'Price'}</th>
                        <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'تاریخ' : 'Date'}</th>
                      </>
                    )}
                    {dataType === 'inventory' && (
                      <>
                        <th className="px-4 py-3 text-start text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'نام' : 'Name'}</th>
                        <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'مقدار' : 'Qty'}</th>
                        <th className="px-4 py-3 text-end text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'فی قیمت' : 'Unit Price'}</th>
                        <th className="px-4 py-3 text-end text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'کل قیمت' : 'Total Value'}</th>
                        <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'حالت' : 'Status'}</th>
                        <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'تاریخ' : 'Date'}</th>
                      </>
                    )}
                    {dataType === 'installments' && (
                      <>
                        <th className="px-4 py-3 text-start text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'نام' : 'Name'}</th>
                        <th className="px-4 py-3 text-start text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'والد' : 'Father'}</th>
                        <th className="px-4 py-3 text-start text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'فون' : 'Phone'}</th>
                        <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'قسط#' : 'Inst#'}</th>
                        <th className="px-4 py-3 text-end text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'کل رقم' : 'Total'}</th>
                        <th className="px-4 py-3 text-end text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'ادا شدہ' : 'Paid'}</th>
                        <th className="px-4 py-3 text-end text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'بقایا' : 'Pending'}</th>
                        <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'باقی اقساط' : 'Remaining'}</th>
                        <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'تاریخ' : 'Date'}</th>
                        <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'حالت' : 'Status'}</th>
                      </>
                    )}
                    {dataType === 'payments' && (
                      <>
                        <th className="px-4 py-3 text-start text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'نام' : 'Name'}</th>
                        <th className="px-4 py-3 text-end text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'رقم' : 'Amount'}</th>
                        <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'طریقہ' : 'Method'}</th>
                        <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'حوالہ#' : 'Ref#'}</th>
                        <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'تاریخ' : 'Date'}</th>
                      </>
                    )}
                    {dataType === 'accounting' && (
                      <>
                        <th className="px-4 py-3 text-start text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'تفصیل' : 'Detail'}</th>
                        <th className="px-4 py-3 text-end text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'رقم' : 'Amount'}</th>
                        <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'تاریخ' : 'Date'}</th>
                      </>
                    )}
                    {dataType === 'unknown' && (
                      <>
                        <th className="px-4 py-3 text-start text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'نام' : 'Name'}</th>
                        <th className="px-4 py-3 text-end text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'رقم' : 'Amount'}</th>
                        <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'تاریخ' : 'Date'}</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {renderRows()}
                  {/* For inventory, show total summary row */}
                  {dataType === 'inventory' && groupedData.length > 0 && (
                    <tr className="bg-gray-100 dark:bg-gray-700/50 font-bold">
                      <td colSpan={3} className="px-4 py-3 text-end text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400">
                        {isUrdu ? 'کل' : 'Total'}
                      </td>
                      <td className="px-4 py-3 text-end">
                        <span className="text-sm font-extrabold text-gray-900 dark:text-white">
                          Rs. {groupedData.reduce((acc, cur) => acc + (cur.total_value || 0), 0).toLocaleString()}
                        </span>
                      </td>
                      <td colSpan={2} />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardModal;