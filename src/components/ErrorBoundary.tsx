import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from '../icons';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.name ? `: ${this.props.name}` : ''}]`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div style={{
          padding: '20px',
          margin: '10px',
          background: 'var(--bg-secondary, #1e1e2e)',
          border: '1px solid var(--border-color, #444)',
          borderRadius: '8px',
          color: 'var(--text-primary, #cdd6f4)',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <h3 style={{ color: '#f38ba8', margin: '0 0 8px' }}>
            <AlertTriangle size={16} strokeWidth={1.75} /> {this.props.name || 'Component'} Error
          </h3>
          <p style={{ margin: '0 0 12px', fontSize: '13px', opacity: 0.8 }}>
            {this.state.error?.message || 'Something went wrong'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '6px 16px',
              background: 'var(--accent, #89b4fa)',
              border: 'none',
              borderRadius: '4px',
              color: '#1e1e2e',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            <RefreshCw size={14} strokeWidth={1.75} /> Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
