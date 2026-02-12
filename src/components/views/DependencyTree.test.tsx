import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DependencyTree } from "./DependencyTree";
import { createMockBom } from "../../test/mockData";

const formatterSpy = vi.hoisted(() => vi.fn());

vi.mock("../../renderer/Formatter/Formatter", () => ({
  Formatter: formatterSpy,
}));

vi.mock("../../lib/sbomSizing", () => ({
  getSbomSizeProfile: () => ({ componentCount: 20000, isLarge: true }),
}));

vi.mock("../../hooks/useDependencyAnalysis", () => ({
  useDependencyAnalysis: () => ({ analysis: null, status: "idle" }),
}));

describe("DependencyTree", () => {
  it("shows large SBOM guard and skips formatting", async () => {
    render(<DependencyTree sbom={createMockBom({ components: [] })} />);

    expect(screen.getByText("Large SBOM detected")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /render tree anyway/i }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(formatterSpy).not.toHaveBeenCalled();
    });
  });
});
