import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCustomerStore } from '../../store/useCustomerStore';
import { formatPhone, formatCNIC } from '../../utils/helpers';

interface CustomerSearchProps {
  selectedCustomerId: string;
  onSelect: (customerId: string) => void;
  onAddNew?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const CustomerSearch: React.FC<CustomerSearchProps> = ({
  selectedCustomerId,
  onSelect,
  onAddNew,
  placeholder,
  disabled = false,
  className = '',
}) => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  
  // ✅ FIX: Use loading from store with fallback
  const { customers, fetchCustomers, loading: storeLoading } = useCustomerStore();
  const [isLoading, setIsLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // ✅ FIX: Use proper timeout type for browser
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ✅ Fetch customers if not loaded
  useEffect(() => {
    if (customers.length === 0 && !storeLoading) {
      setIsLoading(true);
      fetchCustomers().finally(() => {
        setIsLoading(false);
      });
    }
  }, [customers.length, fetchCustomers, storeLoading]);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  // Filter customers locally
  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customers;
    const q = searchTerm.toLowerCase();
    return customers.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.nameUrdu?.includes(q) ||
      c.phone?.includes(q) ||
      formatPhone(c.phone).includes(q) ||
      c.cnic?.includes(q) ||
      formatCNIC(c.cnic).includes(q) ||
      (c.fatherName || c.father_name || '').toLowerCase().includes(q)
    );
  }, [customers, searchTerm]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (customer: any) => {
    onSelect(customer.id);
    setSearchTerm('');
    setShowDropdown(false);
    setIsFocused(false);
  };

  const handleInputFocus = () => {
    if (!disabled) {
      setIsFocused(true);
      setShowDropdown(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    setShowDropdown(true);
    if (!val) {
      onSelect('');
    }
  };

  // Display text in input when customer is selected
  const getInputDisplayValue = () => {
    if (searchTerm) return searchTerm;
    if (selectedCustomer && !showDropdown && !isFocused) {
      const name = isUrdu ? selectedCustomer.nameUrdu || selectedCustomer.name : selectedCustomer.name;
      return `${name} (${formatPhone(selectedCustomer.phone)})`;
    }
    return '';
  };

  const defaultPlaceholder = isUrdu ? 'گاہک تلاش کریں...' : 'Search customer...';

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          {/* Search Icon */}
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" />
            </svg>
          </div>
          <input
            ref={inputRef}
            type="text"
            inputMode="text"
            autoComplete="off"
            placeholder={placeholder || defaultPlaceholder}
            value={getInputDisplayValue()}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            disabled={disabled}
            className={`w-full pl-10 pr-4 py-2.5 border rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-colors
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              ${showDropdown ? 'ring-2 ring-blue-400 border-transparent' : 'border-gray-300 dark:border-gray-600'}`}
          />

          {/* Dropdown */}
          {showDropdown && !disabled && (
            <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-y-auto" style={{ maxHeight: '280px' }}>
                {isLoading ? (
                  <div className="px-4 py-6 text-sm text-gray-500 text-center">
                    {isUrdu ? 'لوڈ ہو رہا ہے...' : 'Loading...'}
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-gray-500 text-center">
                    {isUrdu ? 'کوئی گاہک نہیں ملا' : t('no_customers_found')}
                  </div>
                ) : (
                  filteredCustomers.map((c: any) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelect(c)}
                      className={`w-full text-left px-4 py-3 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 border-b border-gray-100 dark:border-gray-600 last:border-0 transition-colors ${
                        c.id === selectedCustomerId ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                      }`}
                    >
                      <div className="font-semibold text-gray-800 dark:text-gray-200">
                        {isUrdu ? c.nameUrdu || c.name : c.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 space-x-1">
                        <span dir="ltr" style={{ unicodeBidi: 'bidi-override' }}>
                          {formatPhone(c.phone)}
                        </span>
                        {(c.fatherName || c.father_name) && (
                          <>
                            <span>|</span>
                            <span>{c.fatherName || c.father_name}</span>
                          </>
                        )}
                        {c.cnic && (
                          <>
                            <span>|</span>
                            <span dir="ltr" style={{ unicodeBidi: 'bidi-override' }}>
                              {formatCNIC(c.cnic)}
                            </span>
                          </>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Add Customer Button */}
        {onAddNew && !disabled && (
          <button
            type="button"
            onClick={onAddNew}
            className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold whitespace-nowrap hover:bg-emerald-700 transition-colors"
          >
            + {t('add_customer')}
          </button>
        )}
      </div>
    </div>
  );
};

export default CustomerSearch;