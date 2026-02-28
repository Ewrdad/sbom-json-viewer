import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MultiSbomStatsView } from "./MultiSbomStatsView";
import type { SbomStats } from "@/types/sbom";

// Mock Recharts to avoid issues in test environment
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
}));

const mockStats: SbomStats = {
  totalComponents: 10,
  vulnerabilityCounts: { critical: 1, high: 2, medium: 0, low: 0, none: 7 },
  licenseCounts: {},
  topLicenses: [],
  licenseDistribution: { permissive: 0, copyleft: 0, weakCopyleft: 0, proprietary: 0, unknown: 0 },
  vulnerableComponents: [],
  allVulnerableComponents: [],
  totalVulnerabilities: 3,
  allVulnerabilities: [],
  allLicenses: [],
  allLicenseComponents: [],
  uniqueVulnerabilityCount: 3,
  totalVulnerabilityInstances: 3,
  avgVulnerabilitiesPerComponent: 0.3,
  dependencyStats: { direct: 0, transitive: 0 },
  dependentsDistribution: {},
  vulnerabilityImpactDistribution: {},
  cweCounts: {},
  sourceCounts: {},
  multiSbomStats: {
    sources: [
      {
        name: "Scanner A",
        componentsFound: 8,
        vulnerabilitiesFound: 2,
        criticalCount: 1,
        highCount: 1,
        mediumCount: 0,
        lowCount: 0,
        metadataScore: 80,
        metadataGrade: "A",
        rank: 1,
        isBest: true,
        uniqueComponents: 2,
        uniqueVulnerabilities: 1
      },
      {
        name: "Scanner B",
        componentsFound: 6,
        vulnerabilitiesFound: 2,
        criticalCount: 0,
        highCount: 2,
        mediumCount: 0,
        lowCount: 0,
        metadataScore: 60,
        metadataGrade: "B",
        rank: 2,
        isBest: false,
        uniqueComponents: 1,
        uniqueVulnerabilities: 1
      }
    ],
    overlap: {
      components: { unique: 3, shared: 5, total: 10 },
      vulnerabilities: { unique: 2, shared: 1, total: 3 }
    },
    trustScore: 75,
    discoveryDensity: 1.4,
    gaps: [
      {
        sourceName: "Scanner A",
        uniqueComponents: [{ name: "comp-a", version: "1.0.0" }],
        uniqueVulnerabilities: [{ id: "CVE-1", severity: "critical", componentName: "comp-a" }]
      }
    ],
    crossSourceComponents: [
      {
        name: "shared-comp",
        version: "1.2.3",
        foundBy: ["Scanner A", "Scanner B"],
        metadataBySource: {
          "Scanner A": { hasPurl: true, hasLicenses: true, hasHashes: true },
          "Scanner B": { hasPurl: true, hasLicenses: false, hasHashes: false }
        }
      }
    ]
  }
};

describe("MultiSbomStatsView", () => {
  it("renders empty state when no stats provided", () => {
    render(<MultiSbomStatsView stats={undefined} />);
    expect(screen.getByText("No Multi-SBOM Data Available")).toBeInTheDocument();
  });

  it("renders KPI cards with correct data", () => {
    render(<MultiSbomStatsView stats={mockStats} />);
    expect(screen.getByText("10")).toBeInTheDocument(); // Total components
    expect(screen.getByText("3")).toBeInTheDocument(); // Total vulnerabilities
    expect(screen.getByText("75%")).toBeInTheDocument(); // Trust Score
    expect(screen.getByText("1.40x")).toBeInTheDocument(); // Discovery Density
  });

  it("renders source efficacy table", () => {
    render(<MultiSbomStatsView stats={mockStats} />);
    expect(screen.getAllByText("Scanner A").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Scanner B").length).toBeGreaterThan(0);
    expect(screen.getByText("80/100")).toBeInTheDocument();
    expect(screen.getByText("Grade A")).toBeInTheDocument();
  });

  it("renders detailed comparison table and handles search", () => {
    render(<MultiSbomStatsView stats={mockStats} />);
    expect(screen.getByText("shared-comp")).toBeInTheDocument();
    
    const searchInput = screen.getByPlaceholderText("Filter components...");
    fireEvent.change(searchInput, { target: { value: "non-existent" } });
    
    expect(screen.queryByText("shared-comp")).not.toBeInTheDocument();
  });

  it("renders gap analysis section", () => {
    render(<MultiSbomStatsView stats={mockStats} />);
    expect(screen.getByText("Scanner Blind Spots (Gap Analysis)")).toBeInTheDocument();
    expect(screen.getByText("Unique to Scanner A")).toBeInTheDocument();
    expect(screen.getAllByText("comp-a").length).toBeGreaterThan(0);
    expect(screen.getByText("CVE-1")).toBeInTheDocument();
  });
});
