import { expect, test } from "@playwright/test";

test.describe("SBOM Upload", () => {
  test("uploads a valid JSON file", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/");
    await expect(page.getByText(/Preparing viewer|Loading analysis/)).not.toBeVisible({ timeout: 15000 });
    
    // 1. Locate the file input
    const fileInput = page.locator('input[type="file"]');
    
    // 2. Upload a file
    // Using the project's own sample file
    const filePath = "public/sboms/examples/sample-simple.sbom.json";
    await fileInput.setInputFiles(filePath);

    // 3. Verify the upload triggered a load
    // The "Viewing: " text should update to "Local: sample-simple.sbom.json"
    await expect(page.getByText(/Local: sample-simple.sbom.json/)).toBeVisible({ timeout: 10000 });
    
    // 4. Verify content is loaded
    await expect(page.getByText("Total Components")).toBeVisible();
  });

  test("handles invalid file upload", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/");
    await expect(page.getByText(/Preparing viewer|Loading analysis/)).not.toBeVisible({ timeout: 15000 });
    
    // 1. Upload a file that is not a valid SBOM (e.g. README.md)
    const fileInput = page.locator('input[type="file"]');
    
    // Use absolute path
    await fileInput.setInputFiles("/home/ewrdad/portfolio/sbom-viewer/sbom-json-viewer/README.md");

    // 2. Expect an error message
    // The app should fail to parse this as JSON
    await expect(page.getByText(/Error Loading SBOM|Worker error|JSON|SyntaxError/).first()).toBeVisible({ timeout: 10000 });
  });
});
