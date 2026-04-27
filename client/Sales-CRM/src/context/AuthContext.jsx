import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/axios';

export const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    let isActive = true;

    if (token) {
      api.get('/auth/me')
        .then(res => {
          if (isActive) {
            setUser(res.data);
            setLoading(false);
          }
        })
        .catch(() => {
          if (isActive) {
            logout();
            setLoading(false);
          }
        });
    } else {
      // Auto-login as admin if no token
      api.post('/auth/login', { email: 'admin@canovacrm.com', password: 'admin123' })
        .then(res => {
          if (isActive) {
            const { token: newToken, ...userData } = res.data;
            localStorage.setItem('token', newToken);
            localStorage.setItem('user', JSON.stringify(userData));
            setToken(newToken);
            setUser(userData);
            setLoading(false);
          }
        })
        .catch(() => {
          if (isActive) {
            setUser(null);
            setLoading(false);
          }
        });
    }

    return () => {
      isActive = false;
    };
  }, [logout, token]);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, ...userData } = res.data;
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    return userData;
  }, []);

  const acceptExternalAuth = useCallback((nextToken, userData) => {
    localStorage.setItem('token', nextToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(nextToken);
    setUser(userData);
  }, []);

  const authValue = useMemo(
    () => ({ user, token, login, logout, loading, acceptExternalAuth }),
    [acceptExternalAuth, loading, login, logout, token, user]
  );

  return (
    <AuthContext.Provider value={authValue}>
      {children}
    </AuthContext.Provider>
  );
};
