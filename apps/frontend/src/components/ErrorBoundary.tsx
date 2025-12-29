import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Only log in development mode
    if (import.meta.env.DEV) {
      console.error("Uncaught error:", error, errorInfo);
    }
    // In production, send to error tracking service (e.g., Sentry)
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
          <div className="max-w-3xl w-full bg-white rounded-lg shadow-xl overflow-hidden border border-red-200">
             <div className="bg-red-600 px-6 py-4">
               <h1 className="text-white text-xl font-bold flex items-center gap-2">
                 <span>🚨</span> Algo salió mal
               </h1>
             </div>

             <div className="p-6">
               <div className="mb-4">
                 <h2 className="text-lg font-semibold text-gray-900 mb-2">Error:</h2>
                 <pre className="bg-red-50 p-4 rounded-md text-red-800 font-mono text-sm whitespace-pre-wrap break-words border border-red-100">
                   {this.state.error?.toString()}
                 </pre>
               </div>

               {this.state.errorInfo && (
                 <div>
                   <h2 className="text-lg font-semibold text-gray-900 mb-2">Stack Trace:</h2>
                   <div className="bg-gray-50 p-4 rounded-md text-gray-700 font-mono text-xs overflow-auto max-h-96 border border-gray-200">
                     <pre>{this.state.errorInfo.componentStack}</pre>
                   </div>
                 </div>
               )}

               <div className="mt-6 flex justify-end">
                 <button
                   onClick={() => window.location.reload()}
                   className="px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition-colors shadow-sm"
                 >
                   Recargar Página
                 </button>
               </div>
             </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
