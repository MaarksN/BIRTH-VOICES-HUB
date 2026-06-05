import { api } from './api';
import { User } from '../types';

const TOKEN_KEY = 'access_token';
const USER_KEY = 'user_info';

export const auth = {
  getToken: () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(TOKEN_KEY);
    }
    return null;
  },

  setToken: (token: string, user: User) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  },

  login: async (email: string, password: string) => {
    const { token, user } = await api.login(email, password);
    auth.setToken(token, user);
    return user;
  },

  register: async (companyName: string, email: string, password: string, consentSource = 'register_form') => {
    const { token, user } = await api.register(companyName, email, password, consentSource);
    auth.setToken(token, user);
    return user;
  },

  refreshUser: async () => {
    const { user } = await api.me();
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
    return user;
  },

  logout: async () => {
    try {
      if (auth.getToken()) {
        await api.logout();
      }
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        window.location.href = '/#/login';
      }
    }
  },

  getUser: (): User | null => {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(USER_KEY);
      if (!raw) return null;

      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
    return null;
  },
};
