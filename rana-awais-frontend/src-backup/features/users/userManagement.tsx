import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getUsers, createUser } from '../../utils/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/useAuthStore';
import { APP_CONFIG } from '../../config/app';

// ✅ Role Badge Component
const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const getRoleStyles = () => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      case 'manager':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'admin';
      case 'manager':
        return 'manager';
      default:
        return 'staff';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getRoleStyles()}`}>
      {getRoleLabel(role)}
    </span>
  );
};

// ✅ User Row Component
const UserRow: React.FC<{
  user: any;
  t: (key: string) => string;
  isUrdu: boolean;
  index: number;
}> = ({ user, t, isUrdu, index }) => {
  const currentUser = useAuthStore((state) => state.user);
  const isCurrentUser = currentUser?.id === user.id;

  return (
    <tr className={`hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all duration-200 ${
      index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/30 dark:bg-gray-800/50'
    }`}>
      <td className="px-5 py-3.5 font-semibold text-gray-800 dark:text-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
            {(user.username || '?')[0].toUpperCase()}
          </div>
          <span>{user.username}</span>
          {isCurrentUser && (
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">({isUrdu ? 'آپ' : 'You'})</span>
          )}
        </div>
      </td>
      <td className="px-5 py-3.5">
        <RoleBadge role={user.role} />
      </td>
      <td className="px-5 py-3.5 text-gray-600 dark:text-gray-300">
        {user.displayName || user.display_name || '—'}
      </td>
    </tr>
  );
};

// ✅ User Card Component (Mobile)
const UserCard: React.FC<{
  user: any;
  t: (key: string) => string;
  isUrdu: boolean;
}> = ({ user, t, isUrdu }) => {
  const currentUser = useAuthStore((state) => state.user);
  const isCurrentUser = currentUser?.id === user.id;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-4 space-y-3 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
            {(user.username || '?')[0].toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-800 dark:text-white">
              {user.username}
              {isCurrentUser && (
                <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">({isUrdu ? 'آپ' : 'You'})</span>
              )}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {user.displayName || user.display_name || '—'}
            </p>
          </div>
        </div>
        <RoleBadge role={user.role} />
      </div>
    </div>
  );
};

const UserManagement: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const currentUser = useAuthStore((state) => state.user);
  
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('staff');
  const [displayName, setDisplayName] = useState('');
  const [displayNameUr, setDisplayNameUr] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ✅ Page title
  useEffect(() => {
    document.title = `${isUrdu ? 'صارفین کا انتظام' : 'User Management'} | ${APP_CONFIG.companyName}`;
  }, [isUrdu]);

  // ✅ Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data?.data || data || []);
    } catch (err) {
      toast.error(isUrdu ? 'صارفین لوڈ کرنے میں ناکامی' : t('error_loading_users'));
    } finally {
      setLoading(false);
    }
  }, [t, isUrdu]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ✅ Handle create user
  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error(isUrdu ? 'صارف نام اور پاس ورڈ ضروری ہیں' : t('fill_required'));
      return;
    }
    
    if (password.length < 6) {
      toast.error(isUrdu ? 'پاس ورڈ کم از کم 6 حروف کا ہونا چاہیے' : 'Password must be at least 6 characters');
      return;
    }
    
    setSubmitting(true);
    
    try {
      await createUser({
        username,
        password,
        role,
        displayName: displayName || username,
        displayNameUr: displayNameUr || displayName || username,
        phone: phone || '',
      });
      
      toast.success(isUrdu ? 'صارف بن گیا' : (t('user_created') || 'User created successfully'));
      setShowForm(false);
      fetchUsers();
      setUsername('');
      setPassword('');
      setRole('staff');
      setDisplayName('');
      setDisplayNameUr('');
      setPhone('');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 
                       (isUrdu ? 'صارف بنانے میں ناکامی' : t('error_creating_user'));
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  }, [username, password, role, displayName, displayNameUr, phone, fetchUsers, t, isUrdu]);

  // ✅ Role options
  const roleOptions = [
    { value: 'staff', label: isUrdu ? 'اسٹاف' : 'Staff' },
    { value: 'manager', label: isUrdu ? 'مینیجر' : 'Manager' },
    { value: 'admin', label: isUrdu ? 'ایڈمن' : 'Admin' },
  ];

  // ✅ Loading state
  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {isUrdu ? 'لوڈ ہو رہا ہے...' : t('loading')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ✅ Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-bold text-gray-800 dark:text-white">
          {isUrdu ? 'صارفین کا انتظام' : (t('manage_users') || 'Manage Users')} ({users.length})
        </h3>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-2xl text-sm font-semibold shadow-lg shadow-blue-500/25 transition-all active:scale-95"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 rtl:ml-1.5 rtl:mr-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {isUrdu ? 'نیا صارف' : (t('add_user') || 'Add User')}
        </button>
      </div>

      {/* ✅ Empty State */}
      {users.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600">
          <svg className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <p className="font-medium">{isUrdu ? 'کوئی صارف نہیں' : (t('no_users') || 'No users found')}</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-3 text-blue-600 hover:text-blue-700 font-semibold text-sm underline"
          >
            + {isUrdu ? 'پہلا صارف شامل کریں' : (t('add_user') || 'Add First User')}
          </button>
        </div>
      ) : (
        <>
          {/* ✅ Mobile Card View */}
          <div className="sm:hidden space-y-3">
            {users.map((u) => (
              <UserCard key={u.id} user={u} t={t} isUrdu={isUrdu} />
            ))}
          </div>

          {/* ✅ Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:bg-gray-700">
                  <th className="px-5 py-3.5 text-start text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {isUrdu ? 'صارف نام' : t('username')}
                  </th>
                  <th className="px-5 py-3.5 text-start text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {isUrdu ? 'کردار' : t('role')}
                  </th>
                  <th className="px-5 py-3.5 text-start text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {isUrdu ? 'ظاہری نام' : t('display_name')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50 bg-white dark:bg-gray-800">
                {users.map((u, idx) => (
                  <UserRow key={u.id} user={u} t={t} isUrdu={isUrdu} index={idx} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ✅ Add User Button at bottom */}
      {users.length > 0 && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {isUrdu ? 'نیا صارف شامل کریں' : (t('add_user') || 'Add Another User')}
          </button>
        </div>
      )}

      {/* ✅ Create User Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md max-h-[95vh] overflow-y-auto mx-2" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 rounded-t-3xl z-10">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
                {isUrdu ? 'نیا صارف' : (t('add_user') || 'Add User')}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 sm:p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all text-xl sm:text-2xl"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              {/* Username */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  {isUrdu ? 'صارف نام' : t('username')} *
                </label>
                <input
                  placeholder={isUrdu ? 'صارف نام درج کریں' : t('username')}
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-colors"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  {isUrdu ? 'پاس ورڈ' : t('password')} *
                </label>
                <input
                  type="password"
                  placeholder={isUrdu ? 'پاس ورڈ درج کریں' : t('password')}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-colors"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {isUrdu ? 'کم از کم 6 حروف' : 'Minimum 6 characters'}
                </p>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  {isUrdu ? 'کردار' : t('role')}
                </label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-colors"
                >
                  {roleOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  {isUrdu ? 'ظاہری نام (انگریزی)' : 'Display Name (English)'}
                </label>
                <input
                  placeholder={isUrdu ? 'ظاہری نام درج کریں' : t('display_name')}
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-colors"
                />
              </div>

              {/* Display Name Urdu */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  {isUrdu ? 'ظاہری نام (اردو)' : 'Display Name (Urdu)'}
                </label>
                <input
                  placeholder={isUrdu ? 'ظاہری نام درج کریں' : 'Display Name (Urdu)'}
                  value={displayNameUr}
                  onChange={e => setDisplayNameUr(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-colors"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  {isUrdu ? 'فون نمبر' : 'Phone Number'}
                </label>
                <input
                  type="tel"
                  placeholder={isUrdu ? 'فون نمبر درج کریں' : 'Phone number'}
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-colors"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 sm:px-5 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 transition-all"
                >
                  {isUrdu ? 'منسوخ کریں' : t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 sm:px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      {isUrdu ? 'محفوظ ہو رہا...' : t('saving')}
                    </span>
                  ) : (
                    isUrdu ? 'محفوظ کریں' : t('save')
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;