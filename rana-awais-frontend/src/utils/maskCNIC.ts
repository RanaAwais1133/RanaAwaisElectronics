/**
 * Formats a CNIC number for display: shows the actual CNIC in proper format
 * e.g. "3410130357783" → "34101-3035778-3"
 * e.g. "34101-3035778-3" → "34101-3035778-3"
 */
export const maskCNIC = (cnic: string): string => {
  if (!cnic) return '';
  
  // Remove all non-digit characters
  const digits = cnic.replace(/\D/g, '');
  
  // If not 13 digits, return as-is (fallback)
  if (digits.length !== 13) return cnic;
  
  // Format: 5-7-1 (XXXXX-XXXXXXX-X)
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
};

/**
 * Mask CNIC with asterisks for privacy (shows only last 4 digits)
 * e.g. "34101-3035778-3" → "XXXXX-XXXXXXX-XXXX"
 * e.g. "34101-3035778-3" → "XXXXX-XXXXXXX-5778"
 */
export const maskCNICPartial = (cnic: string, showLast = 4): string => {
  if (!cnic) return '';
  
  const formatted = maskCNIC(cnic);
  if (formatted === cnic && cnic.replace(/\D/g, '').length !== 13) return cnic;
  
  const parts = formatted.split('-');
  if (parts.length !== 3) return formatted;
  
  const first = parts[0].replace(/\d/g, 'X');
  const second = parts[1].replace(/\d/g, 'X');
  const last = parts[2];
  
  if (showLast > 0) {
    const visible = last.slice(-showLast);
    const masked = last.slice(0, last.length - showLast).replace(/\d/g, 'X');
    return `${first}-${second}-${masked}${visible}`;
  }
  
  return `${first}-${second}-${last.replace(/\d/g, 'X')}`;
};

/**
 * Validate CNIC format (13 digits, optionally with hyphens)
 */
export const isValidCNIC = (cnic: string): boolean => {
  if (!cnic) return false;
  const digits = cnic.replace(/\D/g, '');
  return digits.length === 13 && /^\d+$/.test(digits);
};

/**
 * Get CNIC without formatting (raw digits only)
 */
export const getCNICDigits = (cnic: string): string => {
  if (!cnic) return '';
  return cnic.replace(/\D/g, '');
};

/**
 * Format CNIC with custom separators
 */
export const formatCNICWithSeparator = (
  cnic: string,
  separator = '-',
  groups: number[] = [5, 7, 1]
): string => {
  if (!cnic) return '';
  
  const digits = cnic.replace(/\D/g, '');
  if (digits.length !== 13) return cnic;
  
  let result = '';
  let index = 0;
  for (const group of groups) {
    if (index > 0) result += separator;
    result += digits.slice(index, index + group);
    index += group;
  }
  return result;
};

export default maskCNIC;