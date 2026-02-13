import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReverseDependencyTree } from "./ReverseDependencyTree";
import { createMockBom, createMockComponent } from "../../test/mockData";
import { type formattedSBOM } from "../../types/sbom";

// Mock ResizeObserver for Virtuoso
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserver;

// Mock ScrollArea to be a simple div to avoid potential issues in test
vi.mock("../ui/scroll-area", () => ({
  ScrollArea: ({ children, className }: any) => <div className={className} data-testid="scroll-area">{children}</div>,
}));

describe("ReverseDependencyTree", () => {
  it("renders a large list of components", async () => {
    // Create 1000 items
    const components: any[] = [];
    const componentMap = new Map();
    const dependentsGraph = new Map();
    const blastRadius = new Map();

    for (let i = 0; i < 1000; i++) {
        const ref = `pkg:npm/comp-${i}@1.0.0`;
        // Ensure name is distinct
        const comp = createMockComponent(ref, `TestComponent${i}`, { version: "1.0.0" }); 
        components.push(comp);
        componentMap.set(ref, comp);
        dependentsGraph.set(ref, []);
        blastRadius.set(ref, 0);
    }

    const sbom = createMockBom({ components });
    const formattedSbom: formattedSBOM = {
        componentMap,
        dependentsGraph,
        blastRadius,
        rootComponents: [],
        vulnerabilities: new Map(),
        licenseMap: new Map(),
        dependencyGraph: new Map()
    } as unknown as formattedSBOM;

    render(
        <div style={{ height: "800px", width: "100%" }}>
            <ReverseDependencyTree sbom={sbom} formattedSbom={formattedSbom} />
        </div>
    );
    
    // In the virtualized version, only a subset of items should be in the DOM
    const items = await screen.findAllByText(/TestComponent\d+/);
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThan(1000); // Should be much less, e.g. ~20-50 based on height
  });
});
