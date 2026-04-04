import api from './api';

const API_URL = '/upgrade';

const getUpgradeStatus = async () => {
    const response = await api.get(`${API_URL}/status`);
    return response;
};

const initializeUpgrade = async (paymentMethod = 'paystack') => {
    const response = await api.post(`${API_URL}/initialize`, { paymentMethod });
    return response;
};

const verifyUpgrade = async (reference) => {
    const response = await api.post(`${API_URL}/verify`, { reference });
    return response;
};

const switchRole = async (targetRole) => {
    const response = await api.post(`${API_URL}/switch-role`, { targetRole });
    return response;
};

const upgradeService = {
    getUpgradeStatus,
    initializeUpgrade,
    verifyUpgrade,
    switchRole
};

export default upgradeService;
