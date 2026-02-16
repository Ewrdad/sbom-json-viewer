import {
  render,
  screen,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import { App } from "./App";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Recharts to avoid responsive container issues in jsdom
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div style={{ width: 800, height: 800 }}>{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
}));

// Polyfill ResizeObserver
vi.stubGlobal(
  "ResizeObserver",
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

// Mock lazy views to avoid import issues in tests
vi.mock("./components/views/DashboardView", () => ({
  DashboardView: ({ preComputedStats }: { preComputedStats: import("./types/sbom").SbomStats | null }) => (
    <div data-testid="dashboard-view">
      Dashboard View
      <div>Total Components: {preComputedStats?.totalComponents ?? 0}</div>
      <div>Unique Licenses: 0</div>
      <div>Critical Vulns: 0</div>
      <div>High Vulns: 0</div>
    </div>
  ),
}));
vi.mock("./components/views/ComponentExplorer", () => ({
  ComponentExplorer: ({ sbom }: { sbom: import("@cyclonedx/cyclonedx-library/Models").Bom | null }) => (
    <div data-testid="explorer-view">
      Explorer
      {(sbom?.components as any)?.map((c: any) => (
        <div key={c.name}>{c.name}</div>
      ))}
    </div>
  ),
}));
vi.mock("./components/views/DependencyGraph", () => ({
  DependencyGraph: () => <div data-testid="graph-view">Dependency Graph</div>,
}));
vi.mock("./components/views/DependencyTree", () => ({
  DependencyTree: () => <div data-testid="tree-view">Dependency Tree</div>,
}));
vi.mock("./components/views/VulnerabilitiesView", () => ({
  VulnerabilitiesView: () => <div data-testid="vulnerabilities-view">Vulnerabilities View</div>,
}));
vi.mock("./components/views/ReverseDependencyTree", () => ({
  ReverseDependencyTree: () => <div data-testid="reverse-tree-view">Reverse Tree View</div>,
}));

// Mock Lucide icons
vi.mock("lucide-react", () => ({
  LayoutDashboard: () => <div />,
  List: () => <div />,
  Network: () => <div />,
  Upload: () => <div />,
  ChevronLeft: () => <div />,
  ChevronRight: () => <div />,
  ArrowUpDown: () => <div />,
  Search: () => <div />,
  ShieldAlert: () => <div />,
  ShieldX: () => <div />,
  ShieldCheck: () => <div />,
  AlertTriangle: () => <div />,
  ScrollText: () => <div />,
  Scale: () => <div />,
  FileCheck: () => <div />,
  BookOpen: () => <div />,
  Info: () => <div />,
  HelpCircle: () => <div />,
  FileText: () => <div />,
  Shield: () => <div />,
  X: () => <div />,
  GitGraph: () => <div />,
  Layers: () => <div />,
  ArrowRight: () => <div />,
  Download: () => <div />,
}));

// Polyfill Worker
class MockWorker {
  onmessage: (e: any) => void = () => {};
  onerror: (e: any) => void = () => {};
  
  postMessage(options: { jsonText?: string; url?: string; file?: File; filename: string }) {
    // Simulate worker processing
    setTimeout(async () => {
      try {
        let json: any;
        if (options.jsonText) {
          json = JSON.parse(options.jsonText);
        } else if (options.url) {
          // Simulate fetch for mock
          const response = await fetch(options.url);
          json = await (response as any).json();
        } else if (options.file) {
          // Simulate file reading for mock
          const text = await options.file.text();
          json = JSON.parse(text);
        }

        // Mock the minimal results expected by App.tsx
        const mockResult = {
          bom: json, // Simple pass through for mock
          formatted: {
            componentMap: new Map(),
            dependencyGraph: new Map(),
            dependentsGraph: new Map(),
            blastRadius: new Map(),
            topLevelRefs: []
          },
          stats: {
            totalComponents: json.components?.length || 0,
            vulnerabilityCounts: { critical: 0, high: 0, medium: 0, low: 0, none: 0 },
            licenseCounts: {},
            topLicenses: [],
            vulnerableComponents: [],
            allVulnerableComponents: [],
            totalVulnerabilities: 0,
            allVulnerabilities: [],
            allLicenses: [],
            allLicenseComponents: [],
            cweCounts: {},
            sourceCounts: {}
          }
        };
        this.onmessage({ data: { type: "complete", result: mockResult } });
      } catch (e: any) {
        this.onerror({ message: e.message });
      }
    }, 10);
  }
  
  terminate() {}
}

vi.stubGlobal("Worker", MockWorker);

describe("App Integration", () => {
  it("sanity check", () => {
    render(<div data-testid="sanity">Hello</div>);
    expect(screen.getByTestId("sanity")).toBeInTheDocument();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    window.location.hash = "";

    // Mock fetch
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url) => {
        const urlStr = url.toString();
        if (urlStr.endsWith("manifest.json")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                default: "examples/sample-simple",
                files: [
                  {
                    name: "Simple Example",
                    path: "sboms/examples/sample-simple.sbom.json",
                    id: "examples/sample-simple",
                  },
                ],
              }),
          });
        }
        if (
          urlStr.endsWith("sample-simple.sbom.json") ||
          urlStr.endsWith("sbom-full.sbom.json")
        ) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                bomFormat: "CycloneDX",
                specVersion: "1.4",
                metadata: { component: { name: "root", type: "application" } },
                components: [
                  {
                    name: "comp1",
                    version: "1.0",
                    type: "library",
                    "bom-ref": "comp1",
                  },
                ],
              }),
          });
        }
        return Promise.reject(new Error(`Not found: ${url}`));
      }),
    );
  });

  it("should load SBOM and display Dashboard by default", async () => {
    render(<App />);

    // Should show loading initially
    expect(screen.getByText(/Preparing/i)).toBeInTheDocument();

    // Wait for dashboard to appear (lazy-loaded)
    await waitFor(
      () => {
        expect(screen.queryByText(/Preparing/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
        expect(screen.getAllByText(/Dashboard/i).length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );

    // Check content: some stats labels render
    expect(await screen.findAllByText(/Total Components:/i)).toHaveLength(1);
    expect(await screen.findAllByText(/Unique Licenses:/i)).toHaveLength(1);
    expect(await screen.findAllByText(/Critical Vulns:/i)).toHaveLength(1);
  });

  it("should render the help button in the header", async () => {
    render(<App />);
    
    // Wait for app to load
    await waitFor(() => {
      expect(screen.queryByText(/Preparing/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    }, { timeout: 5000 });

    const helpButton = screen.getByRole("button", { name: /help guide/i });
    expect(helpButton).toBeInTheDocument();
  });

  it("should switch views when sidebar buttons are clicked", async () => {
    render(<App />);

    // Wait for initial load to finish
    await waitFor(() => {
      expect(screen.queryByText(/Preparing/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    }, { timeout: 10000 });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Dashboard/i }),
      ).toBeInTheDocument();
    });

    // Click on Components nav item
    const componentsNav = screen.getByRole("button", { name: /Components/i });
    fireEvent.click(componentsNav);

    // Should show Component Explorer header
    await waitFor(() => {
      // For debugging
      if (screen.queryByRole("heading", { name: /Explorer/i, level: 2 }) === null) {
        console.log("DOM state when header not found:");
        screen.debug();
      }
      expect(
        screen.getByRole("heading", { name: /Explorer/i, level: 2 }),
      ).toBeInTheDocument();
    });

    // Assert content in explorer without relying on table role
    expect(await screen.findByText(/comp1/i)).toBeInTheDocument();
  });
  
  it("should show download button and trigger download when clicked", async () => {
    // Mock URL methods on the existing global URL object
    const createObjectURLMock = vi.fn().mockReturnValue("blob:mock-url");
    const revokeObjectURLMock = vi.fn();
    
    const originalCreateObjectURL = window.URL.createObjectURL;
    const originalRevokeObjectURL = window.URL.revokeObjectURL;
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;
    
    // Use a real element but mock its click
    const realCreateElement = document.createElement.bind(document);
    const anchorMock = realCreateElement("a");
    const clickSpy = vi.spyOn(anchorMock, "click").mockImplementation(() => {});
    
    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName === "a") return anchorMock;
      return realCreateElement(tagName);
    });

    const appendSpy = vi.spyOn(document.body, "appendChild");
    const removeSpy = vi.spyOn(document.body, "removeChild");

    render(<App />);

    // Wait for initial load
    await waitFor(() => {
        expect(screen.queryByText(/Preparing/i)).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /Download/i })).toBeInTheDocument();
    }, { timeout: 5000 });

    const downloadButton = screen.getByRole("button", { name: /Download/i });
    fireEvent.click(downloadButton);
    
    // Check if the business logic was executed
    expect(createObjectURLMock).toHaveBeenCalled();
    expect(appendSpy).toHaveBeenCalled();
    
    // Check if the anchor mock was used and clicked
    expect(anchorMock.download).toContain(".sbom.json");
    expect(clickSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
    
    vi.restoreAllMocks();
    window.URL.createObjectURL = originalCreateObjectURL;
    window.URL.revokeObjectURL = originalRevokeObjectURL;
  });
});
