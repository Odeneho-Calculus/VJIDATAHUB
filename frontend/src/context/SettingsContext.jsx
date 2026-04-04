import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { publicAPI } from '../services/api';
import { getSocketBaseUrl } from '../utils/apiBaseUrl';

const SettingsContext = createContext();

const SOCKET_URL = getSocketBaseUrl();

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({ vtuProvider: 'xpresdata' });
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await publicAPI.getSystemSettings();
      if (response.success) {
        setSettings(response.settings);
      }
    } catch (err) {
      console.error('Failed to fetch system settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Real-time VTU provider switching via socket
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_vtu_updates');
    });

    socket.on('vtu_provider_changed', ({ provider }) => {
      setSettings(prev => ({ ...prev, vtuProvider: provider }));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const updateVtuProvider = (newProvider) => {
    setSettings(prev => ({ ...prev, vtuProvider: newProvider }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateVtuProvider, refreshSettings: fetchSettings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
