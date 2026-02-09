import { describe, it } from "vitest";

describe("Import Isolation", () => {
  it("should import Layout", async () => {
    console.log("Importing Layout...");
    await import("./components/layout/Layout");
    console.log("Layout imported successfully");
  });

  it("should import Sidebar", async () => {
    console.log("Importing Sidebar...");
    await import("./components/layout/Sidebar");
    console.log("Sidebar imported successfully");
  });

  it("should import App", async () => {
    console.log("Importing App...");
    await import("./App");
    console.log("App imported successfully");
  });
});
