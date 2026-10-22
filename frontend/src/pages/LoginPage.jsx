import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthAPI } from '../services/api';
import {
  IconUser,
  IconMail,
  IconLock,
  IconEye,
  IconEyeOff,
  IconSparkles,
  IconArrowRight,
  IconLeaf,
  IconShieldCheck,
  IconAlertTriangle,
} from '../components/Icons';
import './LoginPage.css';

export default function LoginPage({ onLoginSuccess }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res =
        mode === 'login'
          ? await AuthAPI.login({ email: form.email, password: form.password })
          : await AuthAPI.register(form);

      if (res?.data?.token) {
        localStorage.setItem('aqi_token', res.data.token);
        if (onLoginSuccess) onLoginSuccess(res.data.token);
        navigate('/');
      } else {
        throw new Error('No authentication token received');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = () => {
    setForm({
      name: mode === 'register' ? 'Environmental Specialist' : '',
      email: 'demo@example.com',
      password: 'password123',
    });
    setError(null);
  };

  return (
    <div className="unified-login-page">
      <div className="unified-login-overlay" />
      <div className="unified-login-glow" />

      {/* Center Composition */}
      <div className="unified-login-content">
        {/* Unified Brand Header */}
        <header className="unified-brand-header">
          <div className="unified-brand-badge">
            <span className="pulse-indicator-dot" />
            <IconLeaf size={14} style={{ color: '#34d399' }} />
            <span>Environmental Intelligence Platform</span>
          </div>

          <h1 className="unified-title">
            <span className="unified-title-highlight">Real-Time Air Quality Index (AQI)</span>
            <br />
            Aggregator &amp; Mapping System
          </h1>

          <p className="unified-tagline">
            Monitor Air Quality. Understand Your Environment. Breathe Smarter.
          </p>
        </header>

        {/* Translucent Floating Login Card */}
        <main className="unified-card">
          <div className="unified-card-header">
            <div className="unified-card-icon-badge">
              <IconLeaf size={22} />
            </div>

            <div className="unified-portal-pill">
              <IconShieldCheck size={12} style={{ color: '#059669' }} />
              <span>System Portal Access</span>
            </div>

            <h2 className="unified-card-title">
              {mode === 'login' ? 'Sign In to Portal' : 'Create System Account'}
            </h2>
            <p className="unified-card-subtitle">
              {mode === 'login'
                ? 'Access live global station telemetry and interactive mapping'
                : 'Register to access real-time station analytics and air telemetry'}
            </p>
          </div>

          <form onSubmit={submit} className="unified-form">
            {mode === 'register' && (
              <div className="unified-field-group">
                <label className="unified-label" htmlFor="register-name">
                  Full Name
                </label>
                <div className="unified-input-wrapper">
                  <span className="unified-input-icon">
                    <IconUser size={17} />
                  </span>
                  <input
                    id="register-name"
                    type="text"
                    className="unified-input"
                    value={form.name}
                    onChange={update('name')}
                    placeholder="e.g. Dhivakaran Sankar"
                    required
                  />
                </div>
              </div>
            )}

            <div className="unified-field-group">
              <label className="unified-label" htmlFor="login-email">
                Email Address
              </label>
              <div className="unified-input-wrapper">
                <span className="unified-input-icon">
                  <IconMail size={17} />
                </span>
                <input
                  id="login-email"
                  type="email"
                  className="unified-input"
                  value={form.email}
                  onChange={update('email')}
                  placeholder="name@organization.org"
                  required
                />
              </div>
            </div>

            <div className="unified-field-group">
              <label className="unified-label" htmlFor="login-password">
                <span>Password</span>
                <span style={{ fontSize: '0.72rem', color: '#7d6958', fontWeight: 400 }}>
                  {mode === 'register' ? 'Min. 8 characters' : ''}
                </span>
              </label>
              <div className="unified-input-wrapper">
                <span className="unified-input-icon">
                  <IconLock size={17} />
                </span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="unified-input"
                  value={form.password}
                  onChange={update('password')}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  className="unified-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <IconEyeOff size={17} /> : <IconEye size={17} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="error-box" role="alert" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, padding: '10px 14px', fontSize: '0.82rem' }}>
                <IconAlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading} className="unified-submit-btn" id="login-submit-button">
              <span>{loading ? 'Authenticating...' : mode === 'login' ? 'Sign In to Portal' : 'Create System Account'}</span>
              {!loading && <IconArrowRight size={16} />}
            </button>

            {mode === 'login' && (
              <button
                type="button"
                onClick={handleDemoFill}
                className="unified-demo-btn"
                id="login-demo-fill-button"
                title="Prefill demo account credentials"
              >
                <IconSparkles size={15} style={{ color: '#0e2a1d' }} />
                <span>Quick Fill Demo Account (demo@example.com)</span>
              </button>
            )}

            <div className="unified-mode-switch">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode(mode === 'login' ? 'register' : 'login');
                }}
                className="unified-mode-btn"
                id="login-toggle-mode-button"
              >
                <span>{mode === 'login' ? "Don't have an account? Register" : 'Already registered? Sign in'}</span>
              </button>
            </div>
          </form>
        </main>
      </div>

      {/* Minimal Unified Footer */}
      <footer className="unified-footer">
        <span>© Real-Time AQI Aggregator &amp; Mapping System</span>
        <span className="unified-footer-sep">·</span>
        <span>OpenAQ v3 API Telemetry</span>
        <span className="unified-footer-sep">·</span>
        <span>Indian CPCB NAAQS &amp; US EPA Standards</span>
      </footer>
    </div>
  );
}
