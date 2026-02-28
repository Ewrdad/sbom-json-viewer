import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { App } from "../App";
import { ViewProvider } from "../context/ViewContext";
import { SelectionProvider } from "../context/SelectionContext";
import React from "react";

// Mock lazy-loaded views to avoid Suspense issues and speed up tests
vi.mock("../components/views/DashboardView", () => ({
  DashboardView: () => <div data-testid="dashboard-view">Dashboard View Content</div>,
  DashboardSkeleton: () => <div data-testid="dashboard-skeleton">Dashboard Skeleton</div>
}));
vi.mock("../components/views/VulnerabilitiesView", () => ({
  VulnerabilitiesView: () => <div data-testid="vulnerabilities-view">Vulnerabilities View</div>,
  VulnerabilitiesSkeleton: () => <div data-testid="vulnerabilities-skeleton">Vulnerabilities Skeleton</div>
}));
vi.mock("../components/views/ComponentExplorer", () => {
  return {
    ComponentExplorer: ({ sbom }: any) => {
      const [filter, setFilter] = React.useState("");
      return (
        <div data-testid="explorer-view">
          <h2>Component Explorer</h2>
          <input 
            placeholder="Search components..." 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)} 
          />
          <p>Results for: {filter}</p>
        </div>
      );
    }
  };
});
vi.mock("../components/views/DependencyTree", () => {
  return {
    DependencyTree: () => {
      const [expanded, setExpanded] = React.useState(false);
      return (
        <div data-testid="tree-view">
          <h2>Dependency Tree</h2>
          <button onClick={() => setExpanded(!expanded)}>
            {expanded ? "Collapse Node" : "Expand Node"}
          </button>
          {expanded && <div data-testid="child-node">Child Node Content</div>}
        </div>
      );
    }
  };
});
vi.mock("../components/views/DependencyGraph", () => ({
  DependencyGraph: () => <div data-testid="graph-view">Dependency Graph</div>
}));
vi.mock("../components/views/VulnerabilitiesView", () => ({
  VulnerabilitiesView: () => <div data-testid="vulnerabilities-view">Vulnerabilities View</div>
}));

// Mock Worker
class MockWorker {
  onmessage: ((e: any) => void) | null = null;
  postMessage(data: any) {
    setTimeout(() => {
      this.onmessage?.({
        data: {
          type: "complete",
          result: {
            bom: { components: new Set([{ name: "test-pkg", version: "1.0.0", bomRef: { value: "test-ref" } }]), vulnerabilities: new Set() },
            formatted: { componentMap: {}, dependencyGraph: {}, topLevelRefs: [] },
            stats: { 
              totalComponents: 1, 
              vulnerabilityCounts: { critical: 0, high: 0, medium: 0, low: 0, none: 1 },
              licenseCounts: {},
              topLicenses: [],
              licenseDistribution: { permissive: 0, copyleft: 0, weakCopyleft: 0, proprietary: 0, unknown: 1 },
              vulnerableComponents: [],
              allVulnerableComponents: [],
              totalVulnerabilities: 0,
              allVulnerabilities: [],
              allLicenses: [],
              allLicenseComponents: [],
              cweCounts: {},
              sourceCounts: {}
            }
          }
        }
      });
    }, 0);
  }
  terminate() {}
}

vi.stubGlobal("Worker", MockWorker);

// Mock fetch
vi.stubGlobal('fetch', vi.fn().mockImplementation((url) => {
  if (url.toString().endsWith("manifest.json")) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        default: "examples/sample-simple",
        files: [
          { name: "Simple Sample", path: "sboms/examples/sample-simple.sbom.json", id: "examples/sample-simple" }
        ]
      })
    });
  }
  return Promise.resolve({
    ok: true,
    headers: new Map([["content-length", "100"]]),
    body: {
      getReader: () => ({
        read: async () => ({ done: true, value: new TextEncoder().encode('{}') }),
        releaseLock: () => {},
      }),
    },
    text: () => Promise.resolve('{}'),
    json: () => Promise.resolve({}),
  });
}));

describe("View Caching Integration", () => {
  it("should preserve Component Explorer search state when switching views", async () => {
    render(
      <ViewProvider>
        <SelectionProvider>
          <App />
        </SelectionProvider>
      </ViewProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-view")).toBeInTheDocument();
    }, { timeout: 5000 });

    const explorerBtn = screen.getAllByTestId("sidebar-link-explorer")[0];
    fireEvent.click(explorerBtn);

    await waitFor(() => {
      expect(screen.getByTestId("explorer-view")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search components.../i);
    fireEvent.change(searchInput, { target: { value: "test-pkg" } });
    expect(searchInput).toHaveValue("test-pkg");

    const treeBtn = screen.getByRole("button", { name: /Dependency Tree/i });
    fireEvent.click(treeBtn);

    await waitFor(() => {
      expect(screen.getByTestId("tree-view")).toBeInTheDocument();
    });

    fireEvent.click(explorerBtn);

    await waitFor(() => {
      expect(screen.getByTestId("explorer-view")).toBeInTheDocument();
    });

    const searchInputAgain = screen.getByPlaceholderText(/Search components.../i);
    expect(searchInputAgain).toHaveValue("test-pkg");
  });

  it("should preserve Dependency Tree expansion state when switching views", async () => {
    render(
      <ViewProvider>
        <SelectionProvider>
          <App />
        </SelectionProvider>
      </ViewProvider>
    );

    await waitFor(() => expect(screen.getByTestId("dashboard-view")).toBeInTheDocument());

    const treeBtn = screen.getByTestId("sidebar-link-tree");
    fireEvent.click(treeBtn);

    await waitFor(() => expect(screen.getByTestId("tree-view")).toBeInTheDocument());

    // Expand node
    const expandBtn = screen.getByText("Expand Node");
    fireEvent.click(expandBtn);
    expect(screen.getByTestId("child-node")).toBeInTheDocument();

    // Switch to Dashboard
    const dashboardBtn = screen.getByRole("button", { name: /Dashboard/i });
    fireEvent.click(dashboardBtn);
    await waitFor(() => expect(screen.getByTestId("dashboard-view")).toBeInTheDocument());

    // Switch back to Tree
    fireEvent.click(treeBtn);
    await waitFor(() => expect(screen.getByTestId("tree-view")).toBeInTheDocument());

    // Verify child is still there (proving state preservation)
    expect(screen.getByTestId("child-node")).toBeInTheDocument();
  });
});
