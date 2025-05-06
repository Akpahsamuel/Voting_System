import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import { Separator } from './ui/separator';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to console
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Report to error tracking service if available
    // reportError(error, errorInfo); 
  }

  resetErrorBoundary = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Check for specific error types to provide tailored messages
      const isTimestampError = 
        this.state.error?.message?.includes('Invalid time value') ||
        this.state.error?.message?.includes('Invalid date') ||
        this.state.error?.stack?.includes('toISOString');
        
      return this.props.fallback || (
        <Card className="border-red-600/30 bg-red-950/20 max-w-2xl mx-auto my-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <CardTitle className="text-red-300">Something went wrong</CardTitle>
            </div>
            <CardDescription className="text-red-300/70">
              {isTimestampError 
                ? 'We encountered an issue with a date value. This is likely due to an invalid timestamp from the blockchain.'
                : 'The application encountered an unexpected error.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-black/50 p-4 rounded-md text-sm text-red-100/80 font-mono overflow-auto max-h-48">
              <p className="mb-2">{this.state.error?.message}</p>
              <Separator className="my-2 bg-red-500/20" />
              <p className="text-xs text-red-400/60 whitespace-pre-wrap">
                {this.state.error?.stack?.split('\n').slice(0, 5).join('\n')}
              </p>
            </div>

            {isTimestampError && (
              <div className="mt-4 p-4 bg-yellow-950/30 border border-yellow-900/40 rounded-md">
                <h3 className="text-yellow-300 font-medium mb-2">Timestamp Issue Detected</h3>
                <p className="text-yellow-100/80 text-sm">
                  This error is likely caused by an invalid date format received from the blockchain.
                  Try refreshing the page or checking your network connection.
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={this.resetErrorBoundary}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button variant="ghost" onClick={() => window.location.href = '/'}>
              Return to Home
            </Button>
          </CardFooter>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 