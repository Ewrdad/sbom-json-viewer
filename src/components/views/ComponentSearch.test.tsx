import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { ComponentExplorer } from "./ComponentExplorer";
import { SelectionProvider } from "../../context/SelectionContext";

// Mock data
const mockSbom = {
  components: [
    {
      bomRef: "pkg:npm/react@18.2.0",
      name: "react",
      version: "18.2.0",
      group: "facebook",
      type: "library",
      licenses: [{ id: "MIT" }],
    },
    {
      bomRef: "pkg:npm/lodash@4.17.21",
      name: "lodash",
      version: "4.17.21",
      type: "library",
      licenses: [{ id: "MIT" }],
    },
  ],
};

describe("Component Search Logic", () => {
  it("filters by name in basic search", async () => {
    render(
      <SelectionProvider>
        <ComponentExplorer sbom={mockSbom} />
      </SelectionProvider>
    );
    
    const searchInput = screen.getByPlaceholderText("Search components...");
    fireEvent.change(searchInput, { target: { value: "react" } });
    
    await waitFor(() => {
      expect(screen.getByText("react")).toBeDefined();
      expect(screen.queryByText("lodash")).toBeNull();
    });
  });
});
