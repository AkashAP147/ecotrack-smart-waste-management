import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, Wifi, WifiOff, Server } from 'lucide-react';

interface ApiErrorHandlerProps {
  error: any;
  onRetry: () => void;
  isRetrying?: boolean;
  maxRetries?: number;
}

const ApiErrorHandler: React.FC<ApiErrorHandlerProps> = ({
  error,
  onRetry,
  isRetrying = false,
  maxRetries = 3
}) => {
  const [retryCount, setRetryCount] = useState(0);
  const [autoRetryEnabled, setAutoRetryEnabled] = useState(true);

  const getErrorType = () => {
    if (!error) return 'unknown';
    
    if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
      return 'network';
    }
    if (error.status === 404) {
      return 'not-found';
    }
    if (error.status === 401 || error.status === 403) {
      return 'auth';
    }
    if (error.status >= 500) {
      return 'server';
    }
    return 'client';
  };

  const getErrorMessage = () => {
    const errorType = getErrorType();
    
    switch (errorType) {
      case 'network':
        return {
          title: 'Connection Problem',
          message: 'Unable to connect to the server. Please check your internet connection.',
          icon: WifiOff,
          color: 'text-red-500'
        };
      case 'not-found':
        return {
          title: 'Service Unavailable',
          message: 'The requested service is temporarily unavailable. Our team is working to restore it.',
          icon: Server,
          color: 'text-orange-500'
        };
      case 'auth':
        return {
          title: 'Authentication Required',
          message: 'Your session has expired. Please log in again to continue.',
          icon: AlertCircle,
          color: 'text-yellow-500'
        };
      case 'server':
        return {
          title: 'Server Error',
          message: 'Our servers are experiencing issues. Please try again in a few moments.',
          icon: Server,
          color: 'text-red-500'
        };
      default:
        return {
          title: 'Something went wrong',
          message: 'An unexpected error occurred. Please try again.',
          icon: AlertCircle,
          color: 'text-gray-500'
        };
    }
  };

  const handleRetry = () => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      onRetry();
    }
  };

  // Auto-retry for network errors
  useEffect(() => {
    if (autoRetryEnabled && getErrorType() === 'network' && retryCount < maxRetries) {
      const timer = setTimeout(() => {
        handleRetry();
      }, Math.pow(2, retryCount) * 1000); // Exponential backoff

      return () => clearTimeout(timer);
    }
  }, [error, retryCount, autoRetryEnabled, maxRetries]);

  const errorInfo = getErrorMessage();
  const ErrorIcon = errorInfo.icon;
  const canRetry = retryCount < maxRetries;

  return (
    <div className="flex items-center justify-center py-12">
      <div className="max-w-md w-full">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <div className="text-center">
            <ErrorIcon className={`mx-auto h-12 w-12 ${errorInfo.color} mb-4`} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {errorInfo.title}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {errorInfo.message}
            </p>

            {/* Connection Status */}
            <div className="flex items-center justify-center space-x-2 mb-4">
              {navigator.onLine ? (
                <div className="flex items-center space-x-1 text-green-600">
                  <Wifi className="w-4 h-4" />
                  <span className="text-xs">Online</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-red-600">
                  <WifiOff className="w-4 h-4" />
                  <span className="text-xs">Offline</span>
                </div>
              )}
            </div>

            {/* Retry Information */}
            {retryCount > 0 && (
              <div className="mb-4 p-3 bg-gray-50 rounded-md">
                <p className="text-xs text-gray-600">
                  Retry attempt {retryCount} of {maxRetries}
                </p>
                {getErrorType() === 'network' && autoRetryEnabled && canRetry && (
                  <p className="text-xs text-blue-600 mt-1">
                    Auto-retrying in {Math.pow(2, retryCount)} seconds...
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {canRetry && (
                <button
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
                  {isRetrying ? 'Retrying...' : 'Try Again'}
                </button>
              )}

              {getErrorType() === 'network' && (
                <label className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={autoRetryEnabled}
                    onChange={(e) => setAutoRetryEnabled(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span>Auto-retry on network errors</span>
                </label>
              )}

              {!canRetry && (
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-3">
                    Maximum retry attempts reached
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="text-sm text-primary-600 hover:text-primary-500"
                  >
                    Refresh Page
                  </button>
                </div>
              )}
            </div>

            {/* Error Details (Development) */}
            {process.env.NODE_ENV === 'development' && error && (
              <details className="mt-4 text-left">
                <summary className="text-xs text-gray-500 cursor-pointer">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-auto">
                  {JSON.stringify(error, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiErrorHandler;
