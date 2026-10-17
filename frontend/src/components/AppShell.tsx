'use client';

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';
import { Sidebar } from './Sidebar';
import LoginPage from '../app/login/page';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, token, loading } = useAuth();
  const { isOpen } = useNavigation();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          width: '100vw',
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: '3px solid var(--border-subtle)',
            borderTopColor: 'var(--accent)',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <div
          style={{
            fontSize: '14px',
            fontWeight: 600,
            letterSpacing: '0.05em',
            color: 'var(--text-secondary)',
          }}
        >
          TITAN RETAIL SYSTEM INITIALIZING...
        </div>
      </div>
    );
  }

  // Without ID and password, NOTHING should appear behind the portal!
  if (!user || !token) {
    return <LoginPage />;
  }

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        maxWidth: '100vw',
        minHeight: '100vh',
        position: 'relative',
        overflowX: 'hidden',
      }}
    >
      <Sidebar />
      <main
        style={{
          flex: 1,
          minWidth: 0,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-primary)',
          minHeight: '100vh',
          marginLeft: isOpen ? '260px' : '0px',
          transition: 'margin-left 0.32s cubic-bezier(0.2, 0, 0, 1)',
          willChange: 'margin-left',
        }}
      >
        {children}
      </main>
    </div>
  );
}
