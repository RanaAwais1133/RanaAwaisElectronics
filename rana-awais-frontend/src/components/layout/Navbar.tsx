import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LanguageToggle from '../bilingual/LanguageToggle';
import ThemeToggle from '../bilingual/ThemeToggle';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/useAuthStore';
import { useClientStore } from '../../store/useClientStore';

interface NavbarProps {
  onMenuToggle: () => void;
}

const Navbar = React.memo(({ onMenuToggle }: NavbarProps) => {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  // ✅ Global store se company name - settings change karte hi update ho jayega
  const companyName = useClientStore((s) => s.info.name);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <nav className="sticky top-0 z-40 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md shadow-sm border-b border-gray-200 dark:border-gray-700 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Menu Toggle Button */}
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors"
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        {/* ✅ Dynamic Company Name from config (synced from localStorage) */}
        <h1 className="text-base sm:text-xl md:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 truncate">
          {companyName}
        </h1>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        <LanguageToggle size="sm" showLabel={false} />
        <ThemeToggle size="sm" showLabel={false} />
        
        {user ? (
          <div className="flex items-center gap-1 sm:gap-2">
            {/* ✅ User avatar/name with fallback */}
            <span className="text-xs sm:text-sm hidden sm:inline text-gray-600 dark:text-gray-300 max-w-[80px] truncate">
              {user.displayName || user.username || 'User'}
            </span>
            
            {/* ✅ Logout button with loading state */}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="px-2 sm:px-3 py-1 sm:py-1.5 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white text-xs sm:text-sm rounded-lg transition-colors"
            >
              {isLoggingOut ? '...' : t('logout')}
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm rounded-lg transition-colors"
          >
            {t('login')}
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
