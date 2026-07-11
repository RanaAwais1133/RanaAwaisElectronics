import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { APP_CONFIG } from '../../config/app';
import { useClientStore } from '../../store/useClientStore';

// ✅ Phone Entry - Name + Number
interface PhoneEntry {
  name: string;
  number: string;
}

// ✅ Client Info Interface
interface ClientInfo {
  name: string;
  nameUr: string;
  branch: string;
  branchUr: string;
  address: string;
  addressUr: string;
  phones: PhoneEntry[];
  email: string;
  softwareBy: string;
  softwareByUr: string;
  invoiceNote: string;
  invoiceNoteUr: string;
  serviceNote: string;
  serviceNoteUr: string;
}

// ✅ Default empty phone
const emptyPhone = (): PhoneEntry => ({ name: '', number: '' });

// ✅ Parse old format (string[]) to new format (PhoneEntry[])
const parsePhones = (phones: any): PhoneEntry[] => {
  if (!phones || !Array.isArray(phones)) return [emptyPhone()];
  
  // ✅ Already new format (array of objects with name/number)
  if (phones.length > 0 && typeof phones[0] === 'object' && phones[0] !== null) {
    return phones.map((p: any) => ({
      name: p.name || '',
      number: p.number || '',
    }));
  }
  
  // ✅ Old format (array of strings like "0324-9959800")
  return phones.map((p: string) => ({
    name: '',
    number: p || '',
  }));
};

// ✅ Format phones for display
const formatPhones = (phones: PhoneEntry[]): string => {
  return phones
    .filter(p => p.number.trim())
    .map(p => p.name.trim() ? `${p.name}: ${p.number}` : p.number)
    .join(' | ');
};

const ClientInfoSettings: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveToBackend = useClientStore((s) => s.saveToBackend);
  const [info, setInfo] = useState<ClientInfo>({
    name: APP_CONFIG.companyName,
    nameUr: APP_CONFIG.companyNameUr,
    branch: APP_CONFIG.branchName,
    branchUr: APP_CONFIG.branchNameUr,
    address: APP_CONFIG.address,
    addressUr: APP_CONFIG.addressUr,
    phones: parsePhones(APP_CONFIG.phones),
    email: '',
    softwareBy: APP_CONFIG.softwareBy,
    softwareByUr: APP_CONFIG.softwareByUr,
    invoiceNote: APP_CONFIG.invoiceNote,
    invoiceNoteUr: APP_CONFIG.invoiceNoteUr,
    serviceNote: APP_CONFIG.serviceNote,
    serviceNoteUr: APP_CONFIG.serviceNoteUr,
  });

  // ✅ Load saved info from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('clientInfo');
      if (saved) {
        const parsed = JSON.parse(saved);
        setInfo(prev => ({
          ...prev,
          ...parsed,
          phones: parsePhones(parsed.phones || prev.phones),
        }));
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // ✅ Save to Backend API + localStorage (sync across all users)
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // ✅ Save to Backend API (MongoDB) - sab users k liye same ho jayega
      await saveToBackend(info);

      // ✅ Update APP_CONFIG dynamically for local fallback
      (APP_CONFIG as any).companyName = info.name;
      (APP_CONFIG as any).companyNameUr = info.nameUr;
      (APP_CONFIG as any).branchName = info.branch;
      (APP_CONFIG as any).branchNameUr = info.branchUr;
      (APP_CONFIG as any).address = info.address;
      (APP_CONFIG as any).addressUr = info.addressUr;
      (APP_CONFIG as any).phones = info.phones.map(p => p.number);
      (APP_CONFIG as any).email = info.email;
      (APP_CONFIG as any).softwareBy = info.softwareBy;
      (APP_CONFIG as any).softwareByUr = info.softwareByUr;
      (APP_CONFIG as any).invoiceNote = info.invoiceNote;
      (APP_CONFIG as any).invoiceNoteUr = info.invoiceNoteUr;
      (APP_CONFIG as any).serviceNote = info.serviceNote;
      (APP_CONFIG as any).serviceNoteUr = info.serviceNoteUr;

      // ✅ Update document title
      document.title = `${info.name} - ERP System`;

      toast.success(isUrdu ? '✅ کلائنٹ کی معلومات آن لائن محفوظ ہو گئیں' : '✅ Client information saved online');
      setIsEditing(false);
    } catch (err) {
      toast.error(isUrdu ? '❌ آن لائن محفوظ کرنے میں ناکامی، لوکل طور پر محفوظ ہو گئی' : '❌ Failed to save online, saved locally');
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ Handle phone name change
  const handlePhoneNameChange = (index: number, value: string) => {
    const newPhones = [...info.phones];
    newPhones[index] = { ...newPhones[index], name: value };
    setInfo({ ...info, phones: newPhones });
  };

  // ✅ Handle phone number change
  const handlePhoneNumberChange = (index: number, value: string) => {
    const newPhones = [...info.phones];
    newPhones[index] = { ...newPhones[index], number: value };
    setInfo({ ...info, phones: newPhones });
  };

  // ✅ Add phone
  const addPhone = () => {
    setInfo({ ...info, phones: [...info.phones, emptyPhone()] });
  };

  // ✅ Remove phone
  const removePhone = (index: number) => {
    if (info.phones.length <= 1) return;
    const newPhones = info.phones.filter((_, i) => i !== index);
    setInfo({ ...info, phones: newPhones });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 overflow-hidden">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
            <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                  {isUrdu ? '🏪 کلائنٹ کی معلومات' : '🏪 Client Information'}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {isUrdu ? 'اپنی دکان / کاروبار کی معلومات سیٹ کریں - یہ سب جگہ نظر آئے گی' : 'Set your shop/business information - it will appear everywhere'}
                </p>
              </div>
              <button
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                disabled={isSaving}
                className={`px-5 py-2.5 rounded-2xl text-sm font-semibold shadow-lg transition-all active:scale-95 whitespace-nowrap ${
                  isEditing
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-emerald-500/25'
                    : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-indigo-500/25'
                }`}
              >
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    {isUrdu ? 'محفوظ ہو رہا ہے...' : 'Saving...'}
                  </span>
                ) : isEditing ? (
                  isUrdu ? '💾 محفوظ کریں' : '💾 Save'
                ) : (
                  isUrdu ? '✏️ ترمیم کریں' : '✏️ Edit'
                )}
              </button>
            </div>

            {isEditing && (
              <div className="mt-5 border-t border-gray-200 dark:border-gray-700 pt-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ✅ Company Name (English) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {isUrdu ? 'کاروبار کا نام (انگریزی)' : 'Business Name (English)'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={info.name}
                      onChange={(e) => setInfo({ ...info, name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                      placeholder="Rana Awais Electronics"
                    />
                  </div>

                  {/* ✅ Company Name (Urdu) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {isUrdu ? 'کاروبار کا نام (اردو)' : 'Business Name (Urdu)'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={info.nameUr}
                      onChange={(e) => setInfo({ ...info, nameUr: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                      placeholder="رانا اویس الیکٹرانکس"
                      dir="rtl"
                    />
                  </div>

                  {/* ✅ Branch (English) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {isUrdu ? 'برانچ (انگریزی)' : 'Branch (English)'}
                    </label>
                    <input
                      type="text"
                      value={info.branch}
                      onChange={(e) => setInfo({ ...info, branch: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                      placeholder="Main"
                    />
                  </div>

                  {/* ✅ Branch (Urdu) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {isUrdu ? 'برانچ (اردو)' : 'Branch (Urdu)'}
                    </label>
                    <input
                      type="text"
                      value={info.branchUr}
                      onChange={(e) => setInfo({ ...info, branchUr: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                      placeholder="مین"
                      dir="rtl"
                    />
                  </div>

                  {/* ✅ Address (English) */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {isUrdu ? 'پتہ (انگریزی)' : 'Address (English)'}
                    </label>
                    <textarea
                      value={info.address}
                      onChange={(e) => setInfo({ ...info, address: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                      rows={2}
                      placeholder="Behari Colony, Disposal Chowk, Gujranwala"
                    />
                  </div>

                  {/* ✅ Address (Urdu) */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {isUrdu ? 'پتہ (اردو)' : 'Address (Urdu)'}
                    </label>
                    <textarea
                      value={info.addressUr}
                      onChange={(e) => setInfo({ ...info, addressUr: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                      rows={2}
                      placeholder="بہاری کالونی، ڈسپوزل چوک، گوجرانوالہ"
                      dir="rtl"
                    />
                  </div>

                  {/* ✅ Phone Numbers - Name + Number */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {isUrdu ? '📞 فون نمبرز (نام + نمبر)' : '📞 Phone Numbers (Name + Number)'}
                    </label>
                    {info.phones.map((phone, index) => (
                      <div key={index} className="flex gap-2 mb-2 items-start">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={phone.name}
                            onChange={(e) => handlePhoneNameChange(index, e.target.value)}
                            className="w-full px-4 py-2.5 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                            placeholder={isUrdu ? 'نام (مثلاً: رانا اویس)' : 'Name (e.g. Rana Awais)'}
                          />
                          <input
                            type="text"
                            value={phone.number}
                            onChange={(e) => handlePhoneNumberChange(index, e.target.value)}
                            className="w-full px-4 py-2.5 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                            placeholder={isUrdu ? 'نمبر (مثلاً: 0324-9959800)' : 'Number (e.g. 0324-9959800)'}
                          />
                        </div>
                        <button
                          onClick={() => removePhone(index)}
                          className="px-3 py-2.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex-shrink-0"
                          title={isUrdu ? 'حذف کریں' : 'Remove'}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={addPhone}
                      className="mt-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      + {isUrdu ? 'فون نمبر شامل کریں' : 'Add Phone'}
                    </button>
                  </div>

                  {/* ✅ Email */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {isUrdu ? '📧 ای میل' : '📧 Email'}
                    </label>
                    <input
                      type="email"
                      value={info.email}
                      onChange={(e) => setInfo({ ...info, email: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                      placeholder="info@ranaawais.com"
                    />
                  </div>

                  {/* ✅ Software By (English) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {isUrdu ? 'سافٹ ویئر بذریعہ (انگریزی)' : 'Software By (English)'}
                    </label>
                    <input
                      type="text"
                      value={info.softwareBy}
                      onChange={(e) => setInfo({ ...info, softwareBy: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                      placeholder="Huzaifa (0313-6487199)"
                    />
                  </div>

                  {/* ✅ Software By (Urdu) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {isUrdu ? 'سافٹ ویئر بذریعہ (اردو)' : 'Software By (Urdu)'}
                    </label>
                    <input
                      type="text"
                      value={info.softwareByUr}
                      onChange={(e) => setInfo({ ...info, softwareByUr: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                      placeholder="حذیفہ (0313-6487199)"
                      dir="rtl"
                    />
                  </div>

                  {/* ✅ Invoice Note (English) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {isUrdu ? 'انوائس نوٹ (انگریزی)' : 'Invoice Note (English)'}
                    </label>
                    <input
                      type="text"
                      value={info.invoiceNote}
                      onChange={(e) => setInfo({ ...info, invoiceNote: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                      placeholder="Note: All details are correct"
                    />
                  </div>

                  {/* ✅ Invoice Note (Urdu) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {isUrdu ? 'انوائس نوٹ (اردو)' : 'Invoice Note (Urdu)'}
                    </label>
                    <input
                      type="text"
                      value={info.invoiceNoteUr}
                      onChange={(e) => setInfo({ ...info, invoiceNoteUr: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                      placeholder="نوٹ: مذکورہ بالا تفصیلات درست ہیں"
                      dir="rtl"
                    />
                  </div>

                  {/* ✅ Service Note (English) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {isUrdu ? 'سروس نوٹ (انگریزی)' : 'Service Note (English)'}
                    </label>
                    <input
                      type="text"
                      value={info.serviceNote}
                      onChange={(e) => setInfo({ ...info, serviceNote: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                      placeholder="Service charges include advance only"
                    />
                  </div>

                  {/* ✅ Service Note (Urdu) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {isUrdu ? 'سروس نوٹ (اردو)' : 'Service Note (Urdu)'}
                    </label>
                    <input
                      type="text"
                      value={info.serviceNoteUr}
                      onChange={(e) => setInfo({ ...info, serviceNoteUr: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm"
                      placeholder="سروس چارجز میں صرف ایڈوانس شامل ہے"
                      dir="rtl"
                    />
                  </div>
                </div>

                {/* ✅ Preview Section */}
                <div className="mt-6 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl border border-indigo-200 dark:border-indigo-800">
                  <h3 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-3">
                    {isUrdu ? '👁️ پیش منظر - یوں نظر آئے گا' : '👁️ Preview - How it will look'}
                  </h3>
                  <div className="text-sm space-y-1.5">
                    <p className="font-bold text-lg text-gray-800 dark:text-white">{info.name}</p>
                    <p className="font-bold text-lg text-gray-800 dark:text-white" dir="rtl">{info.nameUr}</p>
                    <p className="text-gray-600 dark:text-gray-400">{info.branch} {isUrdu ? 'برانچ' : 'Branch'}</p>
                    <p className="text-gray-600 dark:text-gray-400">{info.address}</p>
                    <p className="text-gray-600 dark:text-gray-400" dir="rtl">{info.addressUr}</p>
                    <p className="text-gray-600 dark:text-gray-400">
                      {formatPhones(info.phones)}
                    </p>
                    {info.email && (
                      <p className="text-gray-600 dark:text-gray-400">📧 {info.email}</p>
                    )}
                    <p className="text-gray-500 dark:text-gray-500 text-xs mt-2">
                      {isUrdu ? 'سافٹ ویئر بذریعہ' : 'Software by'}: {info.softwareBy}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!isEditing && (
              <div className="mt-4 p-4 bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-900/50 dark:to-indigo-900/20 rounded-2xl border border-gray-200 dark:border-gray-700">
                <div className="text-sm space-y-1.5">
                  <p className="font-bold text-lg text-gray-800 dark:text-white">{info.name}</p>
                  <p className="font-bold text-lg text-gray-800 dark:text-white" dir="rtl">{info.nameUr}</p>
                  <p className="text-gray-600 dark:text-gray-400">{info.branch} {isUrdu ? 'برانچ' : 'Branch'}</p>
                  <p className="text-gray-600 dark:text-gray-400">{info.address}</p>
                  <p className="text-gray-600 dark:text-gray-400" dir="rtl">{info.addressUr}</p>
                  <p className="text-gray-600 dark:text-gray-400">
                    {formatPhones(info.phones)}
                  </p>
                  {info.email && (
                    <p className="text-gray-600 dark:text-gray-400">📧 {info.email}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientInfoSettings;
