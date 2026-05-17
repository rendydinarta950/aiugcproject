import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      login(form.username, form.password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      /* Must fill the full flex child of #root */
      width: '100%',
      minHeight: '100vh',
      background: 'var(--bg-page)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo — centered */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 52, height: 52,
            background: 'var(--brand)',
            borderRadius: 'var(--radius-md)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(107,131,239,.35)',
            marginBottom: 16,
          }}>
            <svg width="28" height="28" viewBox="0 0 20 20" fill="white">
              <path d="M10 2L3 6v8l7 4 7-4V6L10 2zm0 2.18L15 7v6l-5 2.82L5 13V7l5-2.82z"/>
              <circle cx="10" cy="10" r="2.5" fill="white"/>
            </svg>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-heading)', letterSpacing: '-.6px', lineHeight: 1 }}>NyarAI</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>AI Content Production Platform</div>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '32px 36px', boxShadow: 'var(--shadow-md)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-heading)', marginBottom: 4, letterSpacing: '-.3px' }}>Sign in to your account</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28 }}>Enter your credentials to continue</p>

          {error && (
            <div style={{
              background: 'var(--accent-red-bg)', border: '1px solid rgba(239,68,68,.2)',
              borderRadius: 'var(--radius-sm)', padding: '10px 14px',
              fontSize: 13, color: 'var(--accent-red)', marginBottom: 20,
              display: 'flex', gap: 8, alignItems: 'center',
            }}>
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="10" cy="10" r="8"/>
                <line x1="10" y1="7" x2="10" y2="11"/>
                <circle cx="10" cy="14" r=".8" fill="currentColor" stroke="none"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                className="form-input"
                type="text"
                placeholder="Enter your username"
                autoComplete="username"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                required
                autoFocus
              />
            </div>

            <div className="form-group" style={{ marginBottom: 28 }}>
              <label className="form-label">Password</label>
              <input
                className="form-input"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '12px 20px', fontSize: 15, borderRadius: 'var(--radius-sm)' }}
            >
              {loading
                ? <><div className="spinner" style={{ borderTopColor: 'white', width: 16, height: 16 }}></div> Signing in...</>
                : 'Sign In'
              }
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'var(--text-muted)' }}>
          NyarAI v2.0 — Contact your administrator for access
        </p>
      </div>
    </div>
  );
}
