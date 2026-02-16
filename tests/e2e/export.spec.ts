import { expect, test } from "@playwright/test";

test.describe("Export Functionality", () => {
    test("export buttons are present and clickable", async ({ page }) => {
        test.setTimeout(60000);
        await page.goto("/");
        // Ensure dashboard is loaded
        await expect(page.getByRole("heading", { name: "Dashboard" }).first()).toBeVisible({ timeout: 60000 });

        // 1. Check for Export buttons
        // They are at the bottom, so we might need to scroll or wait
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

        // 2. Click them to ensure no crash (download event testing is tricky in headless, 
        // but we can verify no error occurs)
        
        // Triggering the download might open a new tab or save a file. 
        // We mainly want to ensure the app doesn't crash.
        await vulnsButton.click();
        
        // Verify we are still on the dashboard
        await expect(page.getByRole("heading", { name: "Dashboard" }).first()).toBeVisible();
    });

    test("exports vulnerabilities to Jira CSV", async ({ page }) => {
        test.setTimeout(90000);
        await page.goto("/", { waitUntil: "networkidle" });
        
        // Wait for example to load
        await expect(page.getByPlaceholder("Simple Example")).toBeVisible({ timeout: 30000 });
        
        // Navigate to Vulnerabilities
        await page.getByRole("button", { name: "Vulnerabilities", exact: true }).click();
        await expect(page.getByRole("heading", { name: "Vulnerabilities" }).first()).toBeVisible();

        // 1. Switch to "By Vulnerability" view
        await page.getByRole("button", { name: "By Vulnerability" }).click();
        
        // 2. Ensure data is loaded
        await expect(page.locator('.text-3xl.font-bold').first()).not.toHaveText("0", { timeout: 20000 });

        // 3. Open Export dropdown
        const exportBtn = page.getByRole("button", { name: "Export", exact: true }).first();
        await expect(exportBtn).toBeVisible({ timeout: 10000 });
        await exportBtn.click();
        
        // 4. Click "Export for Jira" and capture download
        const downloadPromise = page.waitForEvent('download');
        await page.getByRole("menuitem", { name: "Export for Jira" }).click();
        const download = await downloadPromise;

        // 5. Verify download filename
        expect(download.suggestedFilename()).toContain("jira");
        expect(download.suggestedFilename()).toContain(".csv");
    });

    test("exports components to GitLab CSV", async ({ page }) => {
        test.setTimeout(90000);
        await page.goto("/", { waitUntil: "networkidle" });
        
        // Navigate to Vulnerabilities
        await page.getByRole("button", { name: "Vulnerabilities", exact: true }).click();

        // 1. Ensure "By Component" view (default)
        await page.getByRole("button", { name: "By Component" }).click();

        // 2. Open Export dropdown
        const exportBtn = page.getByRole("button", { name: "Export", exact: true }).first();
        await expect(exportBtn).toBeVisible({ timeout: 10000 });
        await exportBtn.click();
        
        // 3. Click "Export for GitLab" and capture download
        const downloadPromise = page.waitForEvent('download');
        await page.getByRole("menuitem", { name: "Export for GitLab" }).click();
        const download = await downloadPromise;

        // 4. Verify download filename
        expect(download.suggestedFilename()).toContain("gitlab");
        expect(download.suggestedFilename()).toContain(".csv");
    });
});
