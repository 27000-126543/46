import { useState, useEffect, useCallback } from 'react';
import { auth } from '../lib/api';
import type { Player } from '../types';

interface UseAuthReturn {
  user: Player | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<Player | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      loadUser();
    }
  }, []);

  const loadUser = async () => {
    const result = await auth.getMe();
    if (result.success && result.data) {
      setUser(result.data);
      setIsAuthenticated(true);
    } else {
      localStorage.removeItem('token');
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const login = useCallback(async (username: string, password: string) => {
    const result = await auth.login(username, password);
    if (result.success && result.data) {
      localStorage.setItem('token', result.data.token);
      setUser(result.data.user);
      setIsAuthenticated(true);
      return { success: true };
    }
    return { success: false, message: result.message };
  }, []);

  const register = useCallback(async (username: string, email: string, password: string) => {
    const result = await auth.register(username, email, password);
    if (result.success && result.data) {
      localStorage.setItem('token', result.data.token);
      setUser(result.data.user);
      setIsAuthenticated(true);
      return { success: true };
    }
    return { success: false, message: result.message };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  return { user, isAuthenticated, login, register, logout };
}

export default useAuth;
