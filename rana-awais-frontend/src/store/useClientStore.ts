// src/store/useClientStore.ts
// ✅ Global Client Info Store - localStorage se data lega aur sab components use karein ge
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

// ✅ Load saved info from localStorage
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
  // ✅ Load from localStorage
  load: () => void;
  // ✅ Update info (called after saving to localStorage)
  update: (info: ClientInfo) => void;
  // ✅ Get formatted phones
  getFormattedPhones: () => string;
  // ✅ Get phone numbers array
  getPhoneNumbersArray: () => string[];
}

export const useClientStore = create<ClientStore>((set, get) => ({
  info: loadFromStorage() || getDefaults(),

  load: () => {
    const saved = loadFromStorage();
    if (saved) {
      set({ info: saved });
    }
  },

  update: (info: ClientInfo) => {
    set({ info });
  },

  getFormattedPhones: () => {
    return formatPhones(get().info.phones);
  },

  getPhoneNumbersArray: () => {
    return getPhoneNumbers(get().info.phones);
  },
}));
