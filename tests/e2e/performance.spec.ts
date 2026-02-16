import { expect, test } from "@playwright/test";

test.describe("SBOM Performance", () => {
  test("efficiently handles a huge SBOM (20k components)", async ({ page }) => {
    // Increase timeout for this heavy test
    test.setTimeout(120000);
    
    await page.goto("/");
    
    // Wait for initial load to finish (loading screen gone)
    await expect(page.getByText(/Preparing viewer|Loading analysis/)).not.toBeVisible({ timeout: 20000 });
    
    // Verify we are actually in the app
    const sbomSelector = page.getByPlaceholder("Simple Example");
    await expect(sbomSelector).toBeVisible();
    
    // 1. Click on the Huge SBOM button
    await sbomSelector.click();
    const hugeOption = page.getByRole("option", { name: "Huge Example (20k)" });
    await expect(hugeOption).toBeVisible();
    await hugeOption.click();

    // 2. Verify progress indicator appears
    // The worker sends multiple progress updates. We check for the completion of processing.
    await expect(page.getByText(/20,00\d components/)).toBeVisible({ timeout: 60000 });
    await expect(page.getByText("Large SBOM mode")).toBeVisible();

    // 3. Switch to Dependency Tree
    await page.getByRole("button", { name: "Dependency Tree" }).click();
    
    // Large SBOMs require a manual click to render the tree for performance safety
    const renderButton = page.getByRole("button", { name: "Render tree anyway" });
    await expect(renderButton).toBeVisible({ timeout: 20000 });
    await renderButton.click();
    
    await expect(page.getByRole("heading", { name: "Dependency Tree" })).toBeVisible({ timeout: 20000 });
    
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
