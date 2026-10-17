import '../styles/globals.css';
import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { NavigationProvider } from '../context/NavigationContext';
import { AppShell } from '../components/AppShell';

export const metadata: Metadata = {
  title: 'TITAN — Retail Inventory & Sales Management System',
  description:
    'Comprehensive enterprise retail inventory tracking, stock adjustments, POS billing, low-stock alerts, and sales analytics.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/favicon.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          minHeight: '100vh',
          overflowX: 'clip',
          overflowY: 'auto',
        }}
      >
        <ThemeProvider>
          <AuthProvider>
            <NavigationProvider>
              <AppShell>{children}</AppShell>
            </NavigationProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
