import React from 'react';
import { motion } from 'framer-motion';
import { FaExclamationTriangle, FaRefresh, FaHome } from 'react-icons/fa';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
      retryCount: this.state.retryCount + 1
    });

    // Log error to external service in production
    if (process.env.NODE_ENV === 'production') {
      // You can integrate with services like Sentry here
      console.error('Production error:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        retryCount: this.state.retryCount
      });
    }
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const { error, retryCount } = this.state;
      const isRetryable = retryCount < 3;

      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full bg-slate-800 rounded-2xl p-8 text-center border border-slate-700"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <FaExclamationTriangle className="h-8 w-8 text-red-400" />
            </motion.div>

            <h2 className="text-2xl font-bold text-white mb-4">
              Oops! Something went wrong
            </h2>
            
            <p className="text-slate-400 mb-6">
              We're sorry, but something unexpected happened. Don't worry, your data is safe.
            </p>

            {process.env.NODE_ENV === 'development' && error && (
              <details className="mb-6 text-left">
                <summary className="text-sm text-slate-500 cursor-pointer hover:text-slate-400">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 p-3 bg-slate-900 rounded text-xs text-red-400 overflow-auto max-h-32">
                  {error.message}
                  {error.stack && `\n\n${error.stack}`}
                </pre>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              {isRetryable && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={this.handleRetry}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <FaRefresh className="h-4 w-4" />
                  Try Again
                </motion.button>
              )}
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
              >
                <FaHome className="h-4 w-4" />
                Go Home
              </motion.button>
            </div>

            {!isRetryable && (
              <p className="text-sm text-slate-500 mt-4">
                Multiple retries failed. Please refresh the page or contact support.
              </p>
            )}
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
