import axios from 'axios';
import { ApiResponse, LoginRequest, LoginResponse, User } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sessionId');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear invalid token
      localStorage.removeItem('sessionId');
      localStorage.removeItem('user');
      // Redirect to login or emit auth error event
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
    return Promise.reject(error);
  }
);

export class AuthService {
  async login(password: string): Promise<LoginResponse> {
    try {
      const response = await api.post<ApiResponse<LoginResponse>>('/auth/login', {
        password,
      } as LoginRequest);

      if (response.data.success && response.data.data) {
        const { sessionId, user } = response.data.data;
        
        // Store auth data in localStorage
        localStorage.setItem('sessionId', sessionId);
        localStorage.setItem('user', JSON.stringify(user));
        
        return response.data.data;
      } else {
        throw new Error(response.data.error?.message || 'Login failed');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.error?.message || 'Login failed');
      }
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Even if logout fails on server, clear local storage
      console.warn('Logout request failed:', error);
    } finally {
      localStorage.removeItem('sessionId');
      localStorage.removeItem('user');
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await api.get<ApiResponse<{ user: User }>>('/auth/me');
      
      if (response.data.success && response.data.data) {
        return response.data.data.user;
      }
      return null;
    } catch (error) {
      console.warn('Get current user failed:', error);
      return null;
    }
  }

  async validateSession(): Promise<boolean> {
    try {
      const response = await api.get<ApiResponse<{ valid: boolean }>>('/auth/validate');
      return response.data.success && response.data.data?.valid === true;
    } catch (error) {
      return false;
    }
  }

  getStoredUser(): User | null {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      return null;
    }
  }

  getStoredToken(): string | null {
    return localStorage.getItem('sessionId');
  }

  isAuthenticated(): boolean {
    return !!(this.getStoredToken() && this.getStoredUser());
  }
}

export const authService = new AuthService();