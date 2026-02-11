import { describe, it } from "vitest";

// Why: These smoke tests import heavy modules (ViewContext, web workers, lazy views)
// that have deep dependency chains slow to resolve in the test environment.
describe("Import Isolation", () => {
  it("should import Layout", async () => {
    console.log("Importing Layout...");
    await import("./components/layout/Layout");
    console.log("Layout imported successfully");
  }, 30_000);

  it("should import Sidebar", async () => {
    console.log("Importing Sidebar...");
    await import("./components/layout/Sidebar");
    console.log("Sidebar imported successfully");
  }, 30_000);

  it("should import App", async () => {
    console.log("Importing App...");
    await import("./App");
    console.log("App imported successfully");
  }, 30_000);
});
