// src/store/useClientStore.ts
// ✅ Global Client Info Store - localStorage se data lega + Backend API sync
// ✅ Settings change karte hi har jagah instantly update ho jayega

import { create } from 'zustand';
import { APP_CONFIG } from '../config/app';

export interface PhoneEntry {
  name: string;
  number: string;
}

export interface ClientInfo {
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

// ✅ Parse phones - supports both old (string[]) and new (PhoneEntry[]) formats
const parsePhones = (phones: any): PhoneEntry[] => {
  if (!phones || !Array.isArray(phones)) return [];
  if (phones.length > 0 && typeof phones[0] === 'object' && phones[0] !== null) {
    return phones.map((p: any) => ({
      name: p.name || '',
      number: p.number || '',
    }));
  }
  return phones.map((p: string) => ({
    name: '',
    number: p || '',
  }));
};

// ✅ Load saved info from localStorage (fallback)
const loadFromStorage = (): ClientInfo | null => {
  try {
    const saved = localStorage.getItem('clientInfo');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        phones: parsePhones(parsed.phones || []),
      };
    }
  } catch {}
  return null;
};

// ✅ Get default values from APP_CONFIG
const getDefaults = (): ClientInfo => ({
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

// ✅ Format phones for display
export const formatPhones = (phones: PhoneEntry[]): string => {
  return phones
    .filter(p => p.number.trim())
    .map(p => p.name.trim() ? `${p.name}: ${p.number}` : p.number)
    .join(' | ');
};

// ✅ Get phone numbers as string array (for backward compatibility)
export const getPhoneNumbers = (phones: PhoneEntry[]): string[] => {
  return phones.filter(p => p.number.trim()).map(p => p.number);
};

interface ClientStore {
  info: ClientInfo;
  loading: boolean;
  loaded: boolean;
  // ✅ Load from localStorage + Backend
  load: () => void;
  // ✅ Load from Backend API (overrides localStorage)
  loadFromBackend: () => Promise<void>;
  // ✅ Update info (called after saving to backend)
  update: (info: ClientInfo) => void;
  // ✅ Save to Backend API
  saveToBackend: (info: ClientInfo) => Promise<void>;
  // ✅ Get formatted phones
  getFormattedPhones: () => string;
  // ✅ Get phone numbers array
  getPhoneNumbersArray: () => string[];
}

export const useClientStore = create<ClientStore>((set, get) => ({
  info: loadFromStorage() || getDefaults(),
  loading: false,
  loaded: false,

  load: () => {
    const saved = loadFromStorage();
    if (saved) {
      set({ info: saved });
    }
  },

  loadFromBackend: async () => {
    set({ loading: true });
    try {
      // ✅ Dynamic import to avoid circular dependency
      const api = (await import('../utils/api')).default;
      const res = await api.get('/admin/settings');
      const settings = res.data?.settings || {};
      const clientInfoStr = settings['client_info'];
      if (clientInfoStr) {
        try {
          const parsed = JSON.parse(clientInfoStr);
          const info: ClientInfo = {
            name: parsed.name || get().info.name || APP_CONFIG.companyName,
            nameUr: parsed.nameUr || get().info.nameUr || APP_CONFIG.companyNameUr,
            branch: parsed.branch || get().info.branch || APP_CONFIG.branchName,
            branchUr: parsed.branchUr || get().info.branchUr || APP_CONFIG.branchNameUr,
            address: parsed.address || get().info.address || APP_CONFIG.address,
            addressUr: parsed.addressUr || get().info.addressUr || APP_CONFIG.addressUr,
            phones: parsePhones(parsed.phones || get().info.phones || APP_CONFIG.phones),
            email: parsed.email || get().info.email || '',
            softwareBy: parsed.softwareBy || get().info.softwareBy || APP_CONFIG.softwareBy,
            softwareByUr: parsed.softwareByUr || get().info.softwareByUr || APP_CONFIG.softwareByUr,
            invoiceNote: parsed.invoiceNote || get().info.invoiceNote || APP_CONFIG.invoiceNote,
            invoiceNoteUr: parsed.invoiceNoteUr || get().info.invoiceNoteUr || APP_CONFIG.invoiceNoteUr,
            serviceNote: parsed.serviceNote || get().info.serviceNote || APP_CONFIG.serviceNote,
            serviceNoteUr: parsed.serviceNoteUr || get().info.serviceNoteUr || APP_CONFIG.serviceNoteUr,
          };
          // ✅ Save to localStorage as cache
          localStorage.setItem('clientInfo', JSON.stringify(info));
          set({ info, loaded: true, loading: false });
          return;
        } catch (e) {
          console.warn('Failed to parse client_info from backend', e);
        }
      }
    } catch (err) {
      console.warn('Failed to load client info from backend, using local', err);
    }
    set({ loaded: true, loading: false });
  },

  update: (info: ClientInfo) => {
    set({ info });
  },

  saveToBackend: async (info: ClientInfo) => {
    // ✅ Save locally first
    localStorage.setItem('clientInfo', JSON.stringify(info));
    set({ info });

    // ✅ Save to backend API
    try {
      const api = (await import('../utils/api')).default;
      await api.put('/admin/settings', {
        settings: {
          client_info: JSON.stringify(info),
        },
      });
    } catch (err) {
      console.warn('Failed to save client info to backend', err);
      throw err;
    }
  },

  getFormattedPhones: () => {
    return formatPhones(get().info.phones);
  },

  getPhoneNumbersArray: () => {
    return getPhoneNumbers(get().info.phones);
  },
}));