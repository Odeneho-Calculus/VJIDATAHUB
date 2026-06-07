/**
 * Provider name mapping utility.
 * The backend returns abbreviated codes in API responses.
 * This maps between abbreviated codes and display names.
 */

const PROVIDER_MAP = {
  tp: { name: 'topza', display: 'Topza' },
  sk: { name: 'skdataplug', display: 'SKDataPlug' },
};

const REVERSE_MAP = {
  topza: 'tp',
  skdataplug: 'sk',
};

/**
 * Convert abbreviated code to internal name (for API requests).
 * @param {string} code - abbreviated code (e.g. 'tp', 'sk')
 * @returns {string} internal name (e.g. 'topza', 'skdataplug')
 */
export const toProviderName = (code) => {
  if (!code) return code;
  return PROVIDER_MAP[String(code).toLowerCase()]?.name || code;
};

/**
 * Convert internal name to abbreviated code (for API requests going to backend).
 * Actually the backend now expects abbreviated codes, so this is identity for known codes.
 * @param {string} name - internal name or code
 * @returns {string} abbreviated code (e.g. 'tp', 'sk')
 */
export const toAbbreviation = (name) => {
  if (!name) return name;
  return REVERSE_MAP[String(name).toLowerCase()] || name;
};

/**
 * Get display name for a provider code.
 * @param {string} code - abbreviated code (e.g. 'tp', 'sk')
 * @returns {string} display name (e.g. 'Topza', 'SKDataPlug')
 */
export const getProviderDisplayName = (code) => {
  if (!code) return code;
  return PROVIDER_MAP[String(code).toLowerCase()]?.display || code;
};

/**
 * Check if a value is the skdataplug provider (handles both old and new codes).
 * @param {string} value
 * @returns {boolean}
 */
export const isSkdataplug = (value) => {
  if (!value) return false;
  const v = String(value).toLowerCase();
  return v === 'sk' || v === 'skdataplug';
};

/**
 * Check if a value is the topza provider (handles both old and new codes).
 * @param {string} value
 * @returns {boolean}
 */
export const isTopza = (value) => {
  if (!value) return false;
  const v = String(value).toLowerCase();
  return v === 'tp' || v === 'topza';
};

/**
 * Get the active network catalog from system settings based on the active VTU provider.
 * Falls back to legacy networkCatalog if provider-specific catalog is not available.
 * @param {Object} settings - system settings object from SettingsContext
 * @returns {Array} array of network objects { name, slug, logoUrl, isActive }
 */
export const getActiveNetworkCatalog = (settings) => {
  if (!settings) return [];
  const provider = settings.vtuProvider || 'tp';
  if (isSkdataplug(provider)) {
    const catalog = settings.skdataplugNetworkCatalog;
    if (Array.isArray(catalog) && catalog.length > 0) return catalog;
  } else {
    const catalog = settings.topzaNetworkCatalog;
    if (Array.isArray(catalog) && catalog.length > 0) return catalog;
  }
  // Fallback to legacy networkCatalog
  return settings.networkCatalog || [];
};
