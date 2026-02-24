import { expect, test } from "@playwright/test";

test.describe("Vulnerabilities View", () => {
    test.beforeEach(async ({ page }) => {
        test.setTimeout(90000);
        await page.goto("/", { waitUntil: "networkidle" });
        
        // Wait for the manifest to load and buttons to appear
        const exampleInput = page.getByPlaceholder("Self Scan (Latest)");
        await expect(exampleInput).toBeVisible({ timeout: 30000 });
        
        // Since 'self' SBOMs typically have 0 vulnerabilities (as we just fixed them),
        // we will upload the examples/sample-simple file via the UI to explicitly test the view.
        const fileInput = page.locator('input[type="file"]');
        const filePath = "public/sboms/examples/sample-simple.sbom.json";
        await fileInput.setInputFiles(filePath);
        
        await expect(page.getByText("Viewing: Local: sample-simple.sbom.json")).toBeVisible({ timeout: 20000 });
        
        const vulnTab = page.getByRole("button", { name: "Vulnerabilities", exact: true });
        await vulnTab.click();
        await expect(page.getByRole("heading", { name: "Vulnerabilities" }).first()).toBeVisible({ timeout: 20000 });
    });

    test("displays severity summary cards", async ({ page }) => {
        // Check for specific severity cards
        await expect(page.locator('[data-slot="card-title"]').filter({ hasText: /^Critical$/ })).toBeVisible();
        await expect(page.locator('[data-slot="card-title"]').filter({ hasText: /^High$/ })).toBeVisible();
        await expect(page.locator('[data-slot="card-title"]').filter({ hasText: /^Medium$/ })).toBeVisible();
        await expect(page.locator('[data-slot="card-title"]').filter({ hasText: /^Low$/ })).toBeVisible();
        
        // Check if there are actual numbers (not empty)
        await expect(page.locator('.text-3xl.font-bold.text-red-600').first()).not.toBeEmpty(); 
    });

    test("filters and sorts vulnerabilities table", async ({ page }) => {
        // Ensure data is loaded (Total Findings > 0)
        await expect(page.locator('.text-3xl.font-bold').first()).not.toHaveText("0", { timeout: 20000 });

        // 1. Switch to "By Vulnerability" view
        await page.getByRole("button", { name: "By Vulnerability" }).click();
        
        // Ensure some rows are visible before filtering
        await expect(page.getByRole("row").nth(1)).toBeVisible({ timeout: 10000 });

        // 2. Search for a known CVE or part of ID
        const searchInput = page.getByPlaceholder("Search CVEs...");
        await searchInput.fill("CVE-");
        
        // 3. Verify rows exist
        await expect(page.getByRole("row", { name: /CVE-/ }).first()).toBeVisible({ timeout: 15000 });
    });

    test("opens vulnerability details panel", async ({ page }) => {
      test.setTimeout(60000);
      await expect(page.locator('.text-3xl.font-bold').first()).not.toHaveText("0", { timeout: 20000 });

      // 1. Switch to "By Vulnerability" view
      await page.getByRole("button", { name: "By Vulnerability" }).click();

      await expect(page.getByRole("row").nth(1)).toBeVisible({ timeout: 10000 });

      // 2. Click "Details" on the first row
      await page.getByRole("button", { name: "Details" }).first().click();

      const errorBoundary = page.getByText("Details panel failed to load.");
      if (await errorBoundary.isVisible()) {
          console.error("Details panel crashed!");
          throw new Error("Details panel crashed during test");
      }
      
      await expect(page.getByText(/ID:/i)).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/Severity:/i)).toBeVisible();
      
      await expect(page.getByRole("button", { name: "Overview", exact: true })).toBeVisible();
      await expect(page.getByText("Technical Details")).toBeVisible();
      
      // Verify Export Buttons
      const pngBtn = page.getByRole("button", { name: "PNG Card" });
      const pdfBtn = page.getByRole("button", { name: "PDF Card" });
      await expect(pngBtn).toBeVisible();
      await expect(pdfBtn).toBeVisible();
      
      // Verify PNG Download triggers
      const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
      await pngBtn.click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/^vulnerability-.*\.png/);
      
      // 4. Close panel
      await page.getByRole("button", { name: "Close" }).click();
      await expect(page.getByText("Vulnerability Details")).not.toBeVisible();
    });
});
