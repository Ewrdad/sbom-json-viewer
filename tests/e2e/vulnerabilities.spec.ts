import { expect, test } from "@playwright/test";

test.describe("Vulnerabilities View", () => {
    test.beforeEach(async ({ page }) => {
        test.setTimeout(90000);
        await page.goto("/", { waitUntil: "networkidle" });
        
        // Wait for the manifest to load and buttons to appear
        const selectorTrigger = page.getByTestId("sbom-selector-input");
        await expect(selectorTrigger).toBeVisible({ timeout: 30000 });
        
        // Since 'self' SBOMs typically have 0 vulnerabilities (as we just fixed them),
        // we will upload the examples/sample-simple file via the UI to explicitly test the view.
        const fileInput = page.locator('input[type="file"]');
        const filePath = "public/sboms/examples/sample-simple.sbom.json";
        await fileInput.setInputFiles(filePath);
        
        await expect(page.getByTestId("current-file-display")).toContainText("sample-simple.sbom.json", { timeout: 20000 });
        
        const vulnTab = page.getByTestId("sidebar-link-vulnerabilities");
        await vulnTab.click();
        await expect(page.getByTestId("view-title")).toContainText("Vulnerabilities", { timeout: 20000 });
    });

    test("displays severity summary cards", async ({ page }) => {
        // Check for specific severity cards
        await expect(page.locator('[data-slot="card-title"]').filter({ hasText: /^Critical$/ })).toBeVisible();
        await expect(page.locator('[data-slot="card-title"]').filter({ hasText: /^High$/ })).toBeVisible();
        await expect(page.locator('[data-slot="card-title"]').filter({ hasText: /^Medium$/ })).toBeVisible();
        await expect(page.locator('[data-slot="card-title"]').filter({ hasText: /^Low$/ })).toBeVisible();
        
        // Check if there are actual numbers (not empty)
        await expect(page.locator('.text-3xl.font-bold').first()).not.toBeEmpty(); 
    });

    test("filters and sorts vulnerabilities table", async ({ page }) => {
        // Ensure data is loaded (Total Findings > 0)
        await expect(page.locator('.text-3xl.font-bold').first()).not.toHaveText("0", { timeout: 20000 });

        // 1. Switch to "By Vulnerability" view
        await page.getByTestId("vulnerabilities-mode-vulnerabilities").click();
        
        // Ensure some rows are visible before filtering
        await expect(page.getByRole("row").nth(1)).toBeVisible({ timeout: 10000 });

        // 2. Search for a known CVE or part of ID
        const searchInput = page.getByPlaceholder("Search CVEs...");
        await searchInput.fill("CVE-");
        
        // 3. Verify rows exist
        await expect(page.getByRole("row", { name: /CVE-/ }).first()).toBeVisible({ timeout: 15000 });
    });

    test.skip("opens vulnerability details panel", async ({ page }) => {
      test.setTimeout(60000);
      await expect(page.locator('.text-3xl.font-bold').first()).not.toHaveText("0", { timeout: 20000 });

      // 1. Switch to "By Vulnerability" view
      const modeBtn = page.getByTestId("vulnerabilities-mode-vulnerabilities");
      await modeBtn.click();
      
      // Explicitly wait for a CVE ID to be PRESENT in the list (not necessarily visible if wrapped)
      const cveCell = page.locator("td").filter({ hasText: "CVE-" }).first();
      await expect(cveCell).toBeAttached({ timeout: 20000 });

      // 2. Click the CVE ID directly to open the panel
      await page.getByText("CVE-").first().click({ force: true });

      // Wait for the detail panel to be visible
      await expect(page.getByTestId("detail-panel")).toBeVisible({ timeout: 15000 });
      await expect(page.getByTestId("vuln-id-label")).toBeVisible({ timeout: 10000 });

      const errorBoundary = page.getByText("Details panel failed to load.");
      if (await errorBoundary.isVisible()) {
          console.error("Details panel crashed!");
          throw new Error("Details panel crashed during test");
      }
      
      await expect(page.getByTestId("vuln-id-label")).toBeVisible({ timeout: 5000 });
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
      await expect(page.getByTestId("detail-panel-title")).not.toBeVisible();
    });
});
