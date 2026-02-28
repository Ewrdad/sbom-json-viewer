import { test, expect } from '@playwright/test';

test.describe('Supply Chain Risk View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the SBOM to load
    await page.waitForSelector('[data-testid="sidebar-link-dashboard"]');
  });

  test('navigates to Risk view and shows analysis', async ({ page }) => {
    // Click on Supply Chain Risk in sidebar
    await page.click('[data-testid="sidebar-link-risk"]');

    // Verify heading
    await expect(page.getByRole('heading', { name: 'Supply Chain Risk' })).toBeVisible();

    // Verify KPI cards
    await expect(page.getByText('Avg Risk Score')).toBeVisible();
    await expect(page.getByText('Max Risk Component')).toBeVisible();

    // Verify Chart is present (via SVG in ScatterChart)
    // ScatterChart might not be fully rendered in some environments, check for its container
    const scatterChart = page.locator('.recharts-responsive-container');
    await expect(scatterChart).toBeVisible();

    // Verify Leaderboard
    await expect(page.getByText('Risk Leaderboard')).toBeVisible();
    
    // Check for search input
    const searchInput = page.getByPlaceholder('Search...');
    await expect(searchInput).toBeVisible();
  });

  test('filters risk leaderboard', async ({ page }) => {
    await page.click('[data-testid="sidebar-link-risk"]');

    // Get a name from the list
    const firstItem = page.locator('.group.relative h4').first();
    const name = await firstItem.innerText();

    const searchInput = page.getByPlaceholder('Search...');
    await searchInput.fill(name);

    // Should still be visible in the leaderboard
    await expect(page.locator('.group.relative h4', { hasText: name }).first()).toBeVisible();

    // Fill with something that won't match
    await searchInput.fill('NON_EXISTENT_PACKAGE_NAME_XYZ');
    await expect(page.getByText('No risky components found matching your search.')).toBeVisible();
  });
});
