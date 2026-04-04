/**
 * Format amount with abbreviations (K, M, B, T)
 * @param {number} amount - The amount to format
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted amount (e.g., "1.2K", "2.5M")
 */
export const formatNumberAbbreviated = (amount, decimals = 1) => {
  const num = Math.abs(amount || 0);
  const sign = amount < 0 ? '-' : '';

  if (num >= 1e12) {
    return sign + (num / 1e12).toFixed(decimals) + 'T';
  }
  if (num >= 1e9) {
    return sign + (num / 1e9).toFixed(decimals) + 'B';
  }
  if (num >= 1e6) {
    return sign + (num / 1e6).toFixed(decimals) + 'M';
  }
  if (num >= 1e3) {
    return sign + (num / 1e3).toFixed(decimals) + 'K';
  }

  return sign + num.toFixed(decimals);
};

/**
 * Format currency with GH₵ prefix and abbreviated numbers
 * @param {number} amount - The amount to format
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted currency (e.g., "GH₵1.2K", "GH₵2.5M")
 */
export const formatCurrencyAbbreviated = (amount, decimals = 1) => {
  return `GH₵${formatNumberAbbreviated(amount, decimals)}`;
};

/**
 * Format regular currency (legacy format)
 * @param {number} amount - The amount to format
 * @returns {string} Formatted currency (e.g., "GH₵ 1234.56")
 */
export const formatCurrency = (amount) => {
  return `GH₵ ${(amount || 0).toFixed(2)}`;
};
