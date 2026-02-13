import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "./ErrorBoundary";
import "@testing-library/jest-dom";

// A component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error("Test Error");
  }
  return <div>Safe Component</div>;
};

describe("ErrorBoundary", () => {
  beforeEach(() => {
    // Silence console.error for tests that throw
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders children when there is no error", () => {
    render(
      <ErrorBoundary>
        <div>Test Content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("renders default error UI when an error occurs", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Something went wrong.")).toBeInTheDocument();
    expect(screen.getByText(/Test Error/)).toBeInTheDocument();
  });

  it("renders custom fallback when provided", () => {
    const Fallback = <div>Custom Error UI</div>;
    render(
      <ErrorBoundary fallback={Fallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Custom Error UI")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong.")).not.toBeInTheDocument();
  });

  it("resets state when resetKeys change", () => {
    const { rerender } = render(
      <ErrorBoundary resetKeys={["initial"]}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong.")).toBeInTheDocument();

    // Rerender with different resetKey should clear error and try rendering children again
    // But since it will throw again if we don't change the children, let's change children too
    rerender(
      <ErrorBoundary resetKeys={["changed"]}>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.queryByText("Something went wrong.")).not.toBeInTheDocument();
    expect(screen.getByText("Safe Component")).toBeInTheDocument();
  });
});
