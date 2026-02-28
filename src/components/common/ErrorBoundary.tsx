import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error | null, reset: () => void) => ReactNode);
  resetKeys?: Array<unknown>;
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
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && this.props.resetKeys) {
      if (this.hasKeysChanged(prevProps.resetKeys, this.props.resetKeys)) {
        this.reset();
      }
    }
  }

  private hasKeysChanged(prevKeys: Array<unknown> | undefined, currentKeys: Array<unknown> | undefined) {
    if (!prevKeys || !currentKeys) return prevKeys !== currentKeys;
    if (prevKeys.length !== currentKeys.length) return true;
    for (let i = 0; i < prevKeys.length; i++) {
      if (prevKeys[i] !== currentKeys[i]) return true;
    }
    return false;
  }

  public reset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  public render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === "function") {
        return this.props.fallback(this.state.error, this.reset);
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-10 bg-red-50 text-red-900 border border-red-200 m-4 rounded-lg animate-in fade-in duration-300">
          <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
            <span role="img" aria-label="alert">⚠️</span> Something went wrong.
          </h2>
          <p className="mb-4 opacity-80">This specific part of the UI encountered an unexpected error and could not be rendered.</p>
          <details className="whitespace-pre-wrap font-mono text-sm mb-4 bg-white/50 p-4 rounded-md border border-red-100 max-h-[300px] overflow-auto shadow-inner">
            <p className="font-bold mb-2">Error: {this.state.error && this.state.error.toString()}</p>
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
          <button
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors shadow-md active:scale-95"
            onClick={() => this.reset()}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

