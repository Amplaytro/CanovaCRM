import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar/Sidebar';
import Dashboard from './pages/Dashboard/Dashboard';
import Employees from './pages/Employees/Employees';
import Leads from './pages/Leads/Leads';
import Settings from './pages/Settings/Settings';
import './App.css';

const DESIGN_WIDTH = 1440;
const DESIGN_HEIGHT = 1024;

const getAppScale = () => {
  if (typeof window === 'undefined') {
    return { scaleX: 1, scaleY: 1 };
  }

  return {
    scaleX: window.innerWidth / DESIGN_WIDTH,
    scaleY: window.innerHeight / DESIGN_HEIGHT,
  };
};

const AuthBridge = () => {
  const { hash } = useLocation();
  const { acceptExternalAuth } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
    const bridgeToken = params.get('token');
    const userPayload = params.get('user');

    if (!bridgeToken || !userPayload) {
      window.location.replace('/dashboard');
      return;
    }

    try {
      const parsedUser = JSON.parse(userPayload);
      acceptExternalAuth(bridgeToken, parsedUser);
      window.location.replace('/dashboard');
    } catch {
      window.location.replace('/dashboard');
    }
  }, [acceptExternalAuth, hash]);

  return null;
};

const ProtectedRoute = ({ children }) => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return children;
};

const AppLayout = () => {
  const [appScale, setAppScale] = useState(getAppScale);

  useEffect(() => {
    const handleResize = () => {
      setAppScale(getAppScale());
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="app-shell">
      <div
        className="app-layout-stage"
      >
        <div
          className="app-layout"
          style={{ transform: `scale(${appScale.scaleX}, ${appScale.scaleY})` }}
        >
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/auth-bridge" element={<AuthBridge />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          } />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
