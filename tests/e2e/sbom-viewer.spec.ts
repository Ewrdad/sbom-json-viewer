import { expect, test, type Page } from "@playwright/test";

const gotoViewer = async (page: Page) => {
  await page.goto("/");
  
  // Wait for initial loading to complete
  await expect(page.getByText(/Preparing viewer|Loading analysis/)).not.toBeVisible({ timeout: 15000 });

  // Now the manifest buttons should be visible
  await expect(
    page.getByPlaceholder("Self Scan (Latest)"),
  ).toBeVisible();
  await expect(
    page.getByText("Viewing: self/latest"),
  ).toBeVisible();
};

test.describe("SBOM Viewer", () => {
  test("loads the default sample SBOM", async ({ page }) => {
    await gotoViewer(page);

    await expect(
      page.getByText("Viewing: self/latest"),
    ).toBeVisible();
  });

  test("switches between sample and full SBOM files", async ({ page }) => {
    await gotoViewer(page);

    // Open the combobox
    await page.getByPlaceholder("Self Scan (Latest)").click();
    // Select the option
    await page.getByLabel("Self Scan").getByRole("option", { name: "TrivyScan", exact: true }).click();
    
    await expect(page.getByText("Viewing: self/TrivyScan")).toBeVisible();

    // Switch back
    await page.getByPlaceholder("TrivyScan").click();
    await page.getByRole("option", { name: "Self Scan (Latest)", exact: true }).click();
    
    await expect(
      page.getByText("Viewing: self/latest"),
    ).toBeVisible();
  });

  test("shows dashboard KPI cards and charts", async ({ page }) => {
    await gotoViewer(page);

    // Why: ensure dashboard visualizations render for the default SBOM.
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();
    await expect(page.getByText("Total Components")).toBeVisible();
    await expect(page.getByText("Vulnerability Severity")).toBeVisible();
    await expect(page.getByText("Top Licenses")).toBeVisible();
  });

  test("filters the components table", async ({ page }) => {
    await gotoViewer(page);

    await page.getByRole("button", { name: "Components" }).click();
    await expect(
      page.getByRole("heading", { name: "Component Explorer" }),
    ).toBeVisible();

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

    await page.getByRole("button", { name: "Components" }).click();
    await expect(
      page.getByRole("heading", { name: "Component Explorer" }),
    ).toBeVisible();

    // Why: validate row selection drives the detail panel.
    const searchInput = page.getByPlaceholder("Search components...");
    await searchInput.fill("react");
    await page.getByRole("row").filter({ hasText: "react" }).first().click();
    const detailPanel = page.getByTestId("detail-panel");
    await expect(
      detailPanel.getByRole("heading", { name: "Component Details" }),
    ).toBeVisible();
    await expect(detailPanel).toContainText("react");
  });

  test("expands the dependency tree", async ({ page }) => {
    await gotoViewer(page);

    await page.getByRole("button", { name: "Dependency Tree" }).click();
    await expect(
      page.getByRole("heading", { name: "Dependency Tree" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Severity" }).click();
    await page.getByRole("button", { name: "Summary" }).click();
  });

  test("displays the dependency graph controls", async ({ page }) => {
    await gotoViewer(page);

    await page.getByRole("button", { name: "Visual Graph" }).click();
    await expect(
      page.getByRole("heading", { name: "Dependency Graph" }),
    ).toBeVisible();

    await expect(
      page.getByRole("button", { name: "Export SVG" }),
    ).toBeEnabled();
  });
});
