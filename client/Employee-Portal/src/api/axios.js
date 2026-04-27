import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_URL?.trim() || 'http://localhost:5000/api';
const TOKEN_KEY = 'employee-portal-token';
const USER_KEY = 'employee-portal-user';

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export { TOKEN_KEY, USER_KEY };
export default api;
