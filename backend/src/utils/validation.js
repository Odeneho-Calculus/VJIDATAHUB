/**
 * Validates a Ghanaian phone number against the selected network.
 * MTN Prefixes: 024, 025, 053, 054, 055, 059, 023
 * AirtelTigo Prefixes: 026, 027, 056, 057
 * Telecel Prefixes: 020, 050
 * 
 * @param {string} number - The phone number to validate
 * @param {string} network - The network name (e.g., 'Express(MTN)', 'Telecel', 'Airteltigo')
 * @returns {boolean} - True if valid, false otherwise
 */
const isValidNetworkNumber = (number, network) => {
    if (!number || !network) return false;
    
    // Normalize number: remove spaces and non-digits
    const cleanNumber = number.replace(/\D/g, '');
    
    // Ghanaian numbers should be 10 digits starting with 0
    if (cleanNumber.length !== 10 || !cleanNumber.startsWith('0')) {
        return false;
    }
    
    const prefix = cleanNumber.substring(0, 3);
    const normalizedNetwork = network.toLowerCase();
    
    const mtnPrefixes = ['024', '025', '053', '054', '055', '059', '023'];
    const atPrefixes = ['026', '027', '056', '057'];
    const telecelPrefixes = ['020', '050'];
    
    if (normalizedNetwork.includes('mtn')) {
        return mtnPrefixes.includes(prefix);
    } else if (normalizedNetwork.includes('airteltigo') || normalizedNetwork.includes('at')) {
        return atPrefixes.includes(prefix);
    } else if (normalizedNetwork.includes('telecel') || normalizedNetwork.includes('vodafone')) {
        return telecelPrefixes.includes(prefix);
    }
    
    // If network is unknown, we allow it but log a warning
    console.warn(`[Validation] Unknown network for validation: ${network}`);
    return true;
};

module.exports = {
    isValidNetworkNumber,
};
