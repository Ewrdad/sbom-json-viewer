import { expect, test } from "@playwright/test";

test.describe("SBOM Routing", () => {
  test("navigates via URL hash", async ({ page }) => {
    // 1. Navigate to the base URL
    await page.goto("/");
    await expect(page.getByTestId("current-file-display")).toContainText("self/latest", { timeout: 45000 });

    // 2. Navigate to a specific SBOM via hash
    await page.goto("/#/self/TrivyScan");
    
    // Check if the file changed - wait for URL first
    await expect(page).toHaveURL(/.*#\/self\/TrivyScan/, { timeout: 30000 });
    await expect(page.getByTestId("current-file-display")).toContainText("self/TrivyScan", { timeout: 45000 });
    
    // 3. Verify the URL is correct
     expect(page.url()).toContain("#/self/TrivyScan");
  });

  test("updates URL when switching files via UI", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/");
    
    // 1. Click a different SBOM button
    await page.getByTestId("sbom-selector-trigger").click();
    await page.getByTestId("sbom-option-self/TrivyScan").click();
    
    // 2. Verify URL and content update
    await expect(page).toHaveURL(/.*#\/self\/TrivyScan/);
    await expect(page.getByTestId("current-file-display")).toContainText("self/TrivyScan");
    
    // 3. Click back to simple
    await page.getByTestId("sbom-selector-trigger").click();
    await page.getByTestId("sbom-option-self/latest").click();
    await expect(page).toHaveURL(/.*#\/self\/latest/);
    await expect(page.getByTestId("current-file-display")).toContainText("self/latest");
  });

  test("handles browser back/forward buttons", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/#/self/latest");
    await expect(page.getByTestId("current-file-display")).toContainText("self/latest", { timeout: 45000 });

    // 1. Navigate to another file
    await page.getByTestId("sbom-selector-trigger").click();
    await page.getByTestId("sbom-option-self/TrivyScan").click();
    await expect(page.getByTestId("current-file-display")).toContainText("self/TrivyScan", { timeout: 45000 });

    // 2. Go Back
    await page.goBack();
    await expect(page.getByTestId("current-file-display")).toContainText("self/latest");
    await expect(page).toHaveURL(/.*#\/self\/latest/);

    // 3. Go Forward
    await page.goForward();
    await expect(page.getByTestId("current-file-display")).toContainText("self/TrivyScan");
     await expect(page).toHaveURL(/.*#\/self\/TrivyScan/);
  });
});
