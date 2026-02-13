import { expect, test } from "@playwright/test";

test.describe("SBOM Routing", () => {
  test("navigates via URL hash", async ({ page }) => {
    // 1. Navigate to the base URL
    await page.goto("/");
    await expect(page.getByText("Viewing: examples/sample-simple")).toBeVisible({ timeout: 45000 });

    // 2. Navigate to a specific SBOM via hash
    await page.goto("/#/examples/sbom-full");
    
    // Check if the file changed - wait for URL first
    await expect(page).toHaveURL(/.*#\/examples\/sbom-full/, { timeout: 30000 });
    await expect(page.getByText("Viewing: examples/sbom-full")).toBeVisible({ timeout: 45000 });
    
    // 3. Verify the URL is correct
     expect(page.url()).toContain("#/examples/sbom-full");
  });

  test("updates URL when switching files via UI", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/");
    
    // 1. Click a different SBOM button
    await page.getByRole("button", { name: "Full SBOM" }).click();
    
    // 2. Verify URL and content update
    await expect(page).toHaveURL(/.*#\/examples\/sbom-full/);
    await expect(page.getByText("Viewing: examples/sbom-full")).toBeVisible();
    
    // 3. Click back to simple
    await page.getByRole("button", { name: "Simple Example" }).click();
    await expect(page).toHaveURL(/.*#\/examples\/sample-simple/);
    await expect(page.getByText("Viewing: examples/sample-simple")).toBeVisible();
  });

  test("handles browser back/forward buttons", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/#/examples/sample-simple");
    await expect(page.getByText("Viewing: examples/sample-simple")).toBeVisible({ timeout: 45000 });

    // 1. Navigate to another file
    await page.getByRole("button", { name: "Full SBOM" }).click();
    await expect(page.getByText("Viewing: examples/sbom-full")).toBeVisible({ timeout: 45000 });

    // 2. Go Back
    await page.goBack();
    await expect(page.getByText("Viewing: examples/sample-simple")).toBeVisible();
    await expect(page).toHaveURL(/.*#\/examples\/sample-simple/);

    // 3. Go Forward
    await page.goForward();
    await expect(page.getByText("Viewing: examples/sbom-full")).toBeVisible();
     await expect(page).toHaveURL(/.*#\/examples\/sbom-full/);
  });
});
