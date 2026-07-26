import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useSupplierStore } from '../../store/useSupplierStore';
import api from '../../utils/api';
import { useAuthStore } from '../../store/useAuthStore';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

interface ItemRow {
  id: string;
  productName: string;
  serialNumber: string;
  imei: string;
  chassisNo: string;
  engineNo: string;
  model: string;
  color: string;
  price: string;
}

const BulkPurchase: React.FC<Props> = ({ onClose, onSuccess }) => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const currentUser = useAuthStore(s => s.user);
  const { suppliers, fetchSuppliers, createPurchase } = useSupplierStore();

  const [supplierId, setSupplierId] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const supplierDropdownRef = useRef<HTMLDivElement>(null);
  const [paymentMode, setPaymentMode] = useState('cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState<ItemRow[]>([{ id: '1', productName: '', serialNumber: '', imei: '', chassisNo: '', engineNo: '', model: '', color: '', price: '' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchSuppliers(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (supplierDropdownRef.current && !supplierDropdownRef.current.contains(e.target as Node)) setShowSupplierDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch) return suppliers;
    const q = supplierSearch.toLowerCase();
    return suppliers.filter(s => s.name?.toLowerCase().includes(q) || s.phone?.includes(q) || s.company?.toLowerCase().includes(q));
  }, [suppliers, supplierSearch]);

  const selectedSupplier = suppliers.find(s => s.id === supplierId);

  const totalAmount = items.reduce((sum, i) => sum + (parseFloat(i.price) || 0), 0);

  const addRow = () => {
    setItems([...items, { id: Date.now().toString(), productName: '', serialNumber: '', imei: '', chassisNo: '', engineNo: '', model: '', color: '', price: '' }]);
  };

  const removeRow = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter(i => i.id !== id));
  };

  const updateRow = (id: string, field: keyof ItemRow, value: string) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) { setError(isUrdu ? 'سپلائر منتخب کریں' : 'Select a supplier'); return; }
    if (items.some(i => !i.productName)) { setError(isUrdu ? 'تمام پروڈکٹ کے نام درج کریں' : 'Enter all product names'); return; }
    
    setLoading(true); setError('');
    try {
      const payload = {
        supplierId,
        totalAmount,
        paidAmount: paymentMode === 'cash' ? totalAmount : parseFloat(paidAmount) || 0,
        remainingAmount: paymentMode === 'cash' ? 0 : totalAmount - (parseFloat(paidAmount) || 0),
        paymentMode,
        dueDate: paymentMode !== 'cash' ? dueDate || undefined : undefined,
        status: paymentMode === 'cash' ? 'completed' : 'pending',
        createdBy: currentUser?.displayName || currentUser?.username || '',
        items: items.map(i => ({
          productName: i.productName,
          serialNumber: i.serialNumber,
          imei: i.imei,
          chassisNo: i.chassisNo,
          engineNo: i.engineNo,
          model: i.model,
          color: i.color,
          price: parseFloat(i.price) || 0,
        })),
      };
      await createPurchase(payload);
      toast.success(isUrdu ? 'خریداری محفوظ ہو گئی' : 'Purchase saved');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || (isUrdu ? 'ناکام' : 'Failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto mx-2" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-gray-800 flex justify-between items-center px-4 sm:px-6 py-3 border-b border-gray-200 dark:border-gray-700 rounded-t-3xl z-10">
          <h2 className="text-lg sm:text-xl font-bold">{isUrdu ? 'بلک خریداری' : 'Bulk Purchase'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {/* Supplier Select */}
          <div ref={supplierDropdownRef} className="relative">
            <label className="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300">{isUrdu ? 'سپلائر' : 'Supplier'} *</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" /></svg>
              </div>
              <input type="text" placeholder={isUrdu ? 'سپلائر تلاش کریں...' : 'Search supplier...'}
                value={supplierSearch || (selectedSupplier && !showSupplierDropdown ? selectedSupplier.name : supplierSearch)}
                onChange={e => { setSupplierSearch(e.target.value); setShowSupplierDropdown(true); if (!e.target.value) setSupplierId(''); }}
                onFocus={() => { setShowSupplierDropdown(true); setSupplierSearch(''); }}
                className="w-full pl-10 pr-4 py-2.5 border rounded-xl bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
              {showSupplierDropdown && (
                <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-700 border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {filteredSuppliers.map(s => (
                    <button key={s.id} type="button" onClick={() => { setSupplierId(s.id); setSupplierSearch(''); setShowSupplierDropdown(false); }}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 border-b last:border-0">
                      <div className="font-semibold">{s.name}</div>
                      <div className="text-xs text-gray-500">{s.phone} {s.company ? `| ${s.company}` : ''}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{isUrdu ? 'آئٹمز' : 'Items'}</label>
              <button type="button" onClick={addRow} className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-xl hover:bg-emerald-700">+ Add Item</button>
            </div>
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-xs min-w-[900px]">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-2 py-2 text-start">Product Name *</th>
                    <th className="px-2 py-2 text-start">Serial</th>
                    <th className="px-2 py-2 text-start">IMEI</th>
                    <th className="px-2 py-2 text-start">Chassis</th>
                    <th className="px-2 py-2 text-start">Engine</th>
                    <th className="px-2 py-2 text-start">Model</th>
                    <th className="px-2 py-2 text-start">Color</th>
                    <th className="px-2 py-2 text-start">Price</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-blue-50/30">
                      <td className="px-2 py-1"><input type="text" value={item.productName} onChange={e => updateRow(item.id, 'productName', e.target.value)} className="w-full border rounded px-2 py-1.5 text-xs bg-white dark:bg-gray-700" placeholder="Product" /></td>
                      <td className="px-2 py-1"><input type="text" value={item.serialNumber} onChange={e => updateRow(item.id, 'serialNumber', e.target.value)} className="w-full border rounded px-2 py-1.5 text-xs bg-white dark:bg-gray-700" /></td>
                      <td className="px-2 py-1"><input type="text" value={item.imei} onChange={e => updateRow(item.id, 'imei', e.target.value)} className="w-full border rounded px-2 py-1.5 text-xs bg-white dark:bg-gray-700" /></td>
                      <td className="px-2 py-1"><input type="text" value={item.chassisNo} onChange={e => updateRow(item.id, 'chassisNo', e.target.value)} className="w-full border rounded px-2 py-1.5 text-xs bg-white dark:bg-gray-700" /></td>
                      <td className="px-2 py-1"><input type="text" value={item.engineNo} onChange={e => updateRow(item.id, 'engineNo', e.target.value)} className="w-full border rounded px-2 py-1.5 text-xs bg-white dark:bg-gray-700" /></td>
                      <td className="px-2 py-1"><input type="text" value={item.model} onChange={e => updateRow(item.id, 'model', e.target.value)} className="w-full border rounded px-2 py-1.5 text-xs bg-white dark:bg-gray-700" /></td>
                      <td className="px-2 py-1"><input type="text" value={item.color} onChange={e => updateRow(item.id, 'color', e.target.value)} className="w-full border rounded px-2 py-1.5 text-xs bg-white dark:bg-gray-700" /></td>
                      <td className="px-2 py-1"><input type="number" value={item.price} onChange={e => updateRow(item.id, 'price', e.target.value)} className="w-16 border rounded px-2 py-1.5 text-xs bg-white dark:bg-gray-700" placeholder="0" /></td>
                      <td className="px-2 py-1"><button type="button" onClick={() => removeRow(item.id)} className="text-red-500 hover:text-red-700 text-xs">✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-right mt-2 text-sm font-bold">Total: Rs. {totalAmount.toLocaleString()}</div>
          </div>

          {/* Payment Mode */}
          <div className="border-t pt-3">
            <label className="text-sm font-semibold mb-2 block text-gray-700 dark:text-gray-300">{isUrdu ? 'ادائیگی کی قسم' : 'Payment Mode'}</label>
            <div className="flex gap-4 mb-3">
              {['cash', 'hybrid', 'credit'].map(mode => (
                <label key={mode} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="paymentMode" value={mode} checked={paymentMode === mode} onChange={e => setPaymentMode(e.target.value)} />
                  <span className="text-sm capitalize">{mode}</span>
                </label>
              ))}
            </div>
            {paymentMode !== 'cash' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">{isUrdu ? 'ابھی ادا کی گئی رقم' : 'Paid Now'}</label>
                  <input type="number" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">{isUrdu ? 'بقایا کی تاریخ' : 'Due Date'}</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700" />
                </div>
              </div>
            )}
            {paymentMode !== 'cash' && (
              <div className="mt-2 text-sm text-gray-500">Remaining: Rs. {(totalAmount - (parseFloat(paidAmount) || 0)).toLocaleString()}</div>
            )}
          </div>

          {error && <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/30 p-3 rounded-xl">{error}</div>}

          <div className="flex justify-end gap-3 pt-2 border-t">
            <button type="button" onClick={onClose} className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm">{isUrdu ? 'منسوخ' : 'Cancel'}</button>
            <button type="submit" disabled={loading} className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
              {loading ? '...' : isUrdu ? 'محفوظ کریں' : 'Save Purchase'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkPurchase;