import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "./ErrorBoundary";
import { describe, it, expect, vi, beforeEach } from "vitest";

const ThrowError = ({ message = "Test Error" }) => {
  throw new Error(message);
};

describe("ErrorBoundary", () => {
  beforeEach(() => {
    // Silence console.error for tests that throw
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it("renders children when there is no error", () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">Child Content</div>
      </ErrorBoundary>
    );
    expect(screen.getByTestId("child")).toBeDefined();
  });

  it("renders default error UI when an error occurs", () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(screen.getByText(/Rendering Error/i)).toBeDefined();
    expect(screen.getByText(/unexpected error/i)).toBeDefined();
    expect(screen.getByText("Retry Component")).toBeDefined();
  });

  it("renders custom fallback when provided", () => {
    const fallback = <div data-testid="custom-fallback">Custom Fallback</div>;
    render(
      <ErrorBoundary fallback={fallback}>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(screen.getByTestId("custom-fallback")).toBeDefined();
  });

  it("resets state when resetKeys change", () => {
    const { rerender } = render(
      <ErrorBoundary resetKeys={["initial"]}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Rendering Error/i)).toBeDefined();

    // Rerender with different resetKeys and without the throwing component
    rerender(
      <ErrorBoundary resetKeys={["updated"]}>
        <div data-testid="recovered">Recovered Content</div>
      </ErrorBoundary>
    );

    expect(screen.getByTestId("recovered")).toBeDefined();
    expect(screen.queryByText(/Rendering Error/i)).toBeNull();
  });
});
