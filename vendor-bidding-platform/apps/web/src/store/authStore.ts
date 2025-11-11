import { create } from 'zustand';
import api from '@/lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'PROPERTY_MANAGER' | 'VENDOR' | 'ADMIN';
  phone?: string;
  company?: string;
}

interface AuthStore {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  isLoading: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/auth/login', { email, password });
      const { user, token } = response.data;

      localStorage.setItem('token', token);
      set({ user, token, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (data: any) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/auth/register', data);
      const { user, token } = response.data;

      localStorage.setItem('token', token);
      set({ user, token, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },

  fetchUser: async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await api.get('/auth/me');
      set({ user: response.data });
    } catch (error) {
      localStorage.removeItem('token');
      set({ user: null, token: null });
    }
  },
}));
