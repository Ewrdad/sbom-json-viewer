import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SearchButton } from "./SearchButton";
import { SettingsProvider } from "../../context/SettingsContext";

// Mock ScrollArea to avoid resizing observer issues in tests if any
vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock window.open
const mockOpen = vi.fn();
window.open = mockOpen;

const renderWithSettings = (ui: React.ReactNode) => {
  return render(<SettingsProvider>{ui}</SettingsProvider>);
};

describe("SearchButton", () => {
  it("renders correctly with default settings", () => {
    renderWithSettings(<SearchButton query="test query" />);
    
    // Check if main search button exists
    const searchBtn = screen.getByRole("button", { name: /search/i });
    expect(searchBtn).toBeInTheDocument();
    
    // Check if tooltip text is present (might be hidden, but accessible)
    // Note: Tooltip content is usually not in DOM until verified.
  });

  it("performs search with default engine when clicked", () => {
    renderWithSettings(<SearchButton query="test query" />);
    
    const searchBtn = screen.getByRole("button", { name: /search/i }); // Matches the sr-only text "Search"
    fireEvent.click(searchBtn);

    expect(mockOpen).toHaveBeenCalledWith(
      expect.stringContaining("google.com/search?q=test%20query"),
      "_blank",
      "noopener,noreferrer"
    );
  });

  it("opens dropdown menu", async () => {
    renderWithSettings(<SearchButton query="test query" />);
    
    const dropdownTrigger = screen.getByRole("button", { name: /more options/i });
    fireEvent.click(dropdownTrigger);

    // Check for dropdown content
    expect(screen.getByText("Quick Search (One-off)")).toBeInTheDocument();
    expect(screen.getByText("Default Search Engine")).toBeInTheDocument();
    // Check for search engine names (they appear twice - once in quick search, once in settings)
    expect(screen.getAllByText("Google").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("DuckDuckGo").length).toBeGreaterThanOrEqual(1);
  });
});
