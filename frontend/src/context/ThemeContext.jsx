import React, { createContext, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('dark');
    html.style.colorScheme = 'light';
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark: false }}>
      {children}
    </ThemeContext.Provider>
  );
}
