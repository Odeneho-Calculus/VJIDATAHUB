const LOCAL_API_BASE = 'http://localhost:5000/api';
const PROD_API_BASE = 'https://vjidatahub.onrender.com/api';

const normalizeApiBaseUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return null;
  }

  const trimmed = rawUrl.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    const pathname = parsed.pathname.replace(/\/+$/, '');
    parsed.pathname = pathname.endsWith('/api') ? pathname : `${pathname || ''}/api`;
    return parsed.toString().replace(/\/+$/, '');
  } catch (_error) {
    return null;
  }
};

export const getApiBaseUrl = () => {
  const fromEnv = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);
  if (fromEnv) {
    return fromEnv;
  }

  if (window.location.hostname === 'localhost') {
    return LOCAL_API_BASE;
  }

  return PROD_API_BASE;
};

export const getSocketBaseUrl = () => getApiBaseUrl().replace(/\/api$/, '');
