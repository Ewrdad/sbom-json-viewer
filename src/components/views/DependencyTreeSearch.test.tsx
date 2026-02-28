import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { DependencyTree } from "./DependencyTree";
import * as useDependencyAnalysisHook from "../../hooks/useDependencyAnalysis";
import { SelectionProvider } from "../../context/SelectionContext";
import type { EnhancedComponent, formattedSBOM } from "../../types/sbom";

// Mock Virtuoso since it can be tricky in tests
vi.mock("react-virtuoso", () => ({
  Virtuoso: ({ totalCount, data, itemContent }: any) => (
    <div data-testid="virtuoso">
      {data.map((item: any, index: number) => (
        <div key={item.path}>
          {itemContent(index, item)}
        </div>
      ))}
    </div>
  ),
}));

// Mock Dependency Analysis hook
vi.mock("../../hooks/useDependencyAnalysis", () => ({
  useDependencyAnalysis: vi.fn(),
}));

const emptyVuls = { inherent: { Critical: [], High: [], Medium: [], Low: [], Informational: [] }, transitive: { Critical: [], High: [], Medium: [], Low: [], Informational: [] } };
const emptyLicenses = { permissive: 0, copyleft: 0, weakCopyleft: 0, proprietary: 0, unknown: 0 };

const createMockNode = (name: string, bomRef: string): EnhancedComponent => ({
  name,
  version: "1.0.0",
  bomRef: { value: bomRef } as any,
  vulnerabilities: emptyVuls,
  licenseDistribution: emptyLicenses,
}) as any;

const mockFormattedSbom: formattedSBOM = {
  statistics: { licenses: [], vulnerabilities: emptyVuls.inherent },
  metadata: {} as any,
  componentMap: new Map([
    ["parent-ref", createMockNode("parent-pkg", "parent-ref")],
    ["child-ref", {
      ...createMockNode("child-pkg", "child-ref"),
      vulnerabilities: {
        ...emptyVuls,
        inherent: { ...emptyVuls.inherent, Critical: [{ id: "CVE-SEARCH-TEST" } as any] }
      }
    } as any],
  ]),
  dependencyGraph: new Map([
    ["parent-ref", ["child-ref"]]
  ]),
  dependentsGraph: new Map(),
  blastRadius: new Map(),
  topLevelRefs: ["parent-ref"],
};

const mockAnalysis = {
  dependencyMap: new Map(),
  inverseDependencyMap: new Map([
    ["child-ref", ["parent-ref"]],
    ["parent-ref", []],
  ]),
  componentMap: new Map([
    ["parent-ref", { name: "parent-pkg", version: "1.0.0", bomRef: { value: "parent-ref" } }],
    ["child-ref", { name: "child-pkg", version: "2.0.0", bomRef: { value: "child-ref" } }],
  ]),
};

const mockFormattedSbomDeep: formattedSBOM = {
  statistics: { licenses: [], vulnerabilities: emptyVuls.inherent },
  metadata: {} as any,
  componentMap: new Map([
    ["root-ref", createMockNode("root-pkg", "root-ref")],
    ["mid-ref", createMockNode("mid-pkg", "mid-ref")],
    ["leaf-ref", createMockNode("leaf-pkg", "leaf-ref")],
  ]),
  dependencyGraph: new Map([
    ["root-ref", ["mid-ref"]],
    ["mid-ref", ["leaf-ref"]]
  ]),
  dependentsGraph: new Map(),
  blastRadius: new Map(),
  topLevelRefs: ["root-ref"],
};

const mockAnalysisDeep = {
  dependencyMap: new Map(),
  inverseDependencyMap: new Map([
    ["leaf-ref", ["mid-ref"]],
    ["mid-ref", ["root-ref"]],
    ["root-ref", []],
  ]),
  componentMap: new Map([
    ["root-ref", { name: "root-pkg", version: "1.0.0", bomRef: { value: "root-ref" } }],
    ["mid-ref", { name: "mid-pkg", version: "1.1.0", bomRef: { value: "mid-ref" } }],
    ["leaf-ref", { name: "leaf-pkg", version: "1.2.0", bomRef: { value: "leaf-ref" } }],
  ]),
};

describe("DependencyTree Search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the tree and allows searching for a package name", async () => {
    vi.mocked(useDependencyAnalysisHook.useDependencyAnalysis).mockReturnValue({
      analysis: mockAnalysis as any,
      status: "idle",
    });

    render(
      <SelectionProvider>
        <DependencyTree 
          sbom={{ 
            components: [
              { name: "parent-pkg", version: "1.0.0", bomRef: { value: "parent-ref" } },
              { name: "child-pkg", version: "2.0.0", bomRef: { value: "child-ref" } },
            ] 
          } as any} 
          formattedSbom={mockFormattedSbom} 
        />
      </SelectionProvider>
    );
    
    expect(screen.getByText("parent-pkg")).toBeInTheDocument();
    expect(screen.getByText("child-pkg")).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText("Search name, group or CVE...");
    fireEvent.change(searchInput, { target: { value: "child-pkg" } });

    // Wait for debounce
    expect(await screen.findByText("child-pkg")).toBeInTheDocument();
    expect(await screen.findByText("parent-pkg")).toBeInTheDocument();
    
    fireEvent.change(searchInput, { target: { value: "non-existent" } });
    
    // Wait for element to be removed
    await expect(screen.findByText("No components found")).resolves.toBeInTheDocument();
    expect(screen.queryByText("parent-pkg")).not.toBeInTheDocument();
    expect(screen.queryByText("child-pkg")).not.toBeInTheDocument();
  });

  it("filters by CVE ID", async () => {
    vi.mocked(useDependencyAnalysisHook.useDependencyAnalysis).mockReturnValue({
      analysis: mockAnalysis as any,
      status: "idle",
    });

    render(
      <SelectionProvider>
        <DependencyTree 
          sbom={{ 
            components: [
              { name: "parent-pkg", version: "1.0.0", bomRef: { value: "parent-ref" } },
              { name: "child-pkg", version: "2.0.0", bomRef: { value: "child-ref" } },
            ],
            vulnerabilities: [
              { id: "CVE-SEARCH-TEST", affects: [{ ref: "child-ref" }] }
            ]
          } as any} 
          formattedSbom={mockFormattedSbom} 
        />
      </SelectionProvider>
    );
    
    const searchInput = screen.getByPlaceholderText("Search name, group or CVE...");
    fireEvent.change(searchInput, { target: { value: "CVE-SEARCH-TEST" } });

    expect(await screen.findByText("child-pkg")).toBeInTheDocument();
    expect(await screen.findByText("parent-pkg")).toBeInTheDocument();
  });

  it("shows 'No components found' when there are no matches", async () => {
    vi.mocked(useDependencyAnalysisHook.useDependencyAnalysis).mockReturnValue({
      analysis: mockAnalysis as any,
      status: "idle",
    });

    render(
      <SelectionProvider>
        <DependencyTree sbom={{ components: [] } as any} formattedSbom={mockFormattedSbom} />
      </SelectionProvider>
    );
    
    const searchInput = screen.getByPlaceholderText("Search name, group or CVE...");
    fireEvent.change(searchInput, { target: { value: "xyz-no-match-xyz" } });

    expect(await screen.findByText("No components found")).toBeInTheDocument();
    expect(screen.getByText("Clear search")).toBeInTheDocument();
  });

  it("finds deeply nested dependencies and shows full path", async () => {
    vi.mocked(useDependencyAnalysisHook.useDependencyAnalysis).mockReturnValue({
      analysis: mockAnalysisDeep as any,
      status: "idle",
    });

    render(
      <SelectionProvider>
        <DependencyTree 
          sbom={{ 
            components: [
              { name: "root-pkg", version: "1.0.0", bomRef: { value: "root-ref" } },
              { name: "mid-pkg", version: "1.1.0", bomRef: { value: "mid-ref" } },
              { name: "leaf-pkg", version: "1.2.0", bomRef: { value: "leaf-ref" } },
            ] 
          } as any} 
          formattedSbom={mockFormattedSbomDeep} 
        />
      </SelectionProvider>
    );

    const searchInput = screen.getByPlaceholderText("Search name, group or CVE...");
    fireEvent.change(searchInput, { target: { value: "leaf-pkg" } });

    expect(await screen.findByText("leaf-pkg")).toBeInTheDocument();
    expect(screen.getByText("mid-pkg")).toBeInTheDocument();
    expect(screen.getByText("root-pkg")).toBeInTheDocument();
  });

  it("finds the root component from metadata", async () => {
    const mockAnalysisMetadata = {
      dependencyMap: new Map([["root-ref", ["child-ref"]]]),
      inverseDependencyMap: new Map([["child-ref", ["root-ref"]]]),
      componentMap: new Map([
        ["root-ref", { name: "metadata-root", version: "1.0.0", bomRef: { value: "root-ref" } }],
        ["child-ref", { name: "child-pkg", version: "2.0.0", bomRef: { value: "child-ref" } }],
      ]),
    };

    vi.mocked(useDependencyAnalysisHook.useDependencyAnalysis).mockReturnValue({
      analysis: mockAnalysisMetadata as any,
      status: "idle",
    });

    const mockFormattedMetadata: formattedSBOM = {
      statistics: { licenses: [], vulnerabilities: emptyVuls.inherent },
      metadata: {
        component: { name: "metadata-root", version: "1.0.0", bomRef: { value: "root-ref" } }
      } as any,
      componentMap: new Map([
        ["root-ref", createMockNode("metadata-root", "root-ref")],
        ["child-ref", createMockNode("child-pkg", "child-ref")],
      ]),
      dependencyGraph: new Map([["root-ref", ["child-ref"]]]),
      dependentsGraph: new Map(),
      blastRadius: new Map(),
      topLevelRefs: ["root-ref"],
    };

    render(
      <SelectionProvider>
        <DependencyTree 
          sbom={{ 
            metadata: {
              component: { name: "metadata-root", version: "1.0.0", bomRef: { value: "root-ref" } }
            },
            components: [
              { name: "child-pkg", version: "2.0.0", bomRef: { value: "child-ref" } },
            ] 
          } as any} 
          formattedSbom={mockFormattedMetadata} 
        />
      </SelectionProvider>
    );

    const searchInput = screen.getByPlaceholderText("Search name, group or CVE...");
    fireEvent.change(searchInput, { target: { value: "metadata-root" } });

    expect(await screen.findByText("metadata-root")).toBeInTheDocument();
  });
});
