import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

const mockFormatted = {
  statistics: {
    licenses: [{ id: "MIT" }],
    vulnerabilities: {
      Critical: [{ id: "CVE-1" }],
      High: [{ id: "CVE-2" }],
      Medium: [],
      Low: [],
      Informational: [],
    },
  },
  metadata: {},
  componentMap: new Map([
    [
      "pkg:npm/comp-a@1.0.0",
      {
        name: "comp-a",
        bomRef: { value: "pkg:npm/comp-a@1.0.0" },
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
      } as any,
    ],
  ]),
  dependencyGraph: new Map(),
  topLevelRefs: ["pkg:npm/comp-a@1.0.0"],
};

describe("Renderer", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders loading state before formatting completes", async () => {
    let resolveFormatter: (value: any) => void = () => {};
    const formatterPromise = new Promise((resolve) => {
      resolveFormatter = resolve;
    });

    vi.doMock("./Formatter/Formatter", () => ({
      Formatter: vi.fn(async ({ setProgress }) => {
        setProgress({ progress: 50, message: "Formatting..." });
        return formatterPromise;
      }),
    }));

    vi.doMock("./SBOMComponent/SBOMComponent", () => ({
      SBOMComponent: () => <div>SBOM component</div>,
    }));

    const { Renderer } = await import("./renderer");
    render(<Renderer SBOM={{}} />);

    // Ensure the loading UI appears promptly
    await screen.findByText("Formatting...", {}, { timeout: 10000 });
    
    // Cleanup: resolve the promise so the test environment is clean
    await act(async () => {
      resolveFormatter(mockFormatted);
    });
  }, 15000);

  it("renders statistics and components after formatting", async () => {
    vi.doMock("./Formatter/Formatter", () => ({
      Formatter: vi.fn(async ({ setProgress }) => {
        setProgress({ progress: 100, message: "Done" });
        return mockFormatted as any;
      }),
    }));

    vi.doMock("./SBOMComponent/SBOMComponent", () => ({
      SBOMComponent: ({ component }: any) => (
        <div>Component: {component.name}</div>
      ),
    }));

    const { Renderer } = await import("./renderer");
    render(<Renderer SBOM={{}} />);

    expect(await screen.findByText("SBOM Statistics")).toBeInTheDocument();
    const totals = screen.getAllByText(/Total Components:/);
    expect(totals.length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Unique Licenses:/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Critical Vulns:/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/High Vulns:/).length).toBeGreaterThan(0);
    expect(await screen.findByText("Component: comp-a")).toBeInTheDocument();
  });

  it("isolates component failures with error boundary", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {
      // Why: React logs boundary errors; silence expected output for test clarity
    });

    vi.doMock("./Formatter/Formatter", () => ({
      Formatter: vi.fn(async ({ setProgress }) => {
        setProgress({ progress: 100, message: "Done" });
        return mockFormatted as any;
      }),
    }));

    vi.doMock("./SBOMComponent/SBOMComponent", () => ({
      SBOMComponent: () => {
        throw new Error("Boom");
      },
    }));

    const { Renderer } = await import("./renderer");
    render(<Renderer SBOM={{}} />);

    expect(
      await screen.findByText("Component render failed"),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Boom/)[0]).toBeInTheDocument();

    consoleError.mockRestore();
  });
});
