import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-10 bg-red-50 text-red-900 border border-red-200 m-4 rounded-lg">
          <h2 className="text-xl font-bold mb-2">Something went wrong.</h2>
          <details className="whitespace-pre-wrap font-mono text-sm">
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
          <button
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
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

