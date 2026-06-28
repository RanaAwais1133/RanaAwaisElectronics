import React from 'react';
import { useTranslation } from 'react-i18next';

interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'number' | 'email' | 'tel' | 'password'; // ✅ Added password
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void; // ✅ NEW
  autoFocus?: boolean; // ✅ NEW
  min?: number; // ✅ NEW
  max?: number; // ✅ NEW
  step?: string | number; // ✅ NEW - accepts both for HTML compatibility
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  required = false,
  disabled = false,
  className = '',
  onBlur,
  autoFocus = false,
  min,
  max,
  step,
}) => {
  const { i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const inputMode = type === 'number' ? 'numeric' : type === 'tel' ? 'tel' : undefined;

  return (
    <div className={`mb-4 sm:mb-5 ${className}`}>
      <label htmlFor={name} className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoFocus={autoFocus}
        autoComplete="off"
        inputMode={inputMode}
        min={min}
        max={max}
        step={step}
        className={`w-full border rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base placeholder-gray-400 dark:placeholder-gray-500 transition-colors
          ${error ? 'border-red-500 focus:ring-red-400' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-400'}
          focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed`}
        dir={isUrdu ? 'rtl' : 'ltr'}
      />
      {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
    </div>
  );
};

export default FormField;