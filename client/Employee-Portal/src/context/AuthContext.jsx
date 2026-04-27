import { createContext, useContext, useEffect, useState } from 'react';
import api, { TOKEN_KEY, USER_KEY } from '../api/axios';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => {
    const rawUser = localStorage.getItem(USER_KEY);
    return rawUser ? JSON.parse(rawUser) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      if (!token) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      try {
        const { data } = await api.get('/auth/me');

        if (!isMounted) {
          return;
        }

        setUser(data);
        localStorage.setItem(USER_KEY, JSON.stringify(data));
      } catch {
        if (!isMounted) {
          return;
        }

        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      isMounted = false;
    };
  }, [token]);

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    const { token: nextToken, ...userData } = data;

    if (userData.role !== 'admin') {
      localStorage.setItem(TOKEN_KEY, nextToken);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      setToken(nextToken);
      setUser(userData);
    }

    return data;
  }

  async function logout() {
    try {
      if (token) {
        await api.post('/auth/logout');
      }
    } catch {
      // Clear local session even if the logout activity call fails.
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem('employee-portal-timing');
      setToken(null);
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
