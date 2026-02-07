import { expect, test } from "@playwright/test";

const gotoViewer = async (page) => {
  await page.goto("/");
  // Why: wait for Formatter to complete so the toolbar and cards are ready.
  await expect(
    page.getByRole("heading", { name: "SBOM Statistics" }),
  ).toBeVisible();
};

const cardTitleFor = (page, name: string) =>
  page.locator('[data-slot="card-title"]').filter({ hasText: name });

test.describe("SBOM Viewer", () => {
  test("loads the default sample SBOM", async ({ page }) => {
    await gotoViewer(page);

    await expect(
      page.getByRole("heading", { name: "SBOM Viewer" }),
    ).toBeVisible();

    // Verifies the default file to ensure the app loaded data correctly.
    await expect(page.getByText("sample-simple.cyclonedx.json")).toBeVisible();
  });

  test("switches between sample and full SBOM files", async ({ page }) => {
    await gotoViewer(page);

    await page.getByRole("button", { name: "Full SBOM" }).click();
    await expect(page.getByText("sbom.cyclonedx.json")).toBeVisible();

    await page.getByRole("button", { name: "Simple Sample" }).click();
    await expect(page.getByText("sample-simple.cyclonedx.json")).toBeVisible();
  });

  test("supports keyboard shortcuts for search", async ({ page }) => {
    await gotoViewer(page);

    await page.keyboard.press("/");
    const searchInput = page.getByPlaceholder(
      "Search components, groups, bom-ref, or purl...",
    );
    await expect(searchInput).toBeFocused();

    await searchInput.fill("lodash");
    await page.keyboard.press("Escape");
    await expect(searchInput).toHaveValue("");
  });

  test("filters components by search query and pruning", async ({ page }) => {
    await gotoViewer(page);

    const searchInput = page.getByPlaceholder(
      "Search components, groups, bom-ref, or purl...",
    );
    await searchInput.fill("axios");

    await expect(cardTitleFor(page, "axios").first()).toBeVisible();
    await expect(cardTitleFor(page, "express")).toHaveCount(0);

    await page.getByRole("button", { name: "Prune non-matches" }).click();
    await expect(
      page.getByRole("button", { name: "Show full branches" }),
    ).toBeVisible();
  });

  test("toggles vulnerable-only filtering", async ({ page }) => {
    await gotoViewer(page);

    await page.getByRole("button", { name: "All components" }).click();
    await expect(
      page.getByRole("button", { name: "Vulnerable only" }),
    ).toBeVisible();

    // Why: express has no vulnerabilities in the sample SBOM.
    await expect(cardTitleFor(page, "express")).toHaveCount(0);
    await expect(cardTitleFor(page, "axios").first()).toBeVisible();
  });

  test("cycles sort modes", async ({ page }) => {
    await gotoViewer(page);

    const sortButton = page.getByRole("button", { name: /Sort:/ });
    await expect(sortButton).toHaveText(/Sort: Vulns/);

    await sortButton.click();
    await expect(sortButton).toHaveText(/Sort: Deps/);

    await sortButton.click();
    await expect(sortButton).toHaveText(/Sort: Name/);

    await sortButton.click();
    await expect(sortButton).toHaveText(/Sort: Vulns/);
  });

  test("expands and collapses dependency panels", async ({ page }) => {
    await gotoViewer(page);

    await page.getByRole("button", { name: "Collapse all" }).click();
    await expect(
      page.getByRole("button", { name: /Show Dependencies/ }).first(),
    ).toBeVisible();

    await page.getByRole("button", { name: "Expand all" }).click();
    await expect(
      page.getByRole("button", { name: /Hide Dependencies/ }).first(),
    ).toBeVisible();
  });

  test("focuses and exits focus mode", async ({ page }) => {
    await gotoViewer(page);

    await page.getByRole("button", { name: "Focus" }).first().click();
    await expect(page.getByText("Focused path")).toBeVisible();

    await page.getByRole("button", { name: "Exit focus" }).click();
    await expect(page.getByText("Focused path")).toHaveCount(0);
  });

  test("opens the Mermaid export dialog", async ({ page }) => {
    await gotoViewer(page);

    await page.getByRole("button", { name: "Export Mermaid" }).click();
    await expect(
      page.getByRole("heading", { name: "Mermaid export preview" }),
    ).toBeVisible();

    await expect(page.locator("textarea")).toHaveValue(/flowchart TB/);
  });

  test("reset filters restores defaults", async ({ page }) => {
    await gotoViewer(page);

    const searchInput = page.getByPlaceholder(
      "Search components, groups, bom-ref, or purl...",
    );
    await searchInput.fill("axios");
    await page.getByRole("button", { name: "All components" }).click();
    await page.getByRole("button", { name: "Comfort" }).click();
    await page.getByRole("button", { name: "Collapse all" }).click();

    await page.getByRole("button", { name: "Reset filters" }).click();

    await expect(searchInput).toHaveValue("");
    await expect(
      page.getByRole("button", { name: "All components" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Prune non-matches" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Comfort" })).toBeVisible();
  });
});
