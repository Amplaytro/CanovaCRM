import axios from 'axios';

const normalizeApiBaseUrl = (value, fallback) => {
  const baseUrl = (value?.trim() || fallback).replace(/\/+$/, '');
  return /\/api(?:\/|$)/.test(baseUrl) ? baseUrl : `${baseUrl}/api`;
};

const shouldUseApiProxy = () => (
  typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app')
);

const apiBaseUrl = shouldUseApiProxy()
  ? 'https://canova-crm-three.vercel.app/api'
  : normalizeApiBaseUrl(import.meta.env.VITE_API_URL, '/api');

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json'
  }
});

const clearStoredAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.dispatchEvent(new Event('canova-auth-cleared'));
};

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || '';
    const isAuthRequest = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/me');

    if (error.response && error.response.status === 401 && !isAuthRequest) {
      clearStoredAuth();
    }
    return Promise.reject(error);
  }
);

export default api;
