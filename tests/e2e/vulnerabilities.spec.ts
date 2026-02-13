import { expect, test } from "@playwright/test";

test.describe("Vulnerabilities View", () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the vulnerabilities view directly or via menu
        test.setTimeout(60000);
        await page.goto("/");
        
        // Ensure we are using a file that has vulnerabilities (Simple Example has some)
        await page.getByRole("button", { name: "Simple Example" }).click();
        await expect(page.getByText("Viewing: examples/sample-simple")).toBeVisible();
        
        await page.getByRole("button", { name: "Vulnerabilities", exact: true }).click();
        await expect(page.getByRole("heading", { name: "Vulnerabilities" }).first()).toBeVisible();
    });

    test("displays severity summary cards", async ({ page }) => {
        // Check for specific severity cards
        // Use more specific locator for card titles to avoid table header match
        await expect(page.locator('[data-slot="card-title"]').filter({ hasText: /^Critical$/ })).toBeVisible();
        await expect(page.locator('[data-slot="card-title"]').filter({ hasText: /^High$/ })).toBeVisible();
        await expect(page.locator('[data-slot="card-title"]').filter({ hasText: /^Medium$/ })).toBeVisible();
        await expect(page.locator('[data-slot="card-title"]').filter({ hasText: /^Low$/ })).toBeVisible();
        
        // Check if there are actual numbers (not empty)
        // We know sbom-full has vulnerabilities.
        // We verify that we can see the number of critical vulnerabilities
        await expect(page.locator('.text-3xl.font-bold.text-red-600').first()).not.toBeEmpty(); 
    });

    test("filters and sorts vulnerabilities table", async ({ page }) => {
        // Ensure data is loaded (Total Findings > 0)
        // In VulnerabilitiesView, the first .text-3xl.font-bold is Total Findings
        await expect(page.locator('.text-3xl.font-bold').first()).not.toHaveText("0", { timeout: 20000 });

        // 1. Switch to "By Vulnerability" view
        await page.getByRole("button", { name: "By Vulnerability" }).click();
        
        // Ensure some rows are visible before filtering
        await expect(page.locator("tbody tr").first()).toBeVisible({ timeout: 10000 });

        // 2. Search for a known CVE or part of ID
        const searchInput = page.getByPlaceholder("Search CVEs...");
        await searchInput.fill("CVE-");
        
        // 3. Verify rows exist
        // Filter might take a moment to apply. Target tbody rows to avoid matching header text.
        await expect(page.locator("tbody tr").filter({ hasText: "CVE-" }).first()).toBeVisible({ timeout: 15000 });
    });

    test("opens vulnerability details panel", async ({ page }) => {
      test.setTimeout(60000);
      // Ensure data is loaded (Total Findings > 0)
      await expect(page.locator('.text-3xl.font-bold').first()).not.toHaveText("0", { timeout: 20000 });

      // 1. Switch to "By Vulnerability" view
      await page.getByRole("button", { name: "By Vulnerability" }).click();

      // Ensure table is populated
      await expect(page.getByRole("row").nth(1)).toBeVisible({ timeout: 10000 });

      // 2. Click "Details" on the first row
      await page.getByRole("button", { name: "Details" }).first().click();

      // 3. Verify details panel opens
      await expect(page.getByText("Vulnerability Details")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Severity" })).toBeVisible();
      
      // 4. Close panel
      // 4. Close panel
      await page.getByRole("button", { name: "Close" }).click();
      await expect(page.getByText("Vulnerability Details")).not.toBeVisible();
    });
});
