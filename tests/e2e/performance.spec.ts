import { expect, test } from "@playwright/test";

test.describe("SBOM Performance", () => {
  test("efficiently handles a huge SBOM (20k components)", async ({ page }) => {
    // Increase timeout for this heavy test
    test.setTimeout(120000);
    
    await page.goto("/");
    
    // Wait for initial load to finish (loading screen gone)
    await expect(page.getByText("Loading analysis...")).not.toBeVisible({ timeout: 20000 });
    
    // Verify we are actually in the app
    await expect(page.getByRole("button", { name: "Huge SBOM (20k)" })).toBeVisible();
    
    // 1. Click on the Huge SBOM button
    const hugeButton = page.getByRole("button", { name: "Huge SBOM (20k)" });
    await expect(hugeButton).toBeVisible();
    await hugeButton.click();

    // 2. Verify progress indicator appears
    // The worker sends multiple progress updates. We check for the completion of processing.
    // Use a regex to match the component count flexibly (e.g. 20,000 or 20,001)
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
    // We check for some components that should be visible
    await expect(page.getByText("component-0", { exact: true })).toBeVisible({ timeout: 30000 });
    await expect(page.getByText("component-1", { exact: true })).toBeVisible({ timeout: 30000 });

    // 5. Test expansion responsiveness
    // Expand component-0
    await page.getByText("component-0", { exact: true }).click();
    // component-10 should now be visible as it's a child (based on our generator)
    await expect(page.getByText("component-10", { exact: true })).toBeVisible({ timeout: 20000 });

    // 6. Test scrolling speed (indirectly by ensuring we don't crash and can find a deep element)
    // We don't easily measure FPS, but we can verify we can see a sibling after expansion
    await expect(page.getByText("component-5", { exact: true })).toBeVisible({ timeout: 20000 });
  });
});
