import { Component, type ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ComponentErrorBoundaryProps {
  name?: string;
  children: ReactNode;
}

interface ComponentErrorBoundaryState {
  hasError: boolean;
  errorMessage?: string;
}

/**
 * ComponentErrorBoundary
 * Why: isolate failures to a single SBOM component so the rest of the tree renders.
 */
export class ComponentErrorBoundary extends Component<
  ComponentErrorBoundaryProps,
  ComponentErrorBoundaryState
> {
  state: ComponentErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ComponentErrorBoundaryState {
    return { hasError: true, errorMessage: error.message };
  }

  private handleRetry = () => {
    // Why: allow users to recover after transient rendering errors
    this.setState({ hasError: false, errorMessage: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Card className="mb-4 border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive">
              Component render failed
            </CardTitle>
            <CardDescription>
              {this.props.name ? `Component: ${this.props.name}` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {this.state.errorMessage || "Unknown error"}
            </p>
            <Button size="sm" variant="outline" onClick={this.handleRetry}>
              Retry component
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
