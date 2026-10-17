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
      className="site-navbar"
      style={{
        minHeight: '60px',
        borderBottom: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-glass)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
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
            flexShrink: 0,
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

        <div style={{ minWidth: 0, flex: 1 }}>
          <h1
            className="site-navbar__title"
            style={{
              fontSize: '17px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title || 'Retail Dashboard'}
          </h1>
          {subtitle && (
            <p
              className="site-navbar__subtitle"
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                margin: '2px 0 0',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {/* Day / Night Mode Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          title={`Switch to ${isDark ? 'Day' : 'Night'} Mode`}
          className="site-navbar__theme-btn"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 12px',
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '15px' }}>{isDark ? '☀️' : '🌙'}</span>
          <span className="site-navbar__theme-label">{isDark ? 'Day' : 'Night'}</span>
        </button>
      </div>
    </header>
  );
}

