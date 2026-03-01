import { expect, test } from "@playwright/test";

test.describe("SBOM Performance", () => {
  test("efficiently handles a huge SBOM (20k components)", async ({ page }) => {
    // Increase timeout for this heavy test
    test.setTimeout(300000);
    
    await page.goto("/");
    
    // Wait for initial load to finish (loading screen gone)
    await expect(page.getByText(/Preparing viewer|Loading analysis/)).not.toBeVisible({ timeout: 20000 });
    
    // Verify we are actually in the app
    const sbomSelector = page.getByTestId("sbom-selector-input");
    await expect(sbomSelector).toBeVisible();
    
    // 1. Click on the Huge SBOM button
    // Try clicking the trigger first, fallback to input
    const trigger = page.getByTestId("sbom-selector-input-trigger");
    if (await trigger.isVisible()) {
        await trigger.click();
    } else {
        await page.getByTestId("sbom-selector-input").click();
    }
    await page.waitForTimeout(1000);
    
    const hugeOption = page.getByTestId("sbom-option-examples/sbom-huge");
    await hugeOption.click({ force: true });

    // 2. Verify progress indicator and results
    // Wait for Large SBOM badge first as it's a solid indicator
    await expect(page.getByTestId("large-sbom-badge")).toBeVisible({ timeout: 200000 });

    // Verify Dashboard shows the count (with comma or without)
    const dashboardCount = page.locator('.text-2xl.font-bold').first();
    await expect(dashboardCount).toContainText(/20,001|20001|20,000|20000/);

    // Header should also have it
    await expect(page.getByTestId("header-component-count")).toContainText(/20,001|20001|20,000|20000/);

    // 3. Switch to Dependency Tree
    await page.getByTestId("sidebar-link-tree").click();
    
    // Large SBOMs require a manual click to render the tree for performance safety
    const renderButton = page.getByRole("button", { name: "Render tree anyway" });
    await expect(renderButton).toBeVisible({ timeout: 20000 });
    await renderButton.click();
    
    await expect(page.getByTestId("view-title")).toContainText("Dependency Tree", { timeout: 20000 });
    
    // 4. Verify tree content is rendered (virtuoso should handle this)
    // We check for root child
    await expect(page.getByText("component-0", { exact: true })).toBeVisible({ timeout: 30000 });
    
    // 5. Test expansion responsiveness
    // Use search to bring component-10 into view (virtualization might hide it)
    const searchInput = page.getByPlaceholder("Search name, group or CVE...");
    await searchInput.fill("component-10");
    const node10 = page.getByText("component-10", { exact: true }).first();
    await expect(node10).toBeVisible({ timeout: 20000 });
    await node10.click();
    
    // component-100 should now be visible as it's a child (based on our generator)
    await expect(page.getByText("component-100", { exact: true })).toBeVisible({ timeout: 20000 });

    // 6. Test deep find / scale
    await searchInput.fill("component-19999");
    await expect(page.getByText("component-19999", { exact: true }).first()).toBeVisible({ timeout: 20000 });
  });
});
