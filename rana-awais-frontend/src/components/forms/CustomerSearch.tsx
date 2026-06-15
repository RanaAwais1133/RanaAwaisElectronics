import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCustomerStore } from '../../store/useCustomerStore';
import { formatPhone, formatCNIC } from '../../utils/helpers';

interface CustomerSearchProps {
  selectedCustomerId: string;
  onSelect: (customerId: string) => void;
  onAddNew?: () => void;
}

const CustomerSearch: React.FC<CustomerSearchProps> = ({ selectedCustomerId, onSelect, onAddNew }) => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const { customers } = useCustomerStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  // Filter customers locally - FAST (no API call)
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
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (customer: any) => {
    onSelect(customer.id);
    setSearchTerm('');
    setShowDropdown(false);
  };

  const handleInputFocus = () => {
    setShowDropdown(true);
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
    if (selectedCustomer && !showDropdown) {
      const name = isUrdu ? selectedCustomer.nameUrdu || selectedCustomer.name : selectedCustomer.name;
      return `${name} (${formatPhone(selectedCustomer.phone)})`;
    }
    return '';
  };

  return (
    <div ref={wrapperRef} className="relative">
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
            placeholder={isUrdu ? 'گاہک تلاش کریں...' : 'Search customer...'}
            value={getInputDisplayValue()}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            className="w-full pl-10 pr-4 py-2.5 border rounded-xl bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none"
          />

          {/* Dropdown */}
          {showDropdown && (
            <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-700 border rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-y-auto" style={{ maxHeight: '280px' }}>
                {filteredCustomers.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-gray-500 text-center">
                    {isUrdu ? 'کوئی گاہک نہیں ملا' : t('no_customers_found')}
                  </p>
                ) : (
                  filteredCustomers.map((c: any) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelect(c)}
                      className={`w-full text-left px-4 py-3 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 border-b last:border-0 transition-colors ${
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

        {/* Add Customer Button - only show if onAddNew is provided */}
        {onAddNew && (
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
