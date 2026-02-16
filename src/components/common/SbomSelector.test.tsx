import { render, screen, fireEvent } from "@testing-library/react";
import { SbomSelector } from "./SbomSelector";
import { describe, it, expect, vi } from "vitest";


// Mock the Combobox component since it relies on browser APIs that might not be fully simulated
// However, since we're using standard testing library, we might be able to test it directly if the environment is set up correctly.
// Let's try testing it directly first, if it fails we might need to mock or adjust.
// Actually, Radix/Base UI components can be tricky in JSDOM. Let's see.

const mockManifest = {
  default: "examples/sample-simple",
  files: [
    {
      name: "Simple Example",
      path: "sboms/examples/sample-simple.sbom.json",
      id: "examples/sample-simple",
      group: "Examples",
    },
    {
      name: "Self Scan (Latest)",
      path: "sboms/self/latest.sbom.json",
      id: "self/latest",
      group: "Self Scan",
    },
    {
      name: "Ungrouped Item",
      path: "sboms/other/ungrouped.sbom.json",
      id: "other/ungrouped",
    },
  ],
};

describe("SbomSelector", () => {
  it("renders with the selected file name", () => {
    const onSelect = vi.fn();
    render(
      <SbomSelector
        manifest={mockManifest}
        currentFile="examples/sample-simple"
        onSelect={onSelect}
      />
    );

    // The combobox input should display the selected item's name as placeholder or value
    expect(screen.getByPlaceholderText("Simple Example")).toBeInTheDocument();
  });

  it("displays 'Custom (filename)' for local files", () => {
    const onSelect = vi.fn();
    render(
      <SbomSelector
        manifest={mockManifest}
        currentFile="Local: my-file.json"
        onSelect={onSelect}
      />
    );

    expect(
      screen.getByPlaceholderText("Custom (my-file.json)")
    ).toBeInTheDocument();
  });

  it("filters options when typing", () => {
    const onSelect = vi.fn();
    render(
      <SbomSelector
        manifest={mockManifest}
        currentFile="examples/sample-simple"
        onSelect={onSelect}
      />
    );

    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "Self" } });

    // Should show the Self Scan option
    // Note: Combobox implementation details might require finding by role 'option' or similar
    // We are checking if the groups work too
    
    // We might need to open it first?
    fireEvent.click(input);
    
    expect(screen.getByText("Self Scan (Latest)")).toBeInTheDocument();
    expect(screen.queryByText("Simple Example")).not.toBeInTheDocument();
  });
  
  it("groups items correctly", () => {
      const onSelect = vi.fn();
      render(
        <SbomSelector
          manifest={mockManifest}
          currentFile="examples/sample-simple"
          onSelect={onSelect}
        />
      );
      
      const input = screen.getByRole("combobox");
      fireEvent.click(input); // Open dropdown
      
      expect(screen.getByText("Examples")).toBeInTheDocument();
      expect(screen.getByText("Self Scan")).toBeInTheDocument();
      expect(screen.getByText("Other")).toBeInTheDocument(); // For Ungrouped Item
  });
});
