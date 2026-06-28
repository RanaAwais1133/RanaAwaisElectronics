import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface PhoneFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void; // ✅ NEW
  autoFocus?: boolean; // ✅ NEW
}

const formatPhone = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 4) return digits;
  return digits.slice(0, 4) + '-' + digits.slice(4);
};

// ✅ NEW: Validate phone
export const validatePhone = (phone: string): boolean => {
  const cleaned = phone.replace(/-/g, '');
  return cleaned.length === 11 && cleaned.startsWith('03');
};

const PhoneField: React.FC<PhoneFieldProps> = ({
  label,
  name,
  value,
  onChange,
  placeholder = '0313-XXXXXXX',
  error,
  required = false,
  disabled = false,
  className = '',
  onBlur,
  autoFocus = false,
}) => {
  const { i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatPhone(e.target.value);
      e.target.value = formatted;
      onChange(e);
    },
    [onChange]
  );

  return (
    <div className={`mb-4 sm:mb-5 ${className}`}>
      <label htmlFor={name} className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type="tel"
        value={value}
        onChange={handleChange}
        onBlur={onBlur}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoFocus={autoFocus}
        autoComplete="off"
        inputMode="tel"
        maxLength={12}
        pattern="[0-9\-]*"
        className={`w-full border rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base placeholder-gray-400 dark:placeholder-gray-500 transition-colors
          ${error ? 'border-red-500 focus:ring-red-400' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-400'}
          focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed`}
        dir={isUrdu ? 'rtl' : 'ltr'}
        lang="en"
      />
      {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
    </div>
  );
};

export default PhoneField;