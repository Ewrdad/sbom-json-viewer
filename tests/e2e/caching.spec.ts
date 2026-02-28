import { expect, test } from "@playwright/test";

test.describe("SBOM View Caching", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(90000);
    await page.goto("/");
    // Wait for Dashboard heading to ensure initial load.
    await expect(page.getByTestId("view-title")).toContainText("Dashboard", { timeout: 20000 });
    // Use .first() to avoid strict mode violation if multiple component badges exist
    await expect(page.getByText(/components/i).filter({ visible: true }).first()).toBeVisible({ timeout: 20000 });
  });

  test("preserves Component Explorer search and selection state", async ({ page }) => {
    // 1. Go to Component Explorer
    await page.getByTestId("sidebar-link-explorer").click();
    await expect(page.getByTestId("view-title")).toContainText("Component Explorer");

    // 2. Filter and select a component
    // ...
    const searchInput = page.getByPlaceholder("Search components...").filter({ visible: true });
    await searchInput.fill("react");
    
    // Wait for the row to appear in the active view
    const componentRow = page.getByRole("row").filter({ hasText: "react", visible: true }).first();
    await expect(componentRow).toBeVisible();
    // Click a cell instead of the whole row for better reliability
    await componentRow.getByRole("cell").nth(1).click();
    
    // Verify detail panel opened
    await expect(page.getByTestId("detail-panel")).toBeVisible();
    
    // 3. Switch to another view (Dependency Tree)
    await page.getByTestId("sidebar-link-tree").click();
    await expect(page.getByTestId("view-title")).toContainText("Dependency Tree");

    // 4. Switch back to Component Explorer
    await page.getByTestId("sidebar-link-explorer").click();
    
    // 5. Verify state is preserved
    await expect(searchInput).toHaveValue("react");
    await expect(componentRow).toBeVisible();
    
    const detailPanel = page.getByTestId("detail-panel").filter({ visible: true });
    await expect(detailPanel).toBeVisible();
    await expect(detailPanel).toContainText("react");
  });

  test("preserves Dependency Tree expansion state", async ({ page }) => {
    // 1. Go to Dependency Tree
    await page.getByTestId("sidebar-link-tree").click();
    await expect(page.getByTestId("view-title")).toContainText("Dependency Tree");

    // 2. Expand a node
    // ...
    const firstChevron = page.locator('.chevron-toggle').first();
    await expect(firstChevron).toBeVisible();
    await firstChevron.click();

    // 3. Switch to Dashboard
    await page.getByTestId("sidebar-link-dashboard").click();
    await expect(page.getByTestId("view-title")).toContainText("Dashboard");

    // 4. Switch back to Dependency Tree
    await page.getByTestId("sidebar-link-tree").click();

    // 5. Verify tree is still expanded
    await expect(page.getByTestId("view-title")).toContainText("Dependency Tree");
  });
});
