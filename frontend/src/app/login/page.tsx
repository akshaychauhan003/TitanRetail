'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { IconBox, IconLock, IconUser, IconShield } from '../../components/ui/icons';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();

  const [managerId, setManagerId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!managerId.trim() || !password.trim()) {
      setError('Please enter both Store Manager ID and password.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await login(managerId.trim(), password.trim());
      if (res.success) {
        router.push('/');
      } else {
        setError(res.message || 'Login failed. Please check credentials.');
      }
    } catch (err: any) {
      setError(err.message || 'Unexpected login error.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = () => {
    setManagerId('storemanager');
    setPassword('admin123');
    setError(null);
    setLoading(true);
    login('storemanager', 'admin123').then((res) => {
      setLoading(false);
      if (res.success) {
        router.push('/');
      } else {
        setError('Login failed.');
      }
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100vw',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        padding: '24px',
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Bar with Day / Night Mode Switcher */}
      <div
        style={{
          position: 'absolute',
          top: '24px',
          right: '28px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={toggleTheme}
          title={`Switch to ${isDark ? 'Day / Light' : 'Night / Dark'} Mode`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '24px',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            transition: 'all 0.25s ease',
          }}
        >
          <span style={{ fontSize: '16px' }}>{isDark ? '☀️' : '🌙'}</span>
          <span>{isDark ? 'Day Mode' : 'Night Mode'}</span>
        </button>
      </div>

      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '40px 36px',
          borderRadius: '18px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          boxShadow: isDark
            ? '0 24px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.04)'
            : '0 20px 48px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* TITAN Brand Logo and Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'var(--gradient-accent)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px var(--accent-glow)',
              marginBottom: '16px',
            }}
          >
            <IconBox size={30} color="#ffffff" />
          </div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 800,
              color: 'var(--text-primary)',
              margin: '0 0 6px',
              letterSpacing: '-0.02em',
            }}
          >
            TITAN <span style={{ color: 'var(--accent)' }}>RETAIL</span>
          </h1>
          <div
            style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: '20px',
              backgroundColor: 'var(--accent-muted)',
              color: 'var(--accent)',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginTop: '4px',
            }}
          >
            Store Manager Portal
          </div>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              margin: '10px 0 0',
            }}
          >
            Authorized Store Manager sign-in required to access retail operations
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              backgroundColor: 'var(--color-error-bg)',
              border: '1px solid var(--color-error)',
              borderRadius: '8px',
              padding: '12px 14px',
              marginBottom: '20px',
              fontSize: '13px',
              color: 'var(--color-error)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Store Manager ID / Email
            </label>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  display: 'flex',
                }}
              >
                <IconUser size={18} />
              </span>
              <input
                type="text"
                required
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                placeholder="storemanager or admin"
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 40px',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--text-secondary)',
                marginBottom: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  display: 'flex',
                }}
              >
                <IconLock size={18} />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 40px',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '13px',
              backgroundColor: 'var(--accent)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              marginTop: '4px',
              boxShadow: '0 4px 14px var(--accent-glow)',
              transition: 'background-color 0.2s ease',
            }}
          >
            {loading ? 'Authenticating Store Manager...' : 'Sign In as Store Manager'}
          </button>
        </form>

        {/* 1-Click Store Manager Quick Access */}
        <div
          style={{
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '10px',
              textAlign: 'center',
            }}
          >
            Default Store Manager Credentials
          </div>

          <div
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              marginBottom: '12px',
              fontSize: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>ID: <strong style={{ color: 'var(--accent)' }}>storemanager</strong></span>
            <span>Pass: <strong style={{ color: 'var(--text-primary)' }}>admin123</strong></span>
          </div>

          <button
            type="button"
            onClick={handleQuickLogin}
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              backgroundColor: 'var(--accent-muted)',
              border: '1px solid var(--accent)',
              color: 'var(--accent)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
            }}
          >
            <IconShield size={16} />
            Instant 1-Click Store Manager Login
          </button>
        </div>
      </div>
    </div>
  );
}
