import { test, expect } from "@playwright/test";
import * as fs from 'fs';
import * as path from 'path';

test.describe("AI Visual Audit & Responsive Verification", () => {
  // Ensure the directory exists
  test.beforeAll(() => {
    const dir = path.join(process.cwd(), 'ai-screenshots');
    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  const viewports = [
    { name: "desktop", width: 1280, height: 800 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile", width: 375, height: 667 }
  ];

  for (const vp of viewports) {
    test(`Capture comprehensive visual state for ${vp.name} viewport`, async ({ page }) => {
      test.setTimeout(180000); // 3 minutes for each viewport run
      
      await page.setViewportSize({ width: vp.width, height: vp.height });

      console.log(`[${vp.name}] Navigating to home page...`);
      await page.goto("/");
      await page.waitForLoadState("domcontentloaded");
      
      // Wait for the app to initialize completely
      await page.waitForSelector(".animate-spin", { state: "detached", timeout: 45000 });
      // Wait for the Dashboard title
      await expect(page.getByTestId("view-title")).toContainText("Dashboard", { timeout: 30000 });
      
      // If mobile/tablet, the sidebar might be collapsed or hidden, let's make sure we can navigate
      const isMobile = vp.width < 1024;

      // Capture Dashboard
      console.log(`[${vp.name}] Capturing Dashboard...`);
      await page.screenshot({ path: `ai-screenshots/${vp.name}-01-dashboard.png`, fullPage: true });

      // The views and their respective wait selectors
      const views = [
        { id: "vulnerabilities", name: "02-vulnerabilities", waitFor: "text=Vulnerabilities" },
        { id: "licenses", name: "03-licenses", waitFor: "text=Licenses" },
        { id: "explorer", name: "04-components", waitFor: "text=Components" },
        { id: "tree", name: "05-dependency-tree", waitFor: "text=Dependency Tree" },
        { id: "metadata", name: "06-metadata", waitFor: "text=Metadata" },
        { id: "developer", name: "07-developer-insights", waitFor: "text=Insights" }
      ];

      for (const view of views) {
        console.log(`[${vp.name}] Navigating to ${view.name}...`);
        
        // On mobile/tablet, the sidebar might be hidden behind a drawer
        if (vp.width < 1024) { // Including tablet here
            const sidebar = page.locator('.fixed.left-0.top-0.w-64');
            const isSidebarVisible = await sidebar.isVisible();
            if (!isSidebarVisible) {
                // Click mobile menu button
                await page.click('button:has(svg.lucide-menu)');
                await expect(sidebar).toBeVisible();
                await page.waitForTimeout(500);
            }
        }

        // Click the sidebar item
        await page.click(`[data-testid="sidebar-link-${view.id}"]`);
        
        // Give it a moment to render
        await page.waitForTimeout(2000);
        
        // Wait for the view name in the Breadcrumb or Header
        if (view.waitFor) {
          try {
            await page.waitForSelector(view.waitFor, { timeout: 8000 });
          } catch (e) {
            console.warn(`[${vp.name}] Could not find ${view.waitFor} for ${view.name}, proceeding anyway.`);
          }
        }

        console.log(`[${vp.name}] Capturing ${view.name}...`);
        await page.screenshot({ path: `ai-screenshots/${vp.name}-${view.name}.png`, fullPage: true });
      }
      
      console.log(`[${vp.name}] Visual audit screenshots generated in ai-screenshots/ directory.`);
    });
  }
});