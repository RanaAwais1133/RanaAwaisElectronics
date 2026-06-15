/**
 * Formats a CNIC number for display: shows the actual CNIC in proper format
 * e.g. "3410130357783" → "34101-3035778-3"
 * e.g. "34101-3035778-3" → "34101-3035778-3"
 */
export const maskCNIC = (cnic: string): string => {
  if (!cnic) return '';
  const digits = cnic.replace(/\D/g, '');
  if (digits.length !== 13) return cnic; // fallback: show as-is if invalid
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
};
