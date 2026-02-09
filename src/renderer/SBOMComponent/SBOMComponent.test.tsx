import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SBOMComponent } from "./SBOMComponent";
import type { NestedSBOMComponent } from "../Formatter/Formatter";
// No BomRef import needed here


// Mock navigator.clipboard
vi.stubGlobal('navigator', {
  clipboard: {
    writeText: vi.fn().mockImplementation(() => Promise.resolve()),
  },
});

describe("SBOMComponent", () => {
  let mockComponent: NestedSBOMComponent;

  beforeEach(() => {
    // Create a basic mock component with plain-object structure
    mockComponent = {
      bomRef: "pkg:npm/test@1.0.0",
      type: "library",
      name: "test-component",
      version: "1.0.0",
      group: "test-group",
      licenses: [] as any,
      dependencies: [] as any,
      vulnerabilities: {
        inherent: {
          Critical: [],
          High: [],
          Medium: [],
          Low: [],
          Informational: [],
        },
        transitive: {
          Critical: [],
          High: [],
          Medium: [],
          Low: [],
          Informational: [],
        },
      },
      formattedDependencies: [],
    } as any;
  });

  describe("Basic Rendering", () => {
    it("should render component name and version", () => {
      render(<SBOMComponent component={mockComponent} />);

      expect(screen.getAllByText(/test-component/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/v1.0.0/).length).toBeGreaterThan(0);
    });

    it("should render component group", () => {
      render(<SBOMComponent component={mockComponent} />);

      expect(screen.getAllByText(/test-group/).length).toBeGreaterThan(0);
    });

    it("should render component type badge", () => {
      render(<SBOMComponent component={mockComponent} />);

      expect(screen.getAllByText("library").length).toBeGreaterThan(0);
    });

    it("should render bom-ref", () => {
      render(<SBOMComponent component={mockComponent} />);

      expect(screen.getByText("pkg:npm/test@1.0.0")).toBeDefined();
    });
  });

  describe("Vulnerabilities Display", () => {
    it("should show no vulnerabilities message when component is clean", () => {
      render(<SBOMComponent component={mockComponent} />);

      expect(screen.getByText(/No known vulnerabilities/)).toBeDefined();
    });

    it("should display critical vulnerabilities count", () => {
      const vulnComponent = {
        ...mockComponent,
        vulnerabilities: {
          ...mockComponent.vulnerabilities,
          inherent: {
            ...mockComponent.vulnerabilities.inherent,
            Critical: [
              {
                id: "CVE-2024-0001",
                description: "Test critical vulnerability",
              } as any,
            ],
          },
        },
      } as NestedSBOMComponent;

      render(<SBOMComponent component={vulnComponent} />);

      expect(screen.getByText(/Critical: 1/)).toBeDefined();
    });

    it("should show inherited vulnerabilities separately", () => {
      const vulnComponent = {
        ...mockComponent,
        vulnerabilities: {
          inherent: {
            Critical: [{ id: "CVE-2024-0001" } as any],
            High: [],
            Medium: [],
            Low: [],
            Informational: [],
          },
          transitive: {
            Critical: [
              { id: "CVE-2024-0002" } as any,
              { id: "CVE-2024-0003" } as any,
            ],
            High: [],
            Medium: [],
            Low: [],
            Informational: [],
          },
        },
      } as NestedSBOMComponent;

      render(<SBOMComponent component={vulnComponent} />);

      // Should show "Critical: 1 (+2 inherited)"
      expect(screen.getByText(/Critical: 1.*\+2 inherited/)).toBeDefined();
    });
  });

  describe("Dependencies", () => {
    it("should not show dependencies section when there are none", () => {
      render(<SBOMComponent component={mockComponent} />);

      const depsButton = screen.queryByText(/Dependencies/);
      expect(depsButton).toBeNull();
    });

    it("should show dependencies count when present", () => {
      const componentWithDeps = {
        ...mockComponent,
        formattedDependencies: [
          { ...mockComponent, bomRef: "pkg:npm/dep1@1.0.0" },
          { ...mockComponent, bomRef: "pkg:npm/dep2@1.0.0" },
        ] as any[],
      } as NestedSBOMComponent;

      render(<SBOMComponent component={componentWithDeps} />);

      expect(screen.getAllByText(/Dependencies \(2\)/).length).toBeGreaterThan(
        0,
      );
    });

    it("should respect maxDepth limit", () => {
      const componentWithDeps = {
        ...mockComponent,
        formattedDependencies: [
          { ...mockComponent, bomRef: "pkg:npm/dep1@1.0.0" },
        ] as any[],
      } as NestedSBOMComponent;

      render(<SBOMComponent component={componentWithDeps} maxDepth={0} />);

      // Should show message about max depth reached
      expect(
        screen.getByText(/more dependencies.*max depth reached/),
      ).toBeDefined();
    });
  });

  describe("Licenses", () => {
    it("should display license information", () => {
      const componentWithLicense = {
        ...mockComponent,
        licenses: [{ id: "MIT" }] as any,
      } as NestedSBOMComponent;

      render(<SBOMComponent component={componentWithLicense} />);

      expect(screen.getAllByText("MIT").length).toBeGreaterThan(0);
    });

    it("should display multiple licenses", () => {
      const componentWithLicenses = {
        ...mockComponent,
        licenses: [{ id: "MIT" }, { id: "Apache-2.0" }] as any,
      } as NestedSBOMComponent;

      render(<SBOMComponent component={componentWithLicenses} />);

      expect(screen.getAllByText(/MIT, Apache-2.0/).length).toBeGreaterThan(0);
    });
  });

  describe("Component Details", () => {
    it("should display all component details in details section", () => {
      render(<SBOMComponent component={mockComponent} />);

      const nameLabel = screen.getByText("Name:");
      const versionLabel = screen.getByText("Version:");
      const groupLabel = screen.getByText("Group:");
      const typeLabel = screen.getByText("Type:");

      expect(nameLabel.parentElement).toHaveTextContent("test-component");
      expect(versionLabel.parentElement).toHaveTextContent("1.0.0");
      expect(groupLabel.parentElement).toHaveTextContent("test-group");
      expect(typeLabel.parentElement).toHaveTextContent("library");
    });
  });
});
