import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getUsers, createUser } from '../../utils/api';
import toast from 'react-hot-toast';

const roleBadge = (role: string) => {
  switch (role) {
    case 'admin':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
    case 'manager':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  }
};

const UserManagement: React.FC = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('staff');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data?.data || data || []);
    } catch (err) {
      toast.error(t('error_loading_users'));
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error(t('fill_required'));
      return;
    }
    setSubmitting(true);
    try {
      await createUser({ username, password, role, displayName });
      toast.success(t('user_created') || 'User created successfully');
      setShowForm(false);
      fetchUsers();
      setUsername('');
      setPassword('');
      setRole('staff');
      setDisplayName('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('error_creating_user'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header with Add User Button */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-bold text-gray-800 dark:text-white">
          {t('manage_users') || 'Manage Users'} ({users.length})
        </h3>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-2xl text-sm font-semibold shadow-lg shadow-blue-500/25 transition-all active:scale-95"
        >
          <svg className="w-5 h-5 mr-1.5 rtl:ml-1.5 rtl:mr-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('add_user') || 'Add User'}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="spinner"></div>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/30 rounded-2xl">
          <svg className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <p className="font-medium">{t('no_users') || 'No users found'}</p>
          <button onClick={() => setShowForm(true)} className="mt-3 text-blue-600 hover:text-blue-700 font-semibold text-sm underline">
            + {t('add_user') || 'Add First User'}
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:bg-white dark:text-gray-900">
                <th className="px-5 py-3.5 text-start text-xs font-bold text-gray-500 dark:text-gray-900 uppercase tracking-wider">{t('username')}</th>
                <th className="px-5 py-3.5 text-start text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('role')}</th>
                <th className="px-5 py-3.5 text-start text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('display_name')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50 bg-white dark:bg-gray-800">
              {users.map((u, idx) => (
                <tr key={u.id} className={`hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all duration-200 ${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/30 dark:bg-gray-800/50'}`}>
                  <td className="px-5 py-3.5 font-semibold text-gray-800 dark:text-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                        {(u.username || '?')[0].toUpperCase()}
                      </div>
                      {u.username}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${roleBadge(u.role)}`}>
                      {u.role === 'admin' ? t('admin') : u.role === 'manager' ? t('manager') : t('staff')}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 dark:text-gray-300">{u.displayName || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create User Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700 rounded-t-3xl z-10">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">{t('add_user') || 'Add User'}</h2>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-all text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{t('username')} *</label>
                <input
                  placeholder={t('username')}
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{t('password')} *</label>
                <input
                  type="password"
                  placeholder={t('password')}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{t('role')}</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                >
                  <option value="staff">{t('staff')}</option>
                  <option value="manager">{t('manager')}</option>
                  <option value="admin">{t('admin')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{t('display_name')}</label>
                <input
                  placeholder={t('display_name')}
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-semibold transition-all">{t('cancel')}</button>
                <button type="submit" disabled={submitting} className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50">
                  {submitting ? t('saving') : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✅ Add User Button at bottom too (for convenience) */}
      {users.length > 0 && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            {t('add_user') || 'Add Another User'}
          </button>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
