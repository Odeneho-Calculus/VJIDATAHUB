/**
 * Phone number validation utility for Ghana phone numbers (Backend)
 * Validates 10-digit numbers in various formats
 */

/**
 * Validates a phone number (must be 10 digits)
 * @param {string} phone - Phone number to validate
 * @returns {object} { isValid: boolean, error: string | null, normalized: string }
 */
const validatePhoneNumber = (phone) => {
  if (!phone) {
    return { isValid: false, error: 'Phone number is required', normalized: null };
  }

  // Convert to string and remove all non-digit characters
  const cleaned = String(phone).replace(/\D/g, '');

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
      error: `Phone number must be 10 digits (received ${normalized.length})`,
      normalized: null
    };
  }

  // Check if it starts with 0
  if (!normalized.startsWith('0')) {
    return {
      isValid: false,
      error: 'Phone number must start with 0',
      normalized: null
    };
  }

  // Validate that all characters are digits
  if (!/^\d+$/.test(normalized)) {
    return {
      isValid: false,
      error: 'Phone number must contain only digits',
      normalized: null
    };
  }

  return {
    isValid: true,
    error: null,
    normalized // Returns in format: 0XXXXXXXXX
  };
};

/**
 * Normalize phone number to standard format
 * @param {string} phone - Phone number to normalize
 * @returns {string} Normalized number (0XXXXXXXXX) or throws error if invalid
 */
const normalizePhoneNumber = (phone) => {
  const validation = validatePhoneNumber(phone);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }
  return validation.normalized;
};

/**
 * Check if phone number is valid (boolean only)
 * @param {string} phone - Phone number to check
 * @returns {boolean}
 */
const isValidPhoneNumber = (phone) => {
  return validatePhoneNumber(phone).isValid;
};

module.exports = {
  validatePhoneNumber,
  normalizePhoneNumber,
  isValidPhoneNumber
};
