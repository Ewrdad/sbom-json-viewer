import { expect, test } from "@playwright/test";

test.describe("Multi-SBOM Stats View", () => {
  test("navigates to Multi-SBOM Stats and shows comparison data", async ({ page }) => {
    test.setTimeout(150000);
    await page.goto("/");
    
    // Wait for initial load to finish
    await expect(page.getByText(/Preparing viewer|Loading analysis/)).not.toBeVisible({ timeout: 60000 });

    const fileInput = page.locator('input[type="file"]');
    // Using existing example files
    const path1 = "public/sboms/examples/sample-simple.sbom.json";
    const path2 = "public/sboms/examples/sample-simple-2.sbom.json";
    await fileInput.setInputFiles([path1, path2]);

    // Wait for merge to complete
    await expect(page.getByTestId("current-file-display")).toContainText("Merged", { timeout: 60000 });

    // Navigate to Multi-SBOM Stats
    const statsLink = page.getByTestId("sidebar-link-multi-stats");
    await expect(statsLink).toBeVisible({ timeout: 10000 });
    await statsLink.click();

    // Verify page content
    await expect(page.getByTestId("view-title")).toContainText("Multi-SBOM Stats");
    await expect(page.getByText("Source Efficacy Ranking")).toBeVisible();
    await expect(page.getByText("Detailed Discovery Comparison")).toBeVisible();
    await expect(page.getByText("Unified Components")).toBeVisible();
    await expect(page.getByText("Unified Findings")).toBeVisible();
    
    // Check for chart containers
    const charts = page.locator(".recharts-responsive-container");
    await expect(charts).not.toHaveCount(0);
  });
});
