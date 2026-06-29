import { create } from 'zustand';
import { APP_CONFIG } from '../config/app';

// ✅ Types
export interface User {
  id: string;
  username: string;
  role: 'admin' | 'manager' | 'staff';
  displayName?: string;
  displayNameUr?: string;
  phone?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  isAdmin: () => boolean;
  isManager: () => boolean;
  isStaff: () => boolean;
  hasRole: (role: string | string[]) => boolean;
  getDisplayName: () => string;
  getDisplayNameUr: () => string;
  clearError: () => void;
}

// ✅ Storage keys
const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  USER: 'auth_user',
  REMEMBER_ME: 'remember_me',
};

// ✅ Get stored values with error handling
const getStoredToken = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
  } catch {
    return null;
  }
};

const getStoredUser = (): User | null => {
  try {
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

// ✅ Create store WITHOUT persist middleware to avoid infinite re-render loops
// The store manually handles localStorage in login/logout/updateUser
export const useAuthStore = create<AuthState>()((set, get) => ({
  token: getStoredToken(),
  user: getStoredUser(),
  isLoading: false,
  error: null,

  // ✅ Login
  login: (token: string, user: User) => {
    try {
      // Save to both keys for backward compatibility
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);
      localStorage.setItem('token', token);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      localStorage.setItem('user', JSON.stringify(user));
      set({ 
        token, 
        user, 
        isLoading: false, 
        error: null 
      });
    } catch (error) {
      console.error('Failed to save auth data:', error);
      set({ error: 'Failed to save authentication data' });
    }
  },

  // ✅ Logout
  logout: () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem('token');
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem('user');
      localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
      set({ 
        token: null, 
        user: null, 
        isLoading: false, 
        error: null 
      });
      window.location.href = '/login';
    } catch (error) {
      console.error('Failed to logout:', error);
      window.location.href = '/login';
    }
  },

  // ✅ Update user
  updateUser: (userData: Partial<User>) => {
    const currentUser = get().user;
    if (!currentUser) return;
    
    const updatedUser = { ...currentUser, ...userData };
    try {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
      set({ user: updatedUser });
    } catch (error) {
      console.error('Failed to update user:', error);
      set({ error: 'Failed to update user data' });
    }
  },

  // ✅ Set loading
  setLoading: (isLoading: boolean) => set({ isLoading }),

  // ✅ Set error
  setError: (error: string | null) => set({ error }),

  // ✅ Clear error
  clearError: () => set({ error: null }),

  // ✅ Role checks
  isAdmin: () => get().user?.role === 'admin',

  isManager: () => get().user?.role === 'manager' || get().user?.role === 'admin',

  isStaff: () => {
    const role = get().user?.role;
    return role === 'staff' || role === 'manager' || role === 'admin';
  },

  hasRole: (roles: string | string[]) => {
    const userRole = get().user?.role;
    if (!userRole) return false;
    
    if (Array.isArray(roles)) {
      return roles.includes(userRole);
    }
    return userRole === roles;
  },

  // ✅ Get display name
  getDisplayName: () => {
    const user = get().user;
    if (!user) return '';
    return user.displayName || user.username || '';
  },

  getDisplayNameUr: () => {
    const user = get().user;
    if (!user) return '';
    return user.displayNameUr || user.displayName || user.username || '';
  },
}));

// ✅ Helper hooks for common checks - use direct state access to avoid infinite loops
export const useIsAdmin = () => useAuthStore((state) => state.user?.role === 'admin');
export const useIsManager = () => useAuthStore((state) => state.user?.role === 'manager' || state.user?.role === 'admin');
export const useIsStaff = () => useAuthStore((state) => {
  const role = state.user?.role;
  return role === 'staff' || role === 'manager' || role === 'admin';
});
export const useCurrentUser = () => useAuthStore((state) => state.user);
export const useAuthToken = () => useAuthStore((state) => state.token);
export const useIsAuthenticated = () => useAuthStore((state) => !!state.token && !!state.user);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
export const useAuthError = () => useAuthStore((state) => state.error);

// ✅ Utility function to get auth headers
export const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token') || localStorage.getItem(STORAGE_KEYS.TOKEN);
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ✅ Utility to check if authenticated
export const isAuthenticated = (): boolean => {
  return !!(localStorage.getItem('token') || localStorage.getItem(STORAGE_KEYS.TOKEN)) && !!localStorage.getItem(STORAGE_KEYS.USER);
};

// ✅ Utility to get current user from storage
export const getCurrentUser = (): User | null => {
  try {
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

export default useAuthStore;
