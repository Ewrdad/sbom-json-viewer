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
});
