import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          onRetry={this.handleRetry}
        />
      );
    }
    return this.props.children;
  }
}

// Separate functional component so we can use hooks (useTranslation)
const ErrorFallback: React.FC<{ error: Error | null; onRetry: () => void }> = ({ error, onRetry }) => {
  const { t } = useTranslation();

  // ✅ Get isDevelopment from window instead of process.env
  const isDevelopment = typeof window !== 'undefined' && 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1';

  const getErrorMessage = () => {
    if (!error) return t('unexpected_error');

    if (error.message.includes('network') || error.message.includes('fetch')) {
      return t('network_error');
    }
    if (error.message.includes('401') || error.message.includes('403')) {
      return t('unauthorized');
    }
    if (error.message.includes('404')) {
      return t('not_found');
    }
    return error.message || t('unexpected_error');
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold mb-2 text-gray-800 dark:text-white">
          {t('something_wrong')}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 break-words">
          {getErrorMessage()}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onRetry}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-base font-medium transition-colors"
          >
            {t('try_again')}
          </button>
          <button
            onClick={() => window.location.reload()}
            className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-6 py-2.5 rounded-lg text-base font-medium transition-colors"
          >
            {t('reload_page')}
          </button>
        </div>

        {/* ✅ Show error details in development only */}
        {isDevelopment && error && (
          <details className="mt-4 text-left">
            <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
              Error Details
            </summary>
            <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-900 p-3 rounded overflow-auto max-h-40 text-gray-800 dark:text-gray-200">
              {error.stack || error.message}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
};

export default ErrorBoundary;