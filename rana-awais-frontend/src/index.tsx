import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { APP_CONFIG } from './config/app';

// ✅ Set initial theme before rendering
const initializeTheme = (): void => {
  try {
    const savedTheme = localStorage.getItem('theme');
    const theme = savedTheme === 'dark' ? 'dark' : 'light';
    document.documentElement.classList.add(theme);
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#1a1a2e' : '#ffffff');
    }
  } catch {
    // Silent fail
  }
};

// ✅ Set initial language before rendering
const initializeLanguage = (): void => {
  try {
    const savedLang = localStorage.getItem('i18nextLng') || localStorage.getItem('language') || 'ur';
    const lang = savedLang === 'en' || savedLang === 'ur' ? savedLang : 'ur';
    const isRTL = lang === 'ur';
    
    document.documentElement.lang = lang;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.classList.add(isRTL ? 'rtl' : 'ltr');
  } catch {
    // Silent fail
  }
};

// ✅ Initialize app
initializeTheme();
initializeLanguage();

// ✅ Set document title
document.title = `${APP_CONFIG.companyName} - ERP System`;

// ✅ Create root and render
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

// ✅ Render with error handling
try {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error('Failed to render app:', error);
  
  // ✅ Show fallback UI if app fails to render
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;font-family:sans-serif;padding:20px;text-align:center;">
        <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
        <h1 style="font-size:24px;color:#1f2937;margin-bottom:8px;">Something went wrong</h1>
        <p style="color:#6b7280;margin-bottom:16px;">Failed to load the application. Please try refreshing the page.</p>
        <button 
          onclick="window.location.reload()" 
          style="padding:10px 24px;background:#2563eb;color:white;border:none;border-radius:8px;cursor:pointer;font-size:16px;"
        >
          Refresh Page
        </button>
      </div>
    `;
  }
}

// ✅ Report web vitals (optional) - using web-vitals v5 API
if (process.env.NODE_ENV === 'production') {
  import('web-vitals').then(({ onCLS, onFCP, onLCP, onTTFB, onINP }) => {
    const reportMetric = (metric: any) => {
      console.log(metric);
    };
    onCLS(reportMetric);
    onFCP(reportMetric);
    onLCP(reportMetric);
    onTTFB(reportMetric);
    onINP(reportMetric);
  }).catch(() => {
    // web-vitals not available
  });
}
