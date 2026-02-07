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
  components: [
    {
      name: "comp-a",
      bomRef: { value: "pkg:npm/comp-a@1.0.0" },
      formattedDependencies: [],
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
    },
  ],
};

describe("Renderer", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders loading state before formatting completes", async () => {
    vi.doMock("./Formatter/Formatter", () => ({
      Formatter: vi.fn(async ({ setProgress }) => {
        setProgress({ progress: 50, message: "Formatting..." });
        // Keep promise pending so we stay in loading state
        return new Promise(() => undefined) as any;
      }),
    }));

    vi.doMock("./SBOMComponent/SBOMComponent", () => ({
      SBOMComponent: () => <div>SBOM component</div>,
    }));

    const { Renderer } = await import("./renderer");
    await act(async () => {
      render(<Renderer SBOM={{}} />);
    });

    expect(screen.getByText("Formatting...")).toBeInTheDocument();
  });

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
    expect(screen.getByText(/Total Components:/)).toBeInTheDocument();
    expect(screen.getByText(/Unique Licenses:/)).toBeInTheDocument();
    expect(screen.getByText(/Critical Vulns:/)).toBeInTheDocument();
    expect(screen.getByText(/High Vulns:/)).toBeInTheDocument();
    expect(screen.getByText("Component: comp-a")).toBeInTheDocument();
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
    expect(screen.getByText(/Boom/)).toBeInTheDocument();

    consoleError.mockRestore();
  });
});
