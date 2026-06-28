import React from 'react';
import { useTranslation } from 'react-i18next';

interface TextAreaProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  placeholder?: string; // ✅ NEW
  error?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean; // ✅ NEW
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void; // ✅ NEW
  maxLength?: number; // ✅ NEW
}


const TextArea: React.FC<TextAreaProps> = ({
  label,
  name,
  value,
  onChange,
  rows = 3,
  placeholder,
  error,
  required = false,
  className = '',
  disabled = false,
  onBlur,
  maxLength,
}) => {
  const { i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';

  return (
    <div className={`mb-4 sm:mb-5 ${className}`}>
      <label htmlFor={name} className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        rows={rows}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        maxLength={maxLength}
        autoComplete="off"
        className={`w-full border rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base placeholder-gray-400 dark:placeholder-gray-500 transition-colors resize-y
          ${error ? 'border-red-500 focus:ring-red-400' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-400'}
          focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed`}
        dir={isUrdu ? 'rtl' : 'ltr'}
      />
      {maxLength && (
        <div className="text-right text-xs text-gray-400 mt-1">
          {value.length}/{maxLength}
        </div>
      )}
      {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
    </div>
  );
};

export default TextArea;