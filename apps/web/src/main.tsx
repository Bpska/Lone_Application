import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles.css';
import './mobile-user.css';

// Purge any conflicting service workers and caches from previous projects on this port
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
  if ('caches' in window) {
    caches.keys().then((names) => {
      for (const name of names) {
        caches.delete(name);
      }
    });
  }
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled UI Error caught by RootErrorBoundary:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.removeItem('token');
      sessionStorage.clear();
      if ('caches' in window) {
        caches.keys().then((names) => {
          for (const name of names) caches.delete(name);
        });
      }
    } catch {
      // ignore
    }
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          background: '#f6f4ed',
          color: '#183d35',
          fontFamily: "'DM Sans', sans-serif",
          textAlign: 'center'
        }}>
          <div style={{
            maxWidth: '520px',
            background: '#fff',
            borderRadius: '16px',
            border: '1px solid #d5dcd7',
            padding: '2.5rem',
            boxShadow: '0 8px 30px rgba(0,0,0,0.06)'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#e8b55e',
              color: '#123d35',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 'bold',
              fontSize: '24px',
              margin: '0 auto 1.25rem'
            }}>!</div>
            <h1 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem', color: '#123d35' }}>Something went wrong</h1>
            <p style={{ color: '#6e7e78', fontSize: '0.95rem', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
              The application encountered an unexpected error. You can reload the page or reset the local session cache.
            </p>
            {this.state.error?.message && (
              <pre style={{
                textAlign: 'left',
                background: '#fdf3e7',
                border: '1px solid #fed7aa',
                borderRadius: '8px',
                padding: '0.75rem',
                fontSize: '0.82rem',
                color: '#9a3412',
                overflowX: 'auto',
                marginBottom: '1.5rem'
              }}>
                {this.state.error.message}
              </pre>
            )}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  background: '#123d35',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.75rem 1.25rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Reload page
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  background: '#eef1ed',
                  color: '#123d35',
                  border: '1px solid #d5dcd7',
                  borderRadius: '10px',
                  padding: '0.75rem 1.25rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Clear cache & restart
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <React.StrictMode>
      <RootErrorBoundary>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </RootErrorBoundary>
    </React.StrictMode>
  );
}

