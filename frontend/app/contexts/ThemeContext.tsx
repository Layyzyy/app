import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  colors: {
    background: string;
    card: string;
    text: string;
    textSecondary: string;
    primary: string;
    border: string;
    error: string;
    success: string;
    warning: string;
  };
}

const lightColors = {
  background: '#F5F5F5',
  card: '#FFFFFF',
  text: '#333333',
  textSecondary: '#666666',
  primary: '#0B6EFF',
  border: '#E0E0E0',
  error: '#FF4D4F',
  success: '#0BCB85',
  warning: '#FFA500',
};

const darkColors = {
  background: '#121212',
  card: '#1E1E1E',
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  primary: '#4A9EFF',
  border: '#333333',
  error: '#FF6B6B',
  success: '#51CF66',
  warning: '#FFB347',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const stored = await AsyncStorage.getItem('darkMode');
      if (stored !== null) {
        setIsDark(stored === 'true');
      }
    } catch (error) {
      console.error('Load theme error:', error);
    }
  };

  const toggleTheme = async () => {
    try {
      const newValue = !isDark;
      setIsDark(newValue);
      await AsyncStorage.setItem('darkMode', String(newValue));
    } catch (error) {
      console.error('Toggle theme error:', error);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        isDark,
        toggleTheme,
        colors: isDark ? darkColors : lightColors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
