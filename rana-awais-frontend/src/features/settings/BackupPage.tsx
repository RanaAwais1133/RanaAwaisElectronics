import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  backupDatabase,
  restoreDatabase,
  sendEmailBackup,
  getBackupSettings,
  updateBackupSettings,
} from '../../utils/api';

interface BackupSettings {
  enabled: boolean;
  interval: string;
  time: string;
  backupDir: string;
  maxBackups: number;
  emailBackup: boolean;
  emailAddress: string;
  emailPass: string;
  smtpHost: string;
  smtpPort: string;
}

const BackupPage: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<BackupSettings>({
    enabled: false,
    interval: 'daily',
    time: '02:00',
    backupDir: './backups',
    maxBackups: 30,
    emailBackup: false,
    emailAddress: '',
    emailPass: '',
    smtpHost: 'smtp.gmail.com',
    smtpPort: '587',
  });
  const [emailModal, setEmailModal] = useState(false);
  const [emailData, setEmailData] = useState({
    email: '',
    password: '',
    smtpHost: 'smtp.gmail.com',
    smtpPort: '587',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await getBackupSettings();
      if (res) {
        setSettings({
          enabled: res.enabled || false,
          interval: res.interval || 'daily',
          time: res.time || '02:00',
          backupDir: res.backupDir || './backups',
          maxBackups: res.maxBackups || 30,
          emailBackup: res.emailBackup || false,
          emailAddress: res.emailAddress || '',
          emailPass: res.emailPass || '',
          smtpHost: res.smtpHost || 'smtp.gmail.com',
          smtpPort: res.smtpPort || '587',
        });
      }
    } catch (err) {
      // Settings not found yet, use defaults
    }
  };

  // ============================================================
  // 💾 MANUAL BACKUP - Download directly to user's PC
  // ============================================================
  const handleManualBackup = async () => {
    setLoading(true);
    try {
      const blob = await backupDatabase();
      // Create download link - browser will show save dialog
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const now = new Date();
      const filename = `rana-awais-backup-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}.json`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Backup downloaded successfully!');
      toast.success('بیک اپ کامیابی سے ڈاؤن لوڈ ہو گیا');
    } catch (err: any) {
      toast.error(err?.response?.data?.message_ur || 'Backup failed');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // 🔄 RESTORE - Upload backup file
  // ============================================================
  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('Are you sure? This will replace ALL current data with backup data.\n\nکیا آپ کو یقین ہے؟ یہ تمام موجودہ ڈیٹا کو بیک اپ ڈیٹا سے بدل دے گا۔')) {
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('backup', file);
      const res = await restoreDatabase(formData);
      toast.success(res?.message_ur || 'Backup restored successfully!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message_ur || 'Restore failed');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ============================================================
  // 📧 EMAIL BACKUP
  // ============================================================
  const handleEmailBackup = async () => {
    if (!emailData.email) {
      toast.error('Please enter your email');
      return;
    }
    setLoading(true);
    try {
      const res = await sendEmailBackup(emailData);
      toast.success(res?.message_ur || 'Backup email is being sent!');
      setEmailModal(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message_ur || 'Email backup failed');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // ⚙️ AUTO BACKUP SETTINGS
  // ============================================================
  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      const res = await updateBackupSettings(settings);
      toast.success(res?.message_ur || 'Settings saved!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message_ur || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2.5 bg-gradient-to-br from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 rounded-xl shadow-sm">
          <svg className="w-5 h-5 text-white dark:text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">بیک اپ اور بحالی</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">اپنے ڈیٹا کا بیک اپ لیں، بحال کریں، اور خودکار بیک اپ ترتیب دیں</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ========== MANUAL BACKUP ========== */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">مینوئل بیک اپ</h2>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-5 text-sm leading-relaxed">
            بٹن پر کلک کریں اور بیک اپ فائل اپنی مرضی کی جگہ (ڈرائیو، USB) میں محفوظ کریں
          </p>
          <button
            onClick={handleManualBackup}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl font-semibold text-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                بیک اپ ہو رہا ہے...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                بیک اپ ڈاؤن لوڈ کریں
              </>
            )}
          </button>
        </div>

        {/* ========== RESTORE ========== */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
              <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5 5 5M12 3v12" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">بحالی (Restore)</h2>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-5 text-sm leading-relaxed">
            پہلے سے محفوظ کردہ بیک اپ فائل اپ لوڈ کر کے ڈیٹا بحال کریں
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={handleRestoreClick}
            disabled={loading}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 px-4 rounded-xl font-semibold text-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                بحال ہو رہا ہے...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5 5 5M12 3v12" /></svg>
                بیک اپ فائل اپ لوڈ کریں
              </>
            )}
          </button>
        </div>

        {/* ========== EMAIL BACKUP ========== */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
              <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">ای میل بیک اپ</h2>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-5 text-sm leading-relaxed">
            بیک اپ اپنی ای میل پر بھیجیں (Gmail, Yahoo, Outlook)
          </p>
          <button
            onClick={() => setEmailModal(true)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            ای میل بیک اپ بھیجیں
          </button>
        </div>

        {/* ========== AUTO BACKUP SETTINGS ========== */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-purple-50 dark:bg-purple-900/30 rounded-xl">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">خودکار بیک اپ</h2>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-5 text-sm leading-relaxed">
            روزانہ خودکار بیک اپ ترتیب دیں
          </p>

          <div className="space-y-4">
            <label className="relative flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:bg-purple-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">خودکار بیک اپ فعال کریں</span>
            </label>

            {settings.enabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">وقت</label>
                  <input
                    type="time"
                    value={settings.time}
                    onChange={(e) => setSettings({ ...settings, time: e.target.value })}
                    className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">بیک اپ رکھنے کی تعداد</label>
                  <input
                    type="number"
                    value={settings.maxBackups}
                    onChange={(e) => setSettings({ ...settings, maxBackups: parseInt(e.target.value) || 30 })}
                    className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    min="1"
                    max="365"
                  />
                </div>

                <label className="relative flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.emailBackup}
                    onChange={(e) => setSettings({ ...settings, emailBackup: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:bg-emerald-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                  <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">ای میل بیک اپ بھی بھیجیں</span>
                </label>

                {settings.emailBackup && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ای میل</label>
                      <input
                        type="email"
                        value={settings.emailAddress}
                        onChange={(e) => setSettings({ ...settings, emailAddress: e.target.value })}
                        className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        placeholder="your-email@gmail.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ای میل پاس ورڈ / App Password</label>
                      <input
                        type="password"
                        value={settings.emailPass}
                        onChange={(e) => setSettings({ ...settings, emailPass: e.target.value })}
                        className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        placeholder="App Password"
                      />
                    </div>
                  </>
                )}

                <button
                  onClick={handleSaveSettings}
                  disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 px-4 rounded-xl font-semibold text-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      محفوظ ہو رہا ہے...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                      سیٹنگز محفوظ کریں
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ========== INFO SECTION ========== */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-blue-800 dark:text-blue-300 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          اہم معلومات
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 mt-0.5">✅</span>
            <span className="text-sm text-blue-700 dark:text-blue-300">بیک اپ میں تمام ڈیٹا (کسٹمرز، پروڈکٹس، انسٹالمنٹس، ادائیگیاں، وغیرہ) شامل ہوتا ہے</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 mt-0.5">✅</span>
            <span className="text-sm text-blue-700 dark:text-blue-300">بیک اپ فائل JSON فارمیٹ میں ہوتی ہے، جسے کسی بھی ڈیوائس پر استعمال کیا جا سکتا ہے</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-amber-600 dark:text-amber-400 mt-0.5">⚠️</span>
            <span className="text-sm text-blue-700 dark:text-blue-300">بحالی (Restore) کرتے وقت تمام موجودہ ڈیٹا بیک اپ ڈیٹا سے بدل جائے گا</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 mt-0.5">✅</span>
            <span className="text-sm text-blue-700 dark:text-blue-300">خودکار بیک اپ مقررہ وقت پر اپنے آپ چلے گا</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-600 dark:text-blue-400 mt-0.5">✅</span>
            <span className="text-sm text-blue-700 dark:text-blue-300">پرانے بیک اپ خود بخود ڈیلیٹ ہو جائیں گے (صرف مقررہ تعداد رہے گی)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-emerald-600 dark:text-emerald-400 mt-0.5">📧</span>
            <span className="text-sm text-blue-700 dark:text-blue-300">Gmail کے لیے App Password استعمال کریں (نارمل پاس ورڈ نہیں)</span>
          </div>
        </div>
      </div>

      {/* ========== EMAIL MODAL ========== */}
      {emailModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setEmailModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">ای میل بیک اپ</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Gmail کے لیے App Password استعمال کریں</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ای میل</label>
                <input
                  type="email"
                  value={emailData.email}
                  onChange={(e) => setEmailData({ ...emailData, email: e.target.value })}
                  className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="your-email@gmail.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">پاس ورڈ / App Password</label>
                <input
                  type="password"
                  value={emailData.password}
                  onChange={(e) => setEmailData({ ...emailData, password: e.target.value })}
                  className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="App Password"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SMTP Host</label>
                  <input
                    type="text"
                    value={emailData.smtpHost}
                    onChange={(e) => setEmailData({ ...emailData, smtpHost: e.target.value })}
                    className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SMTP Port</label>
                  <input
                    type="text"
                    value={emailData.smtpPort}
                    onChange={(e) => setEmailData({ ...emailData, smtpPort: e.target.value })}
                    className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEmailModal(false)}
                className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              >
                منسوخ کریں
              </button>
              <button
                onClick={handleEmailBackup}
                disabled={loading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    بھیجا جا رہا ہے...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    بیک اپ بھیجیں
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupPage;
