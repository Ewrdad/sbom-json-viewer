import { render, screen, fireEvent } from "@testing-library/react";
import { HelpGuide } from "./HelpGuide";
import { describe, it, expect } from "vitest";

describe("HelpGuide", () => {
  it("renders the help button", () => {
    render(<HelpGuide />);
    const button = screen.getByRole("button", { name: /help guide/i });
    expect(button).toBeInTheDocument();
  });

  it("opens the dialog and displays accordion sections when clicked", () => {
    render(<HelpGuide />);
    const button = screen.getByRole("button", { name: /help guide/i });
    fireEvent.click(button);
    
    // Check dialog basic elements
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("SBOM Viewer Guide")).toBeInTheDocument();
    
    // Check Accordion sections exist
    expect(screen.getByText(/What is an SBOM\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Getting Started/i)).toBeInTheDocument();
    expect(screen.getByText(/Best Practices/i)).toBeInTheDocument();
    expect(screen.getByText(/Making the Most of SBOMs/i)).toBeInTheDocument();
  });
});
