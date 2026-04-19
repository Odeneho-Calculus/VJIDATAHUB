/**
 * Phone number validation utility for Ghana phone numbers
 * Validates 10-digit numbers in various formats
 */

/**
 * Validates a phone number (must be 10 digits)
 * @param {string} phone - Phone number to validate
 * @returns {object} { isValid: boolean, error: string | null, formatted: string }
 */
export const validatePhoneNumber = (phone) => {
  if (!phone) {
    return { isValid: false, error: 'Phone number is required', formatted: null };
  }

  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // Handle +233 country code - convert to 0 format
  let normalized;
  if (cleaned.startsWith('233')) {
    normalized = '0' + cleaned.slice(3);
  } else {
    normalized = cleaned;
  }

  // Check if it's exactly 10 digits
  if (normalized.length !== 10) {
    return {
      isValid: false,
      error: `Phone number must be 10 digits (you entered ${normalized.length})`,
      formatted: null
    };
  }

  // Check if it starts with 0
  if (!normalized.startsWith('0')) {
    return {
      isValid: false,
      error: 'Phone number must start with 0',
      formatted: null
    };
  }

  // Validate that all characters are digits
  if (!/^\d+$/.test(normalized)) {
    return {
      isValid: false,
      error: 'Phone number must contain only digits',
      formatted: null
    };
  }

  return {
    isValid: true,
    error: null,
    formatted: normalized // Returns in format: 0XXXXXXXXX
  };
};

/**
 * Format phone number for display
 * @param {string} phone - Phone number to format
 * @returns {string} Formatted phone number (0XXX XXX XXXX)
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  const validation = validatePhoneNumber(phone);
  if (!validation.isValid) return phone; // Return original if invalid
  const normalized = validation.formatted;
  return `${normalized.slice(0, 4)} ${normalized.slice(4, 7)} ${normalized.slice(7)}`;
};

/**
 * Normalize phone number to standard format
 * @param {string} phone - Phone number to normalize
 * @returns {string} Normalized number (0XXXXXXXXX) or empty string if invalid
 */
export const normalizePhoneNumber = (phone) => {
  if (!phone) return '';
  const validation = validatePhoneNumber(phone);
  return validation.isValid ? validation.formatted : '';
};

/**
 * Check if phone number is valid (boolean only)
 * @param {string} phone - Phone number to check
 * @returns {boolean}
 */
export const isValidPhoneNumber = (phone) => {
  return validatePhoneNumber(phone).isValid;
};
