import { expect, test, type Page } from "@playwright/test";

const gotoViewer = async (page: Page) => {
  await page.goto("/");
  
  // Wait for initial loading to complete
  await expect(page.getByText(/Preparing viewer|Loading analysis/)).not.toBeVisible({ timeout: 15000 });

  // Now the manifest buttons should be visible
  await expect(
    page.getByTestId("sbom-selector-trigger"),
  ).toBeVisible();
  await expect(
    page.getByTestId("current-file-display"),
  ).toContainText("self/latest");
};

test.describe("SBOM Viewer", () => {
  test("loads the default sample SBOM", async ({ page }) => {
    await gotoViewer(page);

    await expect(
      page.getByTestId("current-file-display"),
    ).toContainText("self/latest");
  });

  test("switches between sample and full SBOM files", async ({ page }) => {
    await gotoViewer(page);

    // Open the combobox
    await page.getByTestId("sbom-selector-trigger").click();
    // Select the option
    await page.getByTestId("sbom-option-self/TrivyScan").click();
    
    await expect(page.getByTestId("current-file-display")).toContainText("self/TrivyScan");

    // Switch back
    await page.getByTestId("sbom-selector-trigger").click();
    await page.getByTestId("sbom-option-self/latest").click();
    
    await expect(
      page.getByTestId("current-file-display"),
    ).toContainText("self/latest");
  });

  test("shows dashboard KPI cards and charts", async ({ page }) => {
    await gotoViewer(page);

    // Why: ensure dashboard visualizations render for the default SBOM.
    await expect(
      page.getByTestId("view-title"),
    ).toContainText("Dashboard");
    await expect(page.getByText("Total Components")).toBeVisible();
    await expect(page.getByText("Vulnerability Severity")).toBeVisible();
    await expect(page.getByText("Top Licenses")).toBeVisible();
  });

  test("filters the components table", async ({ page }) => {
    await gotoViewer(page);

    await page.getByTestId("sidebar-link-explorer").click();
    await expect(
      page.getByTestId("view-title"),
    ).toContainText("Component Explorer");

    const searchInput = page.getByPlaceholder("Search components...");
    await searchInput.fill("react");
    await expect(page.getByText("react").first()).toBeVisible();

    await searchInput.fill("no-matches-here");
    await expect(page.getByText("No results.")).toBeVisible();

    // Clear search and just verify table populates again (any row beyond the header)
    await searchInput.fill("");
    await expect(page.getByRole("row").nth(1)).toBeVisible();
  });

  test("opens the component detail panel from the explorer", async ({
    page,
  }) => {
    await gotoViewer(page);

    await page.getByTestId("sidebar-link-explorer").click();
    await expect(
      page.getByTestId("view-title"),
    ).toContainText("Component Explorer");

    // Why: validate row selection drives the detail panel.
    const searchInput = page.getByPlaceholder("Search components...");
    await searchInput.fill("react");
    const row = page.getByRole("row").filter({ hasText: "react" }).first();
    await expect(row).toBeVisible();
    await row.getByRole("cell").nth(1).click();
    
    await expect(
      page.getByTestId("detail-panel-title"),
    ).toBeVisible();
    await expect(page.getByTestId("component-detail-panel")).toContainText("react");
  });

  test("expands the dependency tree", async ({ page }) => {
    await gotoViewer(page);

    await page.getByTestId("sidebar-link-tree").click();
    await expect(
      page.getByTestId("view-title"),
    ).toContainText("Dependency Tree");
    await page.getByTestId("tree-mode-severity").click();
    await page.getByTestId("tree-mode-summary").click();
  });

  test("displays the dependency graph controls", async ({ page }) => {
    await gotoViewer(page);

    await page.getByTestId("sidebar-link-graph").click();
    await expect(
      page.getByTestId("view-title"),
    ).toContainText("Dependency Graph");

    await expect(
      page.getByRole("button", { name: "Export SVG" }),
    ).toBeEnabled();
  });
});
