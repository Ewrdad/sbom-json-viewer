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
  DashboardView: ({ preComputedStats }: { preComputedStats: any }) => (
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
  ComponentExplorer: ({ sbom }: { sbom: any }) => (
    <div data-testid="explorer-view">
      Explorer
      {sbom.components?.map((c: any) => (
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
}));

// Polyfill Worker
class MockWorker {
  onmessage: (e: any) => void = () => {};
  onerror: (e: any) => void = () => {};
  
  postMessage(data: any) {
    // Simulate worker processing
    setTimeout(() => {
      try {
        const json = JSON.parse(data.jsonText);
        // Mock the minimal results expected by App.tsx
        const mockResult = {
          bom: json, // Simple pass through for mock
          formatted: {
            // Minimal structure for DependencyTree
            components: [],
            dependencyMap: {},
            inverseDependencyMap: {}
          },
          stats: {
            totalComponents: json.components?.length || 0,
            vulnerabilityCounts: { critical: 0, high: 0, medium: 0, low: 0, none: 0 },
            licenseCounts: {},
            topLicenses: [],
            vulnerableComponents: []
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

    // Mock fetch
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url) => {
        if (
          url.toString().endsWith("sample-simple.cyclonedx.json") ||
          url.toString().endsWith("sbom.cyclonedx.json")
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
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();

    // Wait for dashboard to appear (lazy-loaded)
    await waitFor(
      () => {
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

  it("should switch views when sidebar buttons are clicked", async () => {
    render(<App />);

    // Wait for initial load to finish
    await waitFor(() => {
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
});
