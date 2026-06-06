/**
 * Provider name mapping utility.
 * Full internal names are used in DB/models/code.
 * Abbreviated codes are used in API responses exposed to users/frontend.
 */

const PROVIDER_MAP = {
  topza: 'tp',
  skdataplug: 'sk',
};

const REVERSE_MAP = {
  tp: 'topza',
  sk: 'skdataplug',
};

/**
 * Convert internal provider name to abbreviated code for API responses.
 * Falls back to the input if unknown.
 * @param {string} provider - internal name (e.g. 'topza', 'skdataplug')
 * @returns {string} abbreviated code (e.g. 'tp', 'sk')
 */
exports.toAbbreviation = (provider) => {
  if (!provider) return provider;
  return PROVIDER_MAP[String(provider).toLowerCase()] || provider;
};

/**
 * Convert abbreviated code back to internal provider name.
 * Falls back to the input if unknown.
 * @param {string} code - abbreviated code (e.g. 'tp', 'sk')
 * @returns {string} internal name (e.g. 'topza', 'skdataplug')
 */
exports.fromAbbreviation = (code) => {
  if (!code) return code;
  return REVERSE_MAP[String(code).toLowerCase()] || code;
};
