import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorFallbackProps {
  error: Error;
  errorInfo: React.ErrorInfo;
  resetError: () => void;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you would send this error to a monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to Sentry, LogRocket, etc.
      // Sentry.captureException(error, { contexts: { react: { errorInfo } } });
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={this.state.error!}
            errorInfo={this.state.errorInfo!}
            resetError={this.resetError}
          />
        );
      }

      // Default error fallback
      return <DefaultErrorFallback {...this.state} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

const DefaultErrorFallback: React.FC<{
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  resetError: () => void;
}> = ({ error, errorInfo, resetError }) => {
  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-gray-900">Something went wrong</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Application Error</AlertTitle>
            <AlertDescription>
              An unexpected error occurred while rendering this page. Our team has been notified.
            </AlertDescription>
          </Alert>

          {process.env.NODE_ENV === 'development' && error && (
            <div className="bg-gray-100 p-4 rounded-lg">
              <h4 className="font-semibold text-sm text-gray-700 mb-2">Error Details (Development Mode)</h4>
              <div className="text-xs text-gray-600 font-mono">
                <div className="mb-2">
                  <strong>Error:</strong> {error.message}
                </div>
                {error.stack && (
                  <div>
                    <strong>Stack Trace:</strong>
                    <pre className="whitespace-pre-wrap mt-1 max-h-40 overflow-auto">
                      {error.stack}
                    </pre>
                  </div>
                )}
                {errorInfo && errorInfo.componentStack && (
                  <div className="mt-2">
                    <strong>Component Stack:</strong>
                    <pre className="whitespace-pre-wrap mt-1 max-h-40 overflow-auto">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="text-sm text-gray-600">
            <p>You can try:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Refreshing the page</li>
              <li>Going back to the home page</li>
              <li>Checking your internet connection</li>
              <li>Clearing your browser cache</li>
            </ul>
          </div>
        </CardContent>

        <CardFooter className="flex justify-center gap-3">
          <Button onClick={resetError} variant="outline" className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
          <Button onClick={handleReload} variant="outline" className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Reload Page
          </Button>
          <Button onClick={handleGoHome} className="flex items-center gap-2">
            <Home className="w-4 h-4" />
            Go Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

// Hook for error boundary
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    console.error('Error captured by useErrorHandler:', error);
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { captureError, resetError };
};

// Higher-order component for wrapping components with error boundary
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorFallback?: React.ComponentType<ErrorFallbackProps>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={errorFallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

export default ErrorBoundary;