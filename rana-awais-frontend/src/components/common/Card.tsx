import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
  shadow?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = true,
  shadow = true,
}) => {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden ${
        shadow ? 'shadow-sm' : ''
      } ${padding ? 'p-4 sm:p-6' : ''} ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;