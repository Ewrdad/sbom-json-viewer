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
  DashboardSkeleton: () => <div data-testid="dashboard-skeleton">Dashboard Skeleton</div>,
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
  VulnerabilitiesSkeleton: () => <div data-testid="vulnerabilities-skeleton">Vulnerabilities Skeleton</div>,
}));
vi.mock("./components/views/ReverseDependencyTree", () => ({
  ReverseDependencyTree: () => <div data-testid="reverse-tree-view">Reverse Tree View</div>,
}));

// Mock Lucide icons
vi.mock("lucide-react", () => {
  const icons = {
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
    Wrench: () => <div />,
    CheckCircle: () => <div />,
    CheckCircle2: () => <div />,
    Lightbulb: () => <div />,
    Terminal: () => <div />,
    Globe: () => <div />,
    AlertTriangle: () => <div />,
    AlertCircle: () => <div />,
    Copy: () => <div />,
    Check: () => <div />,
    Eye: () => <div />,
    EyeOff: () => <div />,
    Filter: () => <div />,
    Fingerprint: () => <div />,
    ExternalLink: () => <div />,
    History: () => <div />,
    ShieldQuestion: () => <div />,
    Command: () => <div />,
    CornerDownLeft: () => <div />,
    Home: () => <div />,
    ListTodo: () => <div />,
    ArrowUpCircle: () => <div />,
    Trophy: () => <div />,
    SearchX: () => <div />,
    Settings: () => <div />,
    Settings2: () => <div />,
    Menu: () => <div />,
    Maximize2: () => <div />,
    Minimize2: () => <div />,
    RotateCcw: () => <div />,
  };
  return icons;
});

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
            sourceCounts: {},
            multiSbomStats: {
              sources: [],
              overlap: { components: { shared: 0, unique: 0 }, vulnerabilities: { shared: 0, unique: 0 } }
            }
          }
        };
        
        this.onmessage({ data: { type: 'complete', result: mockResult } } as any);
      } catch (err) {
        this.onerror(err as any);
      }
    }, 10);
  }
  
  terminate() {}
}

vi.stubGlobal("Worker", MockWorker);

// Mock fetch for manifest and examples
vi.stubGlobal("fetch", vi.fn(async (url: string) => {
  if (url.endsWith("manifest.json")) {
    return {
      ok: true,
      json: async () => ({
        default: "test-id",
        files: [{ id: "test-id", name: "Test SBOM", path: "test.json" }]
      })
    };
  }
  if (url.endsWith("test.json")) {
    return {
      ok: true,
      json: async () => ({
        bomFormat: "CycloneDX",
        specVersion: "1.5",
        components: []
      })
    };
  }
  return { ok: false };
}));

describe("App Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.location.hash = "";
  });

  it("sanity check", () => {
    expect(true).toBe(true);
  });

  it("should load SBOM and display Dashboard by default", async () => {
    render(<App />);
    
    // Wait for the dashboard view to appear
    await waitFor(() => {
      expect(screen.getByTestId("dashboard-view")).toBeInTheDocument();
    }, { timeout: 10000 });
    
    expect(screen.getByText(/Test SBOM/i)).toBeInTheDocument();
  });

  it("should render the help button in the header", async () => {
    render(<App />);
    
    // Header help button uses HelpCircle or similar icon
    // Since we mock icons as <div />, we might need another way to find it
    // but usually it has a title or aria-label
    await waitFor(() => {
      expect(screen.getByTestId("dashboard-view")).toBeInTheDocument();
    });
    
    // The button has a tooltip/title "Help Guide"
    // Let's find it by role and partial name
    const helpBtn = screen.getByRole("button", { name: /help guide/i });
    expect(helpBtn).toBeInTheDocument();
  });

  it("should switch views when sidebar buttons are clicked", async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByTestId("dashboard-view")).toBeInTheDocument();
    });

    // Click Components button
    const componentsBtn = screen.getAllByTestId("sidebar-link-explorer")[0];
    fireEvent.click(componentsBtn);
    
    await waitFor(() => {
      expect(screen.getByTestId("explorer-view")).toBeInTheDocument();
    });

    // Click Dependency Tree button
    const treeBtn = screen.getAllByTestId("sidebar-link-tree")[0];
    fireEvent.click(treeBtn);
    
    await waitFor(() => {
      expect(screen.getByTestId("tree-view")).toBeInTheDocument();
    });
  });
  
  it("should show download button and trigger download when clicked", async () => {
    // Mock URL methods on the existing global URL object
    const createObjectURLMock = vi.fn().mockReturnValue("blob:mock-url");
    const revokeObjectURLMock = vi.fn();
    
    // Support both constructor and static methods
    class MockURL {
      url: string;
      constructor(url: string) {
        this.url = url;
      }
      static createObjectURL = createObjectURLMock;
      static revokeObjectURL = revokeObjectURLMock;
    }
    
    vi.stubGlobal('URL', MockURL);

    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByTestId("dashboard-view")).toBeInTheDocument();
    }, { timeout: 10000 });

    const downloadBtn = screen.getByRole("button", { name: /Download/i });
    expect(downloadBtn).toBeInTheDocument();
    
    // Click download
    fireEvent.click(downloadBtn);
    
    expect(createObjectURLMock).toHaveBeenCalled();
  });
});
