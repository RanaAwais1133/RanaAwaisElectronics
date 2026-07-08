// src/config/clientConfig.ts
// Yeh file client-config.json ko read karti hai
// Build ke waqt, client-config.json ko public/ folder mein copy karein

export interface ClientConfig {
  client: {
    name: string;
    nameUr: string;
    branch: string;
    branchUr: string;
    address: string;
    addressUr: string;
    phones: string[];
    softwareBy: string;
    softwareByUr: string;
    invoiceNote: string;
    invoiceNoteUr: string;
    serviceNote: string;
    serviceNoteUr: string;
  };
  server: {
    port: number;
    environment: string;
    frontendUrl: string;
  };
  database: {
    path: string;
  };
  auth: {
    jwtSecret: string;
    jwtExpiryHours: number;
    adminUsername: string;
    adminPassword: string;
    adminDisplayName: string;
  };
  license: {
    key: string;
  };
  fine: {
    perDay: number;
    maxPercent: number;
    gracePeriodDays: number;
  };
  integrations: {
    smsEndpoint: string;
    whatsappApi: string;
    thermalEndpoint: string;
  };
}

let cachedConfig: ClientConfig | null = null;

export async function loadClientConfig(): Promise<ClientConfig | null> {
  if (cachedConfig) return cachedConfig;

  try {
    const response = await fetch('/client-config.json');
    if (response.ok) {
      cachedConfig = await response.json();
      console.log('✅ Loaded client-config.json');
      return cachedConfig;
    }
  } catch (err) {
    console.log('ℹ️ No client-config.json found, using env defaults');
  }
  return null;
}

export function getClientConfig(): ClientConfig | null {
  return cachedConfig;
}
