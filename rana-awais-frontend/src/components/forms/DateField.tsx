import React from 'react';
import { useTranslation } from 'react-i18next';

interface DateFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean; // ✅ NEW
  min?: string; // ✅ NEW
  max?: string; // ✅ NEW
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void; // ✅ NEW
}

const DateField: React.FC<DateFieldProps> = ({
  label,
  name,
  value,
  onChange,
  error,
  required = false,
  className = '',
  disabled = false,
  min,
  max,
  onBlur,
}) => {
  const { i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';

  return (
    <div className={`mb-4 sm:mb-5 ${className}`}>
      <label htmlFor={name} className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type="date"
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        required={required}
        disabled={disabled}
        min={min}
        max={max}
        autoComplete="off"
        className={`w-full border rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base transition-colors
          ${error ? 'border-red-500 focus:ring-red-400' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-400'}
          focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed
          ${isUrdu ? 'text-right' : 'text-left'}`}
        dir={isUrdu ? 'rtl' : 'ltr'}
      />
      {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
    </div>
  );
};

export default DateField;