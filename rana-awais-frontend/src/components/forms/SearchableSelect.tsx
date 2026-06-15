import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  name,
  value,
  onChange,
  options,
  placeholder = 'Select...',
  error,
  required = false,
  disabled = false,
  className = '',
}) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`mb-4 sm:mb-5 ${className}`}>
      <label htmlFor={name} className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative" ref={wrapperRef}>
        <button
          type="button"
          className={`w-full border rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-left text-sm sm:text-base transition-colors
            ${error ? 'border-red-500 focus:ring-red-400' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-400'}
            focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed
            ${disabled ? 'cursor-not-allowed' : ''}`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </button>

        {isOpen && !disabled && (
          <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl shadow-lg max-h-60 overflow-hidden">
            {/* Search input inside dropdown */}
            <div className="p-2 border-b border-gray-200 dark:border-gray-600">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={i18n.language === 'ur' ? 'تلاش کریں...' : 'Search...'}
                className="w-full border border-gray-300 dark:border-gray-500 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-600 dark:text-white focus:outline-none"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="overflow-y-auto max-h-48">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-2 text-sm text-gray-500">No options</div>
              ) : (
                filteredOptions.map(opt => (
                  <div
                    key={opt.value}
                    className={`px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors ${opt.value === value ? 'bg-blue-50 dark:bg-blue-900/30 font-medium text-blue-700 dark:text-blue-300' : ''}`}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearch('');
                    }}
                  >
                    {opt.label}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
    </div>
  );
};

export default SearchableSelect;