import { expect, test } from "@playwright/test";

test.describe("SBOM View Caching", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for Dashboard heading to ensure initial load. Filter by visibility to handle KeepAlive if needed.
    await expect(page.getByRole("heading", { name: "Dashboard" }).filter({ visible: true }).first()).toBeVisible({ timeout: 20000 });
    // Use .first() to avoid strict mode violation if multiple component badges exist
    await expect(page.getByText(/components/i).filter({ visible: true }).first()).toBeVisible({ timeout: 20000 });
  });

  test("preserves Component Explorer search and selection state", async ({ page }) => {
    // 1. Go to Component Explorer
    await page.getByRole("button", { name: "Components" }).click();
    await expect(page.getByRole("heading", { name: "Component Explorer" }).filter({ visible: true }).first()).toBeVisible();

    // 2. Filter and select a component
    const searchInput = page.getByPlaceholder("Search components...").filter({ visible: true });
    await searchInput.fill("axios");
    
    // Wait for the row to appear in the active view
    const axiosRow = page.getByRole("row").filter({ hasText: "axios", visible: true }).first();
    await expect(axiosRow).toBeVisible();
    await axiosRow.click();
    
    // 3. Switch to another view (Dependency Tree)
    await page.getByRole("button", { name: "Dependency Tree" }).click();
    await expect(page.getByRole("heading", { name: "Dependency Tree" }).filter({ visible: true }).first()).toBeVisible();

    // 4. Switch back to Component Explorer
    await page.getByRole("button", { name: "Components" }).click();
    
    // 5. Verify state is preserved
    await expect(searchInput).toHaveValue("axios");
    await expect(axiosRow).toBeVisible();
    
    const detailPanel = page.getByTestId("detail-panel").filter({ visible: true });
    await expect(detailPanel).toBeVisible();
    await expect(detailPanel.getByText("axios", { exact: true })).toBeVisible();
  });

  test("preserves Dependency Tree expansion state", async ({ page }) => {
    // 1. Go to Dependency Tree
    await page.getByRole("button", { name: "Dependency Tree" }).click();
    await expect(page.getByRole("heading", { name: "Dependency Tree" }).filter({ visible: true }).first()).toBeVisible();

    // 2. Expand a node
    // axios is a root in simple sample.
    const treeRow = page.locator('div.group').filter({ has: page.getByText(/^axios$/, { exact: true }), visible: true }).first();
    await expect(treeRow).toBeVisible();
    
    const chevron = treeRow.locator('.chevron-toggle');
    await expect(chevron).toBeVisible();
    await chevron.click();

    // Verify child is visible (e.g., follow-redirects)
    await expect(page.getByText("follow-redirects").filter({ visible: true })).toBeVisible({ timeout: 10000 });

    // 3. Switch to Dashboard
    await page.getByRole("button", { name: "Dashboard" }).click();
    await expect(page.getByRole("heading", { name: "Dashboard" }).filter({ visible: true }).first()).toBeVisible();

    // 4. Switch back to Dependency Tree
    await page.getByRole("button", { name: "Dependency Tree" }).click();

    // 5. Verify tree is still expanded
    await expect(page.getByText("follow-redirects").filter({ visible: true })).toBeVisible();
  });
});
