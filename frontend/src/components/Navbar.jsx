import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  IconActivity,
  IconMap,
  IconTrendingUp,
  IconSun,
  IconMoon,
  IconBell,
  IconUser,
  IconSliders,
  IconCpu,
  IconLeaf,
} from './Icons';

export default function Navbar({ connectionStatus, onToggleTechStack, onLogout }) {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('aqi_theme') === 'dark' ? 'dark' : 'light';
  });
  const token = localStorage.getItem('aqi_token');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('aqi_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleLogoutClick = () => {
    localStorage.removeItem('aqi_token');
    if (onLogout) onLogout();
    navigate('/login');
  };

  return (
    <header className="navbar" role="banner">
      <div className="brand-container">
        <div className="brand-logo" aria-hidden="true">
          <IconLeaf size={20} />
        </div>
        <div className="brand-title">
          <span className="brand-title-main">AQI Aggregator</span>
          <span className="brand-subtitle">Environmental Intelligence</span>
        </div>
      </div>

      <nav aria-label="Main Navigation">
        <ul className="nav-links">
          <li>
            <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <IconActivity size={15} />
              <span>Dashboard</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/map" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <IconMap size={15} />
              <span>Station Map</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/history" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <IconTrendingUp size={15} />
              <span>Historical Trends</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/stations" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <IconSliders size={15} />
              <span>Cities & Stations</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/alerts" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <IconBell size={15} />
              <span>Advisories</span>
            </NavLink>
          </li>
        </ul>
      </nav>

      <div className="nav-actions">
        {/* Connection status */}
        <div
          className="badge"
          title={connectionStatus === 'live' ? 'Connected via Socket.IO WebSocket stream' : 'Polling REST API Fallback'}
          style={{
            fontSize: '0.72rem',
            gap: 7,
            padding: '5px 12px',
            borderRadius: 'var(--radius-full)',
            background: connectionStatus === 'live' ? 'var(--green-light)' : 'var(--panel-2)',
            border: `1px solid ${connectionStatus === 'live' ? 'var(--green-border)' : 'var(--border)'}`,
            color: connectionStatus === 'live' ? 'var(--forest-primary)' : 'var(--text-muted)',
            fontWeight: 700,
          }}
        >
          <span
            className={connectionStatus === 'live' ? 'pulse-indicator-dot' : 'live-dot delayed'}
          />
          <span>{connectionStatus === 'live' ? 'LIVE STREAM' : 'SYNCING'}</span>
        </div>

        {onToggleTechStack && (
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={onToggleTechStack}
            title="System Architecture & Specs"
          >
            <IconCpu size={14} />
            <span>Architecture</span>
          </button>
        )}

        <button
          type="button"
          onClick={toggleTheme}
          className="btn-secondary btn-icon"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} theme`}
          aria-label="Toggle visual theme"
        >
          {theme === 'dark' ? <IconSun size={15} /> : <IconMoon size={15} />}
        </button>

        {token ? (
          <button type="button" onClick={handleLogoutClick} className="btn-secondary btn-sm" title="Log out">
            <IconUser size={14} />
            <span>Sign Out</span>
          </button>
        ) : (
          <NavLink to="/login" style={{ textDecoration: 'none' }}>
            <button type="button" className="btn-sm" style={{ background: 'var(--earth-brown)', borderColor: 'var(--earth-dark)' }}>
              <IconUser size={14} />
              <span>Sign In</span>
            </button>
          </NavLink>
        )}
      </div>
    </header>
  );
}
