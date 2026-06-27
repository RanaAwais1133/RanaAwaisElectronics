import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface Option {
  value: string;
  label: string;
  labelUrdu?: string;
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
  loading?: boolean;
  onSearch?: (term: string) => void;
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
  loading = false,
  onSearch,
}) => {
  const { i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  
  // ✅ FIX: Use browser-compatible timeout type
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedOption = options.find(opt => opt.value === value);

  const getDisplayLabel = (opt: Option) => {
    return isUrdu ? (opt.labelUrdu || opt.label) : opt.label;
  };

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter(opt =>
      opt.label.toLowerCase().includes(q) ||
      (opt.labelUrdu || '').includes(q)
    );
  }, [options, search]);

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

  // Handle search with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    
    if (onSearch) {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
      searchTimeout.current = setTimeout(() => {
        onSearch(val);
      }, 300);
    }
  };

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
            ${disabled ? 'cursor-not-allowed' : ''}
            flex items-center justify-between`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <span className="truncate">
            {selectedOption ? getDisplayLabel(selectedOption) : placeholder}
          </span>
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && !disabled && (
          <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl shadow-lg max-h-60 overflow-hidden">
            {/* Search input inside dropdown */}
            <div className="p-2 border-b border-gray-200 dark:border-gray-600">
              <input
                type="text"
                value={search}
                onChange={handleSearchChange}
                placeholder={isUrdu ? 'تلاش کریں...' : 'Search...'}
                className="w-full border border-gray-300 dark:border-gray-500 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="overflow-y-auto max-h-48">
              {loading ? (
                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                  {isUrdu ? 'لوڈ ہو رہا ہے...' : 'Loading...'}
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                  {isUrdu ? 'کوئی آپشن نہیں' : 'No options'}
                </div>
              ) : (
                filteredOptions.map(opt => (
                  <div
                    key={opt.value}
                    className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors ${
                      opt.value === value ? 'bg-blue-50 dark:bg-blue-900/30 font-medium text-blue-700 dark:text-blue-300' : ''
                    }`}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearch('');
                    }}
                  >
                    {getDisplayLabel(opt)}
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