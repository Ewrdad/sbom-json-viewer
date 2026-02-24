import { expect, test } from "@playwright/test";

test.describe("SBOM Routing", () => {
  test("navigates via URL hash", async ({ page }) => {
    // 1. Navigate to the base URL
    await page.goto("/");
    await expect(page.getByText("Viewing: self/latest")).toBeVisible({ timeout: 45000 });

    // 2. Navigate to a specific SBOM via hash
    await page.goto("/#/self/TrivyScan");
    
    // Check if the file changed - wait for URL first
    await expect(page).toHaveURL(/.*#\/self\/TrivyScan/, { timeout: 30000 });
    await expect(page.getByText("Viewing: self/TrivyScan")).toBeVisible({ timeout: 45000 });
    
    // 3. Verify the URL is correct
     expect(page.url()).toContain("#/self/TrivyScan");
  });

  test("updates URL when switching files via UI", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/");
    
    // 1. Click a different SBOM button
    await page.getByPlaceholder("Self Scan (Latest)").click();
    await page.getByLabel("Self Scan").getByRole("option", { name: "TrivyScan", exact: true }).click();
    
    // 2. Verify URL and content update
    await expect(page).toHaveURL(/.*#\/self\/TrivyScan/);
    await expect(page.getByText("Viewing: self/TrivyScan")).toBeVisible();
    
    // 3. Click back to simple
    await page.getByPlaceholder("TrivyScan").click();
    await page.getByRole("option", { name: "Self Scan (Latest)", exact: true }).click();
    await expect(page).toHaveURL(/.*#\/self\/latest/);
    await expect(page.getByText("Viewing: self/latest")).toBeVisible();
  });

  test("handles browser back/forward buttons", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/#/self/latest");
    await expect(page.getByText("Viewing: self/latest")).toBeVisible({ timeout: 45000 });

    // 1. Navigate to another file
    await page.getByPlaceholder("Self Scan (Latest)").click();
    await page.getByLabel("Self Scan").getByRole("option", { name: "TrivyScan", exact: true }).click();
    await expect(page.getByText("Viewing: self/TrivyScan")).toBeVisible({ timeout: 45000 });

    // 2. Go Back
    await page.goBack();
    await expect(page.getByText("Viewing: self/latest")).toBeVisible();
    await expect(page).toHaveURL(/.*#\/self\/latest/);

    // 3. Go Forward
    await page.goForward();
    await expect(page.getByText("Viewing: self/TrivyScan")).toBeVisible();
     await expect(page).toHaveURL(/.*#\/self\/TrivyScan/);
  });
});
