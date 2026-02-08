import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DependencyGraph } from "./DependencyGraph";
import { createMockBom } from "../../test/mockData";

const formatterSpy = vi.hoisted(() => vi.fn());

vi.mock("../../renderer/Formatter/Formatter", () => ({
  Formatter: formatterSpy,
}));

vi.mock("../../lib/sbomSizing", () => ({
  getSbomSizeProfile: () => ({ componentCount: 20000, isLarge: true }),
}));

describe("DependencyGraph", () => {
  it("shows large SBOM guard and skips formatting", async () => {
    render(<DependencyGraph sbom={createMockBom({ components: [] })} />);

    expect(screen.getByText("Large SBOM detected")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /render graph anyway/i }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(formatterSpy).not.toHaveBeenCalled();
    });
  });
});
