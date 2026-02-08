import { expect, test } from "@playwright/test";

const gotoViewer = async (page) => {
  await page.goto("/");
  // Why: the sidebar and default sample indicator should show before interacting.
  await expect(
    page.getByRole("button", { name: "Simple Sample" }),
  ).toBeVisible();
  await expect(
    page.getByText("Viewing: sample-simple.cyclonedx.json"),
  ).toBeVisible();
};

test.describe("SBOM Viewer", () => {
  test("loads the default sample SBOM", async ({ page }) => {
    await gotoViewer(page);

    await expect(
      page.getByText("Viewing: sample-simple.cyclonedx.json"),
    ).toBeVisible();
  });

  test("switches between sample and full SBOM files", async ({ page }) => {
    await gotoViewer(page);

    await page.getByRole("button", { name: "Full SBOM" }).click();
    await expect(page.getByText("Viewing: sbom.cyclonedx.json")).toBeVisible();

    await page.getByRole("button", { name: "Simple Sample" }).click();
    await expect(
      page.getByText("Viewing: sample-simple.cyclonedx.json"),
    ).toBeVisible();
  });

  test("shows dashboard KPI cards and charts", async ({ page }) => {
    await gotoViewer(page);

    // Why: ensure dashboard visualizations render for the default SBOM.
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();
    await expect(page.getByText("Total Components")).toBeVisible();
    await expect(page.getByText("Vulnerability Severity")).toBeVisible();
    await expect(page.getByText("Top Licenses")).toBeVisible();
  });

  test("filters the components table", async ({ page }) => {
    await gotoViewer(page);

    await page.getByRole("button", { name: "Components" }).click();
    await expect(
      page.getByRole("heading", { name: "Component Explorer" }),
    ).toBeVisible();

    const searchInput = page.getByPlaceholder("Search components...");
    await searchInput.fill("axios");
    await expect(page.getByText("axios")).toBeVisible();

    await searchInput.fill("no-matches-here");
    await expect(page.getByText("No results.")).toBeVisible();

    await searchInput.fill("");
    await expect(page.getByText("express")).toBeVisible();
  });

  test("opens the component detail panel from the explorer", async ({
    page,
  }) => {
    await gotoViewer(page);

    await page.getByRole("button", { name: "Components" }).click();
    await expect(
      page.getByRole("heading", { name: "Component Explorer" }),
    ).toBeVisible();

    // Why: validate row selection drives the detail panel.
    await page.getByRole("cell", { name: "axios" }).click();
    const detailPanel = page.getByTestId("detail-panel");
    await expect(
      detailPanel.getByRole("heading", { name: "Component Details" }),
    ).toBeVisible();
    await expect(detailPanel.getByText("axios", { exact: true })).toBeVisible();
  });

  test("expands the dependency tree", async ({ page }) => {
    await gotoViewer(page);

    await page.getByRole("button", { name: "Dependency Tree" }).click();
    await expect(
      page.getByRole("heading", { name: "Dependency Tree" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Severity" }).click();
    await page.getByRole("button", { name: "Summary" }).click();
  });

  test("displays the dependency graph controls", async ({ page }) => {
    await gotoViewer(page);

    await page.getByRole("button", { name: "Visual Graph" }).click();
    await expect(
      page.getByRole("heading", { name: "Dependency Graph" }),
    ).toBeVisible();

    await expect(
      page.getByRole("button", { name: "Export SVG" }),
    ).toBeEnabled();
  });
});
