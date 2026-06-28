import React from 'react';
import { useTranslation } from 'react-i18next';

interface Option {
  value: string;
  label: string;
  labelUrdu?: string; // ✅ NEW
}

interface SelectFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: Option[];
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  onBlur?: (e: React.FocusEvent<HTMLSelectElement>) => void; // ✅ NEW
}

const SelectField: React.FC<SelectFieldProps> = ({
  label,
  name,
  value,
  onChange,
  options,
  placeholder,
  error,
  required = false,
  disabled = false,
  className = '',
  onBlur,
}) => {
  const { i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';

  const getLabel = (opt: Option) => {
    return isUrdu ? (opt.labelUrdu || opt.label) : opt.label;
  };

  return (
    <div className={`mb-4 sm:mb-5 ${className}`}>
      <label htmlFor={name} className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        required={required}
        disabled={disabled}
        className={`w-full border rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base transition-colors appearance-none
          ${error ? 'border-red-500 focus:ring-red-400' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-400'}
          focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {getLabel(opt)}
          </option>
        ))}
      </select>
      {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
    </div>
  );
};

export default SelectField;