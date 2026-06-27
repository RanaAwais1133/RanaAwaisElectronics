import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean | 'none' | 'sm' | 'md' | 'lg';
  shadow?: boolean | 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean; // ✅ NEW: Hover effect
  bordered?: boolean; // ✅ NEW: Border control
  radius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full'; // ✅ NEW: Border radius
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = true,
  shadow = true,
  hover = false,
  bordered = true,
  radius = 'md',
}) => {
  // ✅ Padding variants
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  // ✅ Shadow variants
  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
  };

  // ✅ Radius variants
  const radiusClasses = {
    none: 'rounded-none',
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    xl: 'rounded-3xl',
    full: 'rounded-full',
  };

  // ✅ Hover class
  const hoverClass = hover ? 'hover:shadow-lg transition-shadow duration-200' : '';

  // ✅ Border class
  const borderClass = bordered ? 'border border-gray-200 dark:border-gray-700' : '';

  // ✅ Determine padding class
  const paddingClass = typeof padding === 'boolean' 
    ? (padding ? paddingClasses.md : '') 
    : paddingClasses[padding] || '';

  // ✅ Determine shadow class
  const shadowClass = typeof shadow === 'boolean'
    ? (shadow ? shadowClasses.sm : '')
    : shadowClasses[shadow] || '';

  return (
    <div
      className={`
        bg-white dark:bg-gray-800 
        overflow-hidden
        ${borderClass}
        ${paddingClass}
        ${shadowClass}
        ${hoverClass}
        ${radiusClasses[radius]}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default Card;