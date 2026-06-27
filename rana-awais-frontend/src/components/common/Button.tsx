import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'outline' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean; // ✅ NEW: Loading state
  className?: string;
  title?: string;
  fullWidth?: boolean;
  icon?: React.ReactNode; // ✅ NEW: Icon support
  iconPosition?: 'left' | 'right'; // ✅ NEW: Icon position
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  title,
  fullWidth = false,
  icon,
  iconPosition = 'left',
}) => {
  const base =
    'inline-flex items-center justify-center font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';

  const variants: Record<string, string> = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 dark:bg-blue-600 dark:hover:bg-blue-700',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500 dark:bg-gray-600 dark:hover:bg-gray-700',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 dark:bg-red-600 dark:hover:bg-red-700',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 dark:bg-green-600 dark:hover:bg-green-700',
    warning: 'bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-500 dark:bg-yellow-500 dark:hover:bg-yellow-600',
    outline:
      'border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-gray-400 bg-transparent',
    ghost:
      'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-gray-400 bg-transparent',
  };

  const sizes: Record<string, string> = {
    xs: 'px-2.5 py-1.5 text-xs',
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-sm sm:text-base',
    lg: 'px-6 py-3 text-base sm:text-lg',
    xl: 'px-8 py-4 text-lg sm:text-xl',
  };

  // ✅ Loading spinner
  const Spinner = () => (
    <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      className={`
        ${base} 
        ${variants[variant]} 
        ${sizes[size]} 
        ${fullWidth ? 'w-full sm:w-auto' : ''} 
        ${className}
      `}
    >
      {loading && <Spinner />}
      {!loading && icon && iconPosition === 'left' && <span className="mr-2">{icon}</span>}
      {children}
      {!loading && icon && iconPosition === 'right' && <span className="ml-2">{icon}</span>}
    </button>
  );
};

export default Button;