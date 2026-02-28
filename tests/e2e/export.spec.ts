import { expect, test } from "@playwright/test";

test.describe("Export Functionality", () => {
    test.beforeEach(async ({ page }) => {
        test.setTimeout(90000);
        await page.goto("/", { waitUntil: "networkidle" });
        
        // Wait for example to load
        await expect(page.getByTestId("sbom-selector-input")).toBeVisible({ timeout: 30000 });
        
        // Since 'self' SBOMs typically have 0 vulnerabilities (as we just fixed them),
        // we will upload the examples/sample-simple file via the UI to explicitly test exports that require data.
        const fileInput = page.locator('input[type="file"]');
        const filePath = "public/sboms/examples/sample-simple.sbom.json";
        await fileInput.setInputFiles(filePath);
        
        await expect(page.getByTestId("current-file-display")).toContainText("sample-simple.sbom.json", { timeout: 20000 });
    });

    test("export buttons are present and clickable", async ({ page }) => {
        // Ensure dashboard is loaded
        await expect(page.getByTestId("view-title")).toContainText("Dashboard", { timeout: 60000 });

        // 1. Check for Export buttons
        // ...
        const pdfButton = page.getByRole("button", { name: "Overview PDF" }).first();
        const pngButton = page.getByRole("button", { name: "Overview PNG" }).first();
        const vulnsButton = page.getByRole("button", { name: "Vulnerabilities List" }).first();
        const licensesButton = page.getByRole("button", { name: "Licenses List" }).first();

        // Scroll into view if needed
        await pdfButton.scrollIntoViewIfNeeded();

        await expect(pdfButton).toBeVisible({ timeout: 10000 });
        await expect(pngButton).toBeVisible();
        await expect(vulnsButton).toBeVisible();
        await expect(licensesButton).toBeVisible();

        // 2. Click them to ensure no crash
        await vulnsButton.click();
        
        // Verify we are still on the dashboard
        await expect(page.getByTestId("view-title")).toContainText("Dashboard");
    });

    test("exports vulnerabilities to Jira CSV", async ({ page }) => {
        // Navigate to Vulnerabilities
        await page.getByTestId("sidebar-link-vulnerabilities").click();
        await expect(page.getByTestId("view-title")).toContainText("Vulnerabilities");

        // 1. Switch to "By Vulnerability" view
        await page.getByTestId("vulnerabilities-mode-vulnerabilities").click();
        
        // 2. Ensure data is loaded
        await expect(page.locator('.text-3xl.font-bold').first()).not.toHaveText("0", { timeout: 20000 });

        // 3. Open Export dropdown
        const exportBtn = page.getByTestId("export-button").first();
        await expect(exportBtn).toBeVisible({ timeout: 10000 });
        await exportBtn.click();
        
        // 4. Click "Export for Jira" and capture download
        const downloadPromise = page.waitForEvent('download');
        await page.getByRole("menuitem", { name: "Download CSV for Jira" }).click();
        const download = await downloadPromise;

        // 5. Verify download filename
        expect(download.suggestedFilename()).toContain("jira");
        expect(download.suggestedFilename()).toContain(".csv");
    });

    test("exports components to GitLab CSV", async ({ page }) => {
        // Navigate to Vulnerabilities
        await page.getByTestId("sidebar-link-vulnerabilities").click();

        // 1. Ensure "By Component" view (default)
        await page.getByTestId("vulnerabilities-mode-components").click();

        // 2. Open Export dropdown
        const exportBtn = page.getByTestId("export-button").first();
        await expect(exportBtn).toBeVisible({ timeout: 10000 });
        await exportBtn.click();
        
        // 3. Click "Export for GitLab" and capture download
        const downloadPromise = page.waitForEvent('download');
        await page.getByRole("menuitem", { name: "Download CSV for GitLab" }).click();
        const download = await downloadPromise;

        // 4. Verify download filename
        expect(download.suggestedFilename()).toContain("gitlab");
        expect(download.suggestedFilename()).toContain(".csv");
    });
});
