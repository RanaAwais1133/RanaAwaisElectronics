package validator

import (
	"errors"
	"regexp"
	"strings"
)

// Standard Pakistani phone number: 03XX-XXXXXXX (after formatting) or 3XX-XXXXXXX
var phoneRegex = regexp.MustCompile(`^(?:03\d{2}-\d{7}|\d{3}-\d{6,7})$`)

// Standard CNIC: 5-7-1 pattern, e.g., 34101-3035778-3
var cnicRegex = regexp.MustCompile(`^\d{5}-\d{7}-\d{1}$`)

// FormatPhone inserts hyphen after 4 digits (03XX -> 03XX-) or after 3 digits (3XX -> 3XX-)
func FormatPhone(phone string) string {
	// Remove existing non-digits to get raw digits
	digits := strings.Map(func(r rune) rune {
		if r >= '0' && r <= '9' {
			return r
		}
		return -1
	}, phone)

	// If already in valid format (03XX-XXXXXXX or 3XX-XXXXXXX), return as-is
	if phoneRegex.MatchString(phone) {
		return phone
	}

	// Handle 11-digit numbers starting with 03 (03XX-XXXXXXX)
	if len(digits) == 11 && digits[:2] == "03" {
		return digits[:4] + "-" + digits[4:]
	}

	// Handle 10-digit numbers starting with 3 (3XX-XXXXXXX)
	if len(digits) == 10 && digits[0] == '3' {
		return digits[:3] + "-" + digits[3:]
	}

	// Handle 12-digit numbers already formatted (03XX-XXXXXXX with hyphen = 12 chars)
	// This catches cases where the phone has hyphen but regex didn't match due to digit count
	if len(digits) == 11 && strings.Contains(phone, "-") {
		return digits[:4] + "-" + digits[4:]
	}

	// Handle 11-digit numbers already formatted (3XX-XXXXXXX with hyphen = 11 chars)
	if len(digits) == 10 && strings.Contains(phone, "-") {
		return digits[:3] + "-" + digits[3:]
	}

	// Already formatted or different format
	if strings.Contains(phone, "-") {
		return phone
	}

	return phone
}

// FormatCNIC inserts hyphens: 3410130357783 -> 34101-3035778-3
func FormatCNIC(cnic string) string {
	digits := strings.Map(func(r rune) rune {
		if r >= '0' && r <= '9' {
			return r
		}
		return -1
	}, cnic)
	if len(digits) == 13 {
		return digits[:5] + "-" + digits[5:12] + "-" + digits[12:]
	}
	return cnic
}

// IsValidPhone checks if the phone matches the standard format (after formatting).
func IsValidPhone(phone string) bool {
	return phoneRegex.MatchString(phone)
}

// IsValidCNIC checks if the CNIC matches the standard format.
func IsValidCNIC(cnic string) bool {
	return cnicRegex.MatchString(cnic)
}

// SanitizePhoneAndCNIC takes raw input, formats them, and returns error if invalid.
func SanitizePhoneAndCNIC(phone, cnic string) (string, string, error) {
	p := FormatPhone(phone)
	if !IsValidPhone(p) {
		return "", "", errors.New("invalid phone number format (03XX-XXXXXXX)")
	}
	c := FormatCNIC(cnic)
	if cnic != "" && !IsValidCNIC(c) {
		return "", "", errors.New("invalid CNIC format (XXXXX-XXXXXXX-X)")
	}
	return p, c, nil
}
