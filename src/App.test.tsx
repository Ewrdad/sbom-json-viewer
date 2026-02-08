import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
} from "@testing-library/react";
import App from "./App";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Recharts to avoid responsive container issues in jsdom
vi.mock("recharts", async () => {
  const OriginalModule = await vi.importActual("recharts");
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(OriginalModule as any),
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 800, height: 800 }}>{children}</div>
    ),
  };
});

// Polyfill ResizeObserver
vi.stubGlobal(
  "ResizeObserver",
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

describe("App Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock fetch
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url) => {
        console.log("Fetching:", url); // Debug log
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
    expect(screen.getAllByText(/Total Components:/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Unique Licenses:/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Critical Vulns:/i).length).toBeGreaterThan(0);
  });

  it("should switch views when sidebar buttons are clicked", async () => {
    render(<App />);

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
      expect(
        screen.getByRole("heading", { name: /Explorer/i, level: 2 }),
      ).toBeInTheDocument();
    });

    // Assert content in explorer without relying on table role
    expect(await screen.findByText(/comp1/i)).toBeInTheDocument();
  });
});
