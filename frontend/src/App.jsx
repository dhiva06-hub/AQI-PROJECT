import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import MapPage from './pages/MapPage';
import HistoryPage from './pages/HistoryPage';
import StationsPage from './pages/StationsPage';
import AlertsPage from './pages/AlertsPage';
import LoginPage from './pages/LoginPage';
import TechStackDrawer from './components/TechStackDrawer';
import { useAQI } from './hooks/useAQI';

function ProtectedRoute({ children, isAuthenticated }) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('aqi_token'));
  const { connectionStatus } = useAQI();
  const [techStackOpen, setTechStackOpen] = useState(false);

  useEffect(() => {
    const handleStorageChange = () => {
      setToken(localStorage.getItem('aqi_token'));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLoginSuccess = (newToken) => {
    setToken(newToken);
  };

  const handleLogout = () => {
    setToken(null);
  };

  const isAuthenticated = Boolean(token);

  return (
    <div className="app-shell">
      {isAuthenticated && (
        <Navbar
          connectionStatus={connectionStatus}
          onToggleTechStack={() => setTechStackOpen(true)}
          onLogout={handleLogout}
        />
      )}
      <main className={isAuthenticated ? "main-content" : "main-content-login"} id="main-content" role="main">
        <Routes>
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                <Navigate to="/" replace />
              ) : (
                <LoginPage onLoginSuccess={handleLoginSuccess} />
              )
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/map"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <MapPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <HistoryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/stations"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <StationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/alerts"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <AlertsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />} />
        </Routes>
      </main>

      {isAuthenticated && (
        <footer
          style={{
            borderTop: '1px solid var(--border)',
            padding: '16px 28px',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            background: 'var(--panel)',
            marginTop: 'auto',
          }}
        >
          <div
            style={{
              maxWidth: 1360,
              margin: '0 auto',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="pulse-indicator-dot" />
              <span>
                <strong>AQI Aggregator</strong> · Environmental Intelligence · Indian CPCB & US EPA Standards · Real-Time OpenAQ
              </span>
            </div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setTechStackOpen(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--forest-primary)',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px',
                }}
              >
                System Architecture & Telemetry Pipeline
              </button>
              <span style={{ color: 'var(--border)' }}>|</span>
              <span style={{ color: 'var(--text-dim)' }}>Multi-Region Sensor Network</span>
            </div>
          </div>
        </footer>
      )}

      <TechStackDrawer isOpen={techStackOpen} onClose={() => setTechStackOpen(false)} />
    </div>
  );
}
