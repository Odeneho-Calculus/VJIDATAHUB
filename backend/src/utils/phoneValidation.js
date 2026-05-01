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

  const phoneStr = String(phone);

  // Check if it's exactly 10 digits and contains only numeric characters
  if (!/^\d{10}$/.test(phoneStr)) {
    let error;
    if (phoneStr.length !== 10) {
      error = `Phone number must be exactly 10 digits (received ${phoneStr.length})`;
    } else {
      error = 'Phone number must contain only numeric characters (no letters, spaces, dashes, or special characters)';
    }
    return {
      isValid: false,
      error,
      normalized: null
    };
  }

  // Check if it starts with 0
  if (!phoneStr.startsWith('0')) {
    return {
      isValid: false,
      error: 'Phone number must start with 0',
      normalized: null
    };
  }

  return {
    isValid: true,
    error: null,
    normalized: phoneStr // Returns in format: 0XXXXXXXXX
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
