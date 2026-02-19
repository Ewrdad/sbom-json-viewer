import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SBOMComponent } from "./SBOMComponent";
import { type EnhancedComponent } from "../../types/sbom";
import type * as Models from "@cyclonedx/cyclonedx-library/Models";

type Vulnerability = Models.Vulnerability.Vulnerability;

// Mock navigator.clipboard
vi.stubGlobal('navigator', {
  clipboard: {
    writeText: vi.fn().mockImplementation(() => Promise.resolve()),
  },
});

describe("SBOMComponent", () => {
  let mockComponent: EnhancedComponent;

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
      licenseDistribution: { permissive: 0, copyleft: 0, weakCopyleft: 0, proprietary: 0, unknown: 0 },
      transitiveLicenseDistribution: { permissive: 0, copyleft: 0, weakCopyleft: 0, proprietary: 0, unknown: 0 },
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

    it("should display critical vulnerabilities count", async () => {
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
              } as unknown as Vulnerability,
            ],
          },
        },
      } as EnhancedComponent;

      render(<SBOMComponent component={vulnComponent} />);

      const badge = screen.getByText(/Critical: 1/);
      expect(badge).toBeDefined();
      fireEvent.click(badge);

      const cveLink = await screen.findByRole("link", { name: "CVE-2024-0001" });
      expect(cveLink).toHaveAttribute("href", "https://nvd.nist.gov/vuln/detail/CVE-2024-0001");
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
      } as unknown as EnhancedComponent;

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
      const dep1 = { ...mockComponent, bomRef: "pkg:npm/dep1@1.0.0", name: "dep1" } as unknown as EnhancedComponent;
      const dep2 = { ...mockComponent, bomRef: "pkg:npm/dep2@1.0.0", name: "dep2" } as unknown as EnhancedComponent;
      
      const componentMap = new Map<string, EnhancedComponent>([
        ["pkg:npm/test@1.0.0", mockComponent],
        ["pkg:npm/dep1@1.0.0", dep1],
        ["pkg:npm/dep2@1.0.0", dep2],
      ]);
      const dependencyGraph = new Map<string, string[]>([
        ["pkg:npm/test@1.0.0", ["pkg:npm/dep1@1.0.0", "pkg:npm/dep2@1.0.0"]],
      ]);

      render(
        <SBOMComponent 
          component={mockComponent} 
          componentMap={componentMap}
          dependencyGraph={dependencyGraph}
        />
      );

      expect(screen.getAllByText(/Dependencies \(2\)/).length).toBeGreaterThan(0);
    });

    it("should respect maxDepth limit", () => {
      const dep1 = { ...mockComponent, bomRef: "pkg:npm/dep1@1.0.0", name: "dep1" } as unknown as EnhancedComponent;
      const componentMap = new Map<string, EnhancedComponent>([
        ["pkg:npm/test@1.0.0", mockComponent],
        ["pkg:npm/dep1@1.0.0", dep1],
      ]);
      const dependencyGraph = new Map<string, string[]>([
        ["pkg:npm/test@1.0.0", ["pkg:npm/dep1@1.0.0"]],
      ]);

      render(
        <SBOMComponent 
          component={mockComponent} 
          maxDepth={0} 
          componentMap={componentMap}
          dependencyGraph={dependencyGraph}
        />
      );

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
      } as EnhancedComponent;

      render(<SBOMComponent component={componentWithLicense} />);

      expect(screen.getAllByText("MIT").length).toBeGreaterThan(0);
    });

    it("should display multiple licenses", () => {
      const componentWithLicenses = {
        ...mockComponent,
        licenses: [{ id: "MIT" }, { id: "Apache-2.0" }] as any,
      } as EnhancedComponent;

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
