'use client';

import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '../context/NavigationContext';
import { IconMenu } from './ui/icons';

interface NavbarProps {
  title?: string;
  subtitle?: string;
}

export function Navbar({ title, subtitle }: NavbarProps) {
  const { isDark, toggleTheme } = useTheme();
  const { isOpen, toggleSidebar } = useNavigation();

  return (
    <header
      style={{
        height: '64px',
        padding: '0 24px',
        borderBottom: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-glass)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Toggle Sidebar Button */}
        <button
          type="button"
          onClick={toggleSidebar}
          title={isOpen ? 'Collapse / Close Navigation' : 'Expand / Open Navigation'}
          aria-label={isOpen ? 'Close Navigation' : 'Open Navigation'}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
            backgroundColor: isOpen ? 'var(--bg-tertiary)' : 'var(--accent)',
            color: isOpen ? 'var(--text-primary)' : '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: isOpen ? 'none' : '0 2px 8px var(--accent-glow)',
          }}
          onMouseEnter={(e) => {
            if (isOpen) {
              e.currentTarget.style.backgroundColor = 'var(--bg-elevated)';
            }
          }}
          onMouseLeave={(e) => {
            if (isOpen) {
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
            }
          }}
        >
          <IconMenu size={20} />
        </button>

        <div>
          <h1
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {title || 'Retail Dashboard'}
          </h1>
          {subtitle && (
            <p
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                margin: '2px 0 0',
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Day / Night Mode Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          title={`Switch to ${isDark ? 'Day' : 'Night'} Mode`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <span style={{ fontSize: '15px' }}>{isDark ? '☀️' : '🌙'}</span>
          <span>{isDark ? 'Day Mode' : 'Night Mode'}</span>
        </button>
      </div>
    </header>
  );
}

