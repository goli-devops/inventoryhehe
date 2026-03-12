import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { fallbackTitle = 'Something went wrong', minimal = false } = this.props;

    if (minimal) {
      return (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertTriangle size={15} className="shrink-0" />
          <span>{fallbackTitle}</span>
          <button
            onClick={this.handleReset}
            className="ml-auto text-xs underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full min-h-64 p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle size={28} className="text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">{fallbackTitle}</h3>
        <p className="text-sm text-gray-500 mb-1 max-w-sm">
          An unexpected error occurred in this module.
        </p>
        {import.meta.env.DEV && this.state.error && (
          <pre className="mt-3 mb-5 text-left text-xs bg-gray-100 text-gray-600 p-3 rounded-lg max-w-md overflow-auto max-h-32">
            {this.state.error.message}
          </pre>
        )}
        <button
          onClick={this.handleReset}
          className="flex items-center gap-2 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <RefreshCw size={14} />
          Try Again
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;