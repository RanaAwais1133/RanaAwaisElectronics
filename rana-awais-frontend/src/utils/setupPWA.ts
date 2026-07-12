// src/utils/setupPWA.ts
// ✅ Dynamically update PWA manifest with company name from client store
// ✅ This ensures the PWA install shows the correct company name

import { ClientInfo } from '../store/useClientStore';
import { APP_CONFIG } from '../config/app';

export const updatePWAManifest = (clientInfo: ClientInfo): void => {
  try {
    const companyName = clientInfo.name || APP_CONFIG.companyName || 'My Electronics';
    const shortName = companyName.length > 12 ? companyName.substring(0, 12) + '...' : companyName;
    
    const manifest = {
      name: `${companyName} - POS & Accounting`,
      short_name: shortName,
      description: `Complete POS, Accounting & Customer Management System - ${companyName}`,
      start_url: '/',
      display: 'standalone',
      background_color: '#1e293b',
      theme_color: '#3b82f6',
      orientation: 'any',
      scope: '/',
      lang: 'en',
      dir: 'ltr',
      categories: ['business', 'finance', 'productivity'],
      icons: [
        { src: '/logo192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: '/logo512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
      ],
      screenshots: [],
      related_applications: [],
      prefer_related_applications: false,
      shortcuts: [
        {
          name: 'Dashboard',
          short_name: 'Dashboard',
          description: 'View dashboard summary',
          url: '/dashboard',
          icons: [{ src: '/logo192.png', sizes: '192x192' }]
        },
        {
          name: 'Customers',
          short_name: 'Customers',
          description: 'Manage customers',
          url: '/customers',
          icons: [{ src: '/logo192.png', sizes: '192x192' }]
        },
        {
          name: 'Installments',
          short_name: 'Installments',
          description: 'Manage installments',
          url: '/installments',
          icons: [{ src: '/logo192.png', sizes: '192x192' }]
        }
      ]
    };

    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    const manifestURL = URL.createObjectURL(blob);

    // Update the manifest link in the head
    const existingLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (existingLink) {
      // Revoke old blob URL if it was set by us
      if (existingLink.dataset.dynamic === 'true' && existingLink.href) {
        URL.revokeObjectURL(existingLink.href);
      }
      existingLink.href = manifestURL;
      existingLink.dataset.dynamic = 'true';
    }

    // Update apple-mobile-web-app-title meta tag
    const appleMeta = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');
    if (appleMeta) {
      appleMeta.content = companyName;
    }

    // Update theme-color meta tag
    const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.content = '#3b82f6';
    }

    // Update page title
    document.title = `${companyName} - ERP System`;

    console.log('✅ PWA manifest updated to:', companyName);
  } catch (err) {
    console.warn('⚠️ Failed to update PWA manifest:', err);
  }
};