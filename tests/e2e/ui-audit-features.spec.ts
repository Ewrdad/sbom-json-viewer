import { expect, test } from "@playwright/test";

test.describe("UI Audit Features (v0.5.0)", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/", { waitUntil: "networkidle" });
        // Ensure a known SBOM is loaded (sample-simple has vulnerabilities)
        const selectorTrigger = page.getByTestId("sbom-selector-input");
        await expect(selectorTrigger).toBeVisible({ timeout: 30000 });
        
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles("public/sboms/examples/sample-simple.sbom.json");
        await expect(page.getByTestId("current-file-display")).toContainText("sample-simple.sbom.json", { timeout: 20000 });

        // Ensure sidebar is expanded if it matters (it usually doesn't for click, but for visibility it might)
        // With revamped layout, we can just click if it's visible or use testid
    });

    test("global selection persistence across views", async ({ page }) => {
        // 1. Select a component in Explorer
        await page.getByTestId("sidebar-link-explorer").click();
        // Wait for table to load
        await expect(page.getByRole("row").nth(1)).toBeVisible({ timeout: 10000 });
        
        const firstRow = page.getByRole("row").nth(1);
        const componentName = await firstRow.locator("td").nth(2).innerText(); // nth(2) because nth(1) is checkbox
        await firstRow.click();
        
        // Verify detail panel is open
        await expect(page.getByTestId("component-detail-panel")).toBeVisible();
        await expect(page.getByTestId("component-detail-panel")).toContainText(componentName);

        // 2. Switch to Dependency Tree
        await page.getByTestId("sidebar-link-tree").click();
        
        // 3. Verify detail panel PERSISTS
        await expect(page.getByTestId("component-detail-panel")).toBeVisible();
        await expect(page.getByTestId("component-detail-panel")).toContainText(componentName);
    });

    test("interactive dashboard KPI navigation and filtering", async ({ page }) => {
        await page.getByTestId("sidebar-link-dashboard").click();
        
        // 1. Click 'Vulnerability Findings' card - use specific card selector
        const vulnCard = page.locator('div[data-slot="card"]').filter({ hasText: /^Vulnerability Findings/ }).first();
        await vulnCard.click();

        // 2. Verify we navigated to Vulnerabilities view
        await expect(page.getByTestId("view-title")).toContainText("Vulnerabilities");
        
        // 3. Check if 'Analyze findings' was triggered (View Mode should be components)
        // Look for the toggle button that is active
        await expect(page.getByTestId("vulnerabilities-mode-components")).toHaveClass(/secondary/);
    });

    test("global search (Cmd+K) functionality", async ({ page }) => {
        // 1. Open search via shortcut or button
        await page.getByTestId("search-trigger").click();
        const input = page.locator('input[placeholder*="Search components"]');
        await expect(input).toBeVisible();
        await input.focus();

        // 2. Search for a specific package (express is in sample-simple)
        await input.fill("express");
        
        // Wait for search results
        const result = page.getByTestId("search-result-item").first();
        await expect(result).toBeVisible({ timeout: 10000 });

        // 3. Select result via Enter (more reliable than click in some dialogs)
        await page.keyboard.press("Enter");

        // 4. Verify we navigated and detail panel opened
        // We look for any detail panel that appears
        await expect(page.locator('[data-testid$="-detail-panel"]')).toBeVisible({ timeout: 15000 });
        const panelText = await page.locator('[data-testid$="-detail-panel"]').innerText();
        expect(panelText.toLowerCase()).toContain("express");
    });

    test("transitive 'Path to Root' analysis in detail panel", async ({ page }) => {
        await page.getByTestId("sidebar-link-vulnerabilities").click();
        await page.getByTestId("vulnerabilities-mode-vulnerabilities").click();
        
        // Wait for table
        await expect(page.getByRole("button", { name: "Details" }).first()).toBeVisible();

        // 1. Open a vulnerability
        await page.getByRole("button", { name: "Details" }).first().click();
        
        // 2. Open 'Affected Components' in detail panel
        const affectedTrigger = page.locator('[data-testid="vulnerability-detail-panel"] button').filter({ hasText: /Affected Components/ });
        await affectedTrigger.click();

        // 3. Verify path to root is visible
        await expect(page.getByText("Shortest Dependency Path").first()).toBeVisible();
    });

    test("granular 'Shopping Cart' export selection", async ({ page }) => {
        await page.getByTestId("sidebar-link-vulnerabilities").click();
        
        // 1. Select two components via checkboxes
        // First checkbox is "Select All", we want indices 1 and 2
        const checkboxes = page.locator('input[type="checkbox"]');
        await expect(checkboxes.first()).toBeVisible();
        
        await checkboxes.nth(1).check();
        await checkboxes.nth(2).check();

        // 2. Verify export button text updated
        const exportBtn = page.getByTestId("export-button");
        await expect(exportBtn).toContainText("Export Selected (2)");

        // 3. Clear selection
        await page.getByRole("button", { name: /Clear Selection/ }).click();
        await expect(exportBtn).toContainText("Export");
    });

    test("high contrast accessibility mode toggle", async ({ page }) => {
        // 1. Toggle high contrast - use the one in the sidebar specifically
        const hcBtn = page.getByRole("button", { name: "High Contrast" });
        await hcBtn.first().click();
        
        // 2. Verify class added to html
        const isHighContrast = await page.evaluate(() => document.documentElement.classList.contains('high-contrast'));
        expect(isHighContrast).toBe(true);

        // 3. Reload and check persistence
        await page.reload();
        const persisted = await page.evaluate(() => document.documentElement.classList.contains('high-contrast'));
        expect(persisted).toBe(true);
    });
});
