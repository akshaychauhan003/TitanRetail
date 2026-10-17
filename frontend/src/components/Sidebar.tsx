'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '../context/NavigationContext';
import { SystemSettingsModal } from './SystemSettingsModal';
import {
  IconHome,
  IconBox,
  IconTrendUp,
  IconAlertTriangle,
  IconBook,
  IconChart,
  IconHistory,
  IconLogout,
  IconShield,
  IconUser,
  IconChevronLeft,
  IconClock,
  IconPin,
  IconPinOff,
  IconSettings,
  IconUsers,
} from './ui/icons';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
  adminOnly?: boolean;
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, isAdmin, logout } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const {
    isOpen,
    openSidebar,
    closeSidebar,
    isPinned,
    togglePin,
    autoCloseEnabled,
    toggleAutoClose,
    countdown,
    isHovered,
    pauseAutoCloseTimer,
    resumeAutoCloseTimer,
  } = useNavigation();

  // Cooldown timestamp after clicking manual close to prevent accidental re-open
  const lastClosedTimeRef = useRef<number>(0);

  const handleManualClose = () => {
    lastClosedTimeRef.current = Date.now();
    closeSidebar();
  };

  // Cursor moving near left edge of page (<= 28px) opens navigation from left side
  useEffect(() => {
    if (isOpen) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Cooldown check after user clicks close button
      if (Date.now() - lastClosedTimeRef.current < 450) return;

      if (e.clientX <= 28) {
        openSidebar();
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isOpen, openSidebar]);

  const navItems: NavItem[] = [
    { href: '/', label: 'Store Dashboard', icon: <IconHome size={20} /> },
    { href: '/sales', label: 'Seller (Customer Sale)', icon: <IconTrendUp size={20} />, badge: 'SELL' },
    { href: '/purchases', label: 'Purchaser (Supplier Inward)', icon: <IconBook size={20} />, badge: 'BUY' },
    { href: '/products', label: 'Products & Stock', icon: <IconBox size={20} /> },
    { href: '/customers', label: 'Customers & CRM', icon: <IconUsers size={20} />, badge: 'CRM' },
    { href: '/reports', label: 'Reports & Profits', icon: <IconChart size={20} /> },
  ];

  return (
    <>
      <aside
        onMouseEnter={pauseAutoCloseTimer}
        onMouseLeave={resumeAutoCloseTimer}
        style={{
          width: '260px',
          minWidth: '260px',
          height: '100vh',
          backgroundColor: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 50,
          overflow: 'hidden',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.32s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.32s cubic-bezier(0.2, 0, 0, 1)',
          boxShadow: isOpen
            ? isPinned
              ? '1px 0 0 var(--border-subtle)'
              : '4px 0 24px rgba(0, 0, 0, 0.15)'
            : 'none',
          pointerEvents: isOpen ? 'auto' : 'none',
          willChange: 'transform',
        }}
      >
      {/* Brand Header */}
      <div
        style={{
          padding: '20px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'var(--gradient-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px var(--accent-glow)',
            flexShrink: 0,
          }}
        >
          <IconBox size={20} color="#ffffff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '17px',
              fontWeight: 800,
              letterSpacing: '0.04em',
              color: 'var(--text-primary)',
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            TITAN <span style={{ color: 'var(--accent)' }}>RETAIL</span>
          </div>
          {/* <div
            style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent)',
                display: 'inline-block',
              }}
            />
            Web System v2.0
          </div> */}
        </div>

        {/* Action: Close Navigation */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* Close / Collapse Navigation Button */}
          <button
            type="button"
            onClick={handleManualClose}
            title="Close / Collapse Navigation"
            aria-label="Close Navigation"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-elevated)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <IconChevronLeft size={18} />
          </button>
        </div>
      </div>

      {/* Navigation Links */}
      <nav
        style={{
          flex: 1,
          padding: '16px 12px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        <div
          style={{
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            padding: '8px 12px 4px',
            letterSpacing: '0.08em',
          }}
        >
          Operations
        </div>

        {navItems.map((item) => {
          const isActive = pathname === item.href;
          if (item.adminOnly && !isAdmin) return null;

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '8px',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'var(--accent)' : 'transparent',
                fontWeight: isActive ? 600 : 500,
                fontSize: '14px',
                textDecoration: 'none',
                transition: 'all 0.15s ease-in-out',
                boxShadow: isActive ? '0 4px 12px var(--accent-glow)' : 'none',
              }}
              className={isActive ? '' : 'nav-hover'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    color: isActive ? '#ffffff' : 'var(--text-muted)',
                  }}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : 'var(--accent-muted)',
                    color: isActive ? '#ffffff' : 'var(--accent)',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Info & Settings Footer */}
      <div
        style={{
          padding: '14px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-tertiary)',
          maxHeight: '52vh',
          overflowY: 'auto',
        }}
      >
        {user ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Store Manager Profile Button - Acts as System Settings Trigger */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              title="System Settings (User ID, Password, Navigation & Theme)"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)';
                e.currentTarget.style.boxShadow = '0 2px 10px var(--accent-glow)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-muted)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent)',
                  flexShrink: 0,
                }}
              >
                <IconUser size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user.name || 'Store Manager'}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginTop: '2px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '9px',
                      textTransform: 'uppercase',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: '4px',
                      backgroundColor: 'var(--accent-muted)',
                      color: 'var(--accent)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                  >
                    <IconShield size={9} />
                    Store Manager
                  </span>
                </div>
              </div>
              <div
                style={{
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                  borderRadius: '4px',
                }}
                title="System Settings"
              >
                <IconSettings size={18} />
              </div>
            </button>

            {/* Sign Out Button */}
            <button
              onClick={logout}
              style={{
                width: '100%',
                padding: '7px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'transparent',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                e.currentTarget.style.color = '#ef4444';
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
              }}
            >
              <IconLogout size={14} />
              Sign Out
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px',
              backgroundColor: 'var(--accent)',
              color: '#ffffff',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            Sign In
          </Link>
        )}
      </div>
    </aside>

    {/* Left edge cursor detection zone and sleek peek indicator when closed */}
    {!isOpen && (
      <div
        onMouseEnter={() => {
          if (Date.now() - lastClosedTimeRef.current >= 450) {
            openSidebar();
          }
        }}
        onClick={openSidebar}
        title="Move cursor here or click to open navigation"
        aria-label="Open Navigation"
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          width: '24px',
          zIndex: 48,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          background: 'transparent',
        }}
      >
        {/* Subtle accent glow line along the left edge */}
        <div
          style={{
            width: '4px',
            height: '64px',
            borderRadius: '0 4px 4px 0',
            backgroundColor: 'var(--accent)',
            opacity: 0.85,
            boxShadow: '0 0 12px var(--accent-glow)',
            transition: 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
          }}
        />
      </div>
    )}

    {/* System Settings Modal */}
    <SystemSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
  </>
);
}
