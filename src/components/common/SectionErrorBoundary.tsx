import { AlertCircle, RotateCcw } from "lucide-react";
import { ErrorBoundary } from "./ErrorBoundary";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * @interface SectionErrorBoundaryProps
 * @description Props for the SectionErrorBoundary component
 */
interface SectionErrorBoundaryProps {
  /** The content to be wrapped and protected from crashes */
  children: React.ReactNode;
  /** Custom title for the error state. Defaults to "Section unavailable" */
  title?: string;
  /** Custom description for the error state. Defaults to helpful generic message */
  description?: string;
  /** Optional className for the error container */
  className?: string;
  /** Optional array of keys that will trigger a reset of the error state when changed */
  resetKeys?: Array<unknown>;
}

/**
 * @function SectionErrorBoundary
 * @description A specialized ErrorBoundary for UI sections (cards, tables, charts).
 * Renders a "nice" error message that fits within the section's space and provides
 * a "Try Again" button to recover from transient failures.
 * 
 * @example
 * <SectionErrorBoundary title="Chart Error" resetKeys={[data]}>
 *   <MyComplexChart data={data} />
 * </SectionErrorBoundary>
 * 
 * @param {SectionErrorBoundaryProps} props - The component props
 */
export function SectionErrorBoundary({
  children,
  title = "Section unavailable",
  description = "Something went wrong while rendering this part of the UI.",
  className,
  resetKeys,
}: SectionErrorBoundaryProps) {
  return (
    <ErrorBoundary
      resetKeys={resetKeys}
      fallback={(error, reset) => (
        <div 
          className={cn(
            "flex flex-col items-center justify-center p-6 text-center bg-muted/30 border border-dashed rounded-lg animate-in fade-in zoom-in duration-300",
            className
          )}
        >
          <div className="bg-destructive/10 p-3 rounded-full mb-4">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-[280px]">
            {description}
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={reset}
            className="gap-2 h-8 text-xs"
          >
            <RotateCcw className="h-3 w-3" />
            Try Again
          </Button>
          
          {import.meta.env.DEV && error && (
            <details className="mt-4 text-[10px] text-left w-full overflow-auto max-h-32 p-2 bg-background border rounded font-mono">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground mb-1">
                Developer info
              </summary>
              <pre className="whitespace-pre-wrap">
                {error.stack}
              </pre>
            </details>
          )}
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
