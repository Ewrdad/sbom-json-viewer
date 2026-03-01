import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

interface Props {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
  fallback?: ReactNode | ((error: Error | null, reset: () => void) => ReactNode);
  resetKeys?: Array<unknown>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * @description Enhanced ErrorBoundary with granular isolation and "Revamped" styling.
 * Prevents local UI failures from crashing the entire application.
 * Supports custom fallbacks, retry logic, and technical detail disclosure.
 * 
 * @example
 * <ErrorBoundary title="User Profile" description="Could not load profile data.">
 *   <UserProfile />
 * </ErrorBoundary>
 */
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
    console.error(`UI Error [${this.props.title || 'Component'}]:`, error, errorInfo);
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
        return (this.props.fallback as any)(this.state.error, this.reset);
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className={cn(
          "p-8 border border-destructive/20 bg-destructive/5 m-4 rounded-xl flex flex-col items-center justify-center text-center gap-4 animate-in fade-in zoom-in-95 duration-300 min-h-[200px]",
          this.props.className
        )}>
          <div className="p-3 bg-destructive/10 rounded-full">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div className="space-y-2 max-w-md">
            <h2 className="text-lg font-bold text-foreground uppercase tracking-tight">
              {this.props.title || "Section"} Rendering Error
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {this.props.description || "This specific part of the UI encountered an unexpected error. The rest of the application remains functional."}
            </p>
          </div>
          
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <Button 
              variant="default" 
              className="gap-2 shadow-sm"
              onClick={this.reset}
            >
              <RefreshCcw className="h-4 w-4" />
              Retry Component
            </Button>
            
            <details className="text-left">
              <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground transition-colors text-center list-none uppercase font-bold tracking-tighter opacity-50">
                Technical Details
              </summary>
              <div className="mt-2 p-3 bg-background/50 border rounded-md font-mono text-[10px] overflow-auto max-h-[200px] shadow-inner">
                <p className="font-bold text-destructive mb-1">Error: {this.state.error?.message}</p>
                <pre className="opacity-70 whitespace-pre-wrap">
                  {this.state.errorInfo?.componentStack}
                </pre>
              </div>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
