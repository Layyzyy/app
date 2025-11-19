import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  phone: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  patient: any | null;
  token: string | null;
  login: (phone: string, otp: string) => Promise<boolean>;
  logout: () => Promise<void>;
  setPatient: (patient: any) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [patient, setPatientState] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load user from storage on mount
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      const storedToken = await AsyncStorage.getItem('token');
      const storedPatient = await AsyncStorage.getItem('patient');
      
      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
        if (storedPatient) {
          setPatientState(JSON.parse(storedPatient));
        }
      }
    } catch (error) {
      console.error('Load user error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (phone: string, otp: string): Promise<boolean> => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp })
      });

      const data = await response.json();
      
      if (data.success) {
        setUser(data.user);
        setToken(data.token);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        await AsyncStorage.setItem('token', data.token);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    setPatientState(null);
    await AsyncStorage.multiRemove(['user', 'token', 'patient']);
  };

  const setPatient = async (patient: any) => {
    setPatientState(patient);
    await AsyncStorage.setItem('patient', JSON.stringify(patient));
  };

  return (
    <AuthContext.Provider value={{ user, patient, token, login, logout, setPatient, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
