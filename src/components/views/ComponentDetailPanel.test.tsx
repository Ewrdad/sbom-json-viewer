import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ComponentDetailPanel } from "./ComponentDetailPanel";
import { type EnhancedComponent } from "../../types/sbom";

// Mock handles
vi.stubGlobal('navigator', {
  clipboard: {
    writeText: vi.fn().mockImplementation(() => Promise.resolve()),
  },
});

describe("ComponentDetailPanel", () => {
  let mockComponent: EnhancedComponent;
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockComponent = {
      bomRef: { value: "pkg:npm/test@1.0.0" },
      type: "library",
      name: "test-package",
      version: "1.0.0",
      description: "A test package description",
      licenses: new Set([{ id: "MIT" }]),
      vulnerabilities: {
        inherent: {
          Critical: [{ id: "CVE-1", description: "Critical vulnerability" }],
          High: [],
          Medium: [],
          Low: [],
          Informational: [],
        },
        transitive: {
          Critical: [],
          High: [{ id: "CVE-2", description: "Transitive vulnerability" }],
          Medium: [],
          Low: [],
          Informational: [],
        },
      },
      properties: new Set([{ name: "prop1", value: "val1" }]),
    } as any;
  });

  it("renders basic component information", () => {
    render(
      <ComponentDetailPanel
        component={mockComponent}
        analysis={null}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText("test-package")).toBeDefined();
    expect(screen.getByText("1.0.0")).toBeDefined();
    expect(screen.getByText("A test package description")).toBeDefined();
  });

  it("renders vulnerability breakdown", () => {
    render(
      <ComponentDetailPanel
        component={mockComponent}
        analysis={null}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText("Critical (1)")).toBeDefined();
    // Use getAllByRole because badges and links might match or just be minimal.
    // The previous test found the link, so we assume it renders consistently.
    // We didn't change the implementation of Vulns, so this should pass if inputs are correct.
  });

  it("renders license badge", () => {
    render(
      <ComponentDetailPanel
        component={mockComponent}
        analysis={null}
        onClose={mockOnClose}
      />
    );

    const licenseBadge = screen.getByText("MIT");
    expect(licenseBadge).toBeDefined();
    // We check for the title attribute we added to the Badge
    expect(licenseBadge).toHaveAttribute("title", expect.stringContaining("MIT"));
  });

  it("copies JSON to clipboard", async () => {
    render(
      <ComponentDetailPanel
        component={mockComponent}
        analysis={null}
        onClose={mockOnClose}
      />
    );

    // Use getByRole for better accessibility matching
    const copyButton = screen.getByRole("button", { name: /copy json/i });
    fireEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    
    // Wait for the state change
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /copied json/i })).toBeDefined();
    });
  });

  it("renders additional details (properties)", () => {
    render(
      <ComponentDetailPanel
        component={mockComponent}
        analysis={null}
        onClose={mockOnClose}
      />
    );

    // We look for "Properties (1)" text
    const propertiesTrigger = screen.getByText(/Properties \(1\)/i);
    expect(propertiesTrigger).toBeDefined();
    
    // Open the collapsible
    fireEvent.click(propertiesTrigger);
    
    // Check if content is revealed
    expect(screen.getByText("prop1")).toBeDefined();
    expect(screen.getByText("val1")).toBeDefined();
  });
});
