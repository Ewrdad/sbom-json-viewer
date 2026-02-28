import { test, expect } from "@playwright/test";

test("debug home page", async ({ page }) => {
  // Set a fixed viewport size for stability
  await page.setViewportSize({ width: 1280, height: 800 });
  
  console.log("Navigating to /");
  await page.goto("/");
  
  console.log("Waiting for load state...");
  await page.waitForLoadState("domcontentloaded");
  
  // Wait for loading spinner to disappear
  console.log("Waiting for loading to finish...");
  await page.waitForSelector(".animate-spin", { state: "detached", timeout: 30000 });
  
  // Wait for dashboard content to appear
  await page.waitForSelector("text=Vulnerability Severity", { timeout: 10000 });
  
  console.log("Page title:", await page.title());
  
  // Capture screenshot
  await page.screenshot({ path: "debug-home.png" });
  console.log("Screenshot saved to debug-home.png");
  
  // Log any console errors
  page.on("console", msg => console.log(`PAGE LOG: ${msg.text()}`));
  page.on("pageerror", err => console.log(`PAGE ERROR: ${err.message}`));

  // Check body visibility
  await expect(page.locator("body")).toBeVisible();
  
  // List all text content to see what's rendered
  const bodyText = await page.locator("body").innerText();
  console.log("Body text preview:", bodyText.substring(0, 500));
});
