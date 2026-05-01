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

  const phoneStr = String(phone);

  // Check if it's exactly 10 digits and contains only numeric characters
  if (!/^\d{10}$/.test(phoneStr)) {
    let error;
    if (phoneStr.length !== 10) {
      error = `Phone number must be exactly 10 digits (you entered ${phoneStr.length})`;
    } else {
      error = 'Phone number must contain only numeric characters (no letters, spaces, dashes, or special characters)';
    }
    return {
      isValid: false,
      error,
      formatted: null
    };
  }

  // Check if it starts with 0
  if (!phoneStr.startsWith('0')) {
    return {
      isValid: false,
      error: 'Phone number must start with 0',
      formatted: null
    };
  }

  return {
    isValid: true,
    error: null,
    formatted: phoneStr // Returns in format: 0XXXXXXXXX
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
