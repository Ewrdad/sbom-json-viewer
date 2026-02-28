import { expect, test } from "@playwright/test";

test.describe("Multi-SBOM Source Selection", () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'log' || msg.type() === 'error' || msg.type() === 'warning') {
        console.log(`[Browser ${msg.type()}] ${msg.text()}`);
      }
    });
  });

  test("shows source selector in component details when multiple SBOMs are uploaded", async ({ page }) => {
    test.setTimeout(150000);
    await page.goto("/");
    await expect(page.getByText(/Preparing viewer|Loading analysis/)).not.toBeVisible({ timeout: 60000 });

    const fileInput = page.locator('input[type="file"]');
    // Using existing example files
    const path1 = "public/sboms/examples/sample-simple.sbom.json";
    const path2 = "public/sboms/examples/sample-simple-2.sbom.json";
    await fileInput.setInputFiles([path1, path2]);

    await expect(page.getByTestId("current-file-display")).toContainText("Merged", { timeout: 60000 });
    
    await page.getByTestId("sidebar-link-explorer").click();
    await expect(page.getByTestId("view-title")).toContainText("Component Explorer", { timeout: 20000 });

    // Use a cell with exact name to click the row
// ...
    const cell = page.getByRole("cell", { name: "axios" }).first();
    await cell.waitFor({ state: "attached", timeout: 30000 });
    await cell.click({ force: true });
    
    // Wait for the panel
    const detailPanel = page.getByTestId("component-detail-panel");
    await detailPanel.waitFor({ state: "attached", timeout: 20000 });
    await detailPanel.scrollIntoViewIfNeeded();
    await expect(detailPanel).toBeVisible({ timeout: 20000 });

    // Expand Raw JSON
    const rawJsonTrigger = detailPanel.getByRole("button", { name: /Raw JSON Data/i });
    await rawJsonTrigger.scrollIntoViewIfNeeded();
    await rawJsonTrigger.click();

    // Check for source selector
    const sourceSelector = detailPanel.getByTestId("source-selector");
    await expect(sourceSelector).toBeVisible({ timeout: 30000 });
    
    const text = await sourceSelector.innerText();
    expect(text.toLowerCase()).toMatch(/merged|combined/);
  });

  test("shows source selector in vulnerability details", async ({ page }) => {
    test.setTimeout(150000);
    await page.goto("/");
    await expect(page.getByText(/Preparing viewer|Loading analysis/)).not.toBeVisible({ timeout: 60000 });

    const fileInput = page.locator('input[type="file"]');
    const path1 = "public/sboms/examples/sample-simple.sbom.json";
    const path2 = "public/sboms/examples/sample-simple-2.sbom.json";
    await fileInput.setInputFiles([path1, path2]);

    await expect(page.getByTestId("current-file-display")).toContainText("Merged", { timeout: 60000 });

    await page.getByTestId("sidebar-link-vulnerabilities").click();
    await expect(page.getByTestId("view-title")).toContainText("Vulnerabilities", { timeout: 20000 });
    
    // Switch to By Vulnerability view to ensure we open the vulnerability detail panel
    await page.getByTestId("vulnerabilities-mode-vulnerabilities").click();
    
    // Wait for "Details" button in the table
// ...
    const detailsBtn = page.getByRole("button", { name: "Details", exact: true }).first();
    await detailsBtn.waitFor({ state: "attached", timeout: 30000 });
    await detailsBtn.click({ force: true });

    const vulnPanel = page.getByTestId("vulnerability-detail-panel");
    await vulnPanel.waitFor({ state: "attached", timeout: 20000 });
    await vulnPanel.scrollIntoViewIfNeeded();
    await expect(vulnPanel).toBeVisible({ timeout: 20000 });

    // Expand Raw JSON
    const rawJsonTrigger = vulnPanel.getByRole("button", { name: /Raw JSON Data/i });
    await rawJsonTrigger.scrollIntoViewIfNeeded();
    await rawJsonTrigger.click();

    const sourceSelector = vulnPanel.getByTestId("source-selector");
    await expect(sourceSelector).toBeVisible({ timeout: 30000 });
    const selectorText = await sourceSelector.innerText();
    expect(selectorText.toLowerCase()).toMatch(/merged|combined/);
  });

  test("shows raw JSON viewer for individual vulnerabilities in component details", async ({ page }) => {
    test.setTimeout(150000);
    await page.goto("/");
    await expect(page.getByText(/Preparing viewer|Loading analysis/)).not.toBeVisible({ timeout: 60000 });

    const fileInput = page.locator('input[type="file"]');
    const path1 = "public/sboms/examples/sample-simple.sbom.json";
    const path2 = "public/sboms/examples/sample-simple-2.sbom.json";
    await fileInput.setInputFiles([path1, path2]);

    await expect(page.getByTestId("current-file-display")).toContainText("Merged", { timeout: 60000 });
    
    await page.getByTestId("sidebar-link-explorer").click();
// ...
    const cell = page.getByRole("cell", { name: "axios" }).first();
    await cell.waitFor({ state: "attached", timeout: 30000 });
    await cell.click({ force: true });
    
    const detailPanel = page.getByTestId("component-detail-panel");
    await detailPanel.waitFor({ state: "attached", timeout: 20000 });
    await detailPanel.scrollIntoViewIfNeeded();
    await expect(detailPanel).toBeVisible({ timeout: 20000 });

    await page.waitForTimeout(3000);

    // Scroll to vulnerabilities section by text
    const vulnHeading = detailPanel.getByRole("heading", { name: "Vulnerabilities" });
    await vulnHeading.scrollIntoViewIfNeeded();
    await expect(vulnHeading).toBeVisible({ timeout: 20000 });

    // Check for individual vuln raw JSON trigger
    const vulnJsonTrigger = detailPanel.getByTestId("vuln-raw-json-trigger").first();
    await vulnJsonTrigger.waitFor({ state: "attached", timeout: 20000 });
    // Use force click if it's considered not visible by Playwright
    await vulnJsonTrigger.click({ force: true });

    // Check for individual vuln source selector
    const vulnSourceSelector = detailPanel.getByTestId("vuln-source-selector").first();
    await expect(vulnSourceSelector).toBeVisible({ timeout: 30000 });
    
    const text = await vulnSourceSelector.innerText();
    expect(text.toLowerCase()).toMatch(/merged|combined/);
  });
});
