import { render, screen, fireEvent } from "@testing-library/react";
import { HelpGuide } from "./HelpGuide";
import { describe, it, expect } from "vitest";

describe("HelpGuide", () => {
  it("renders the help button", () => {
    render(<HelpGuide />);
    const button = screen.getByRole("button", { name: /help guide/i });
    expect(button).toBeInTheDocument();
  });

  it("opens the dialog when clicked", () => {
    render(<HelpGuide />);
    const button = screen.getByRole("button", { name: /help guide/i });
    fireEvent.click(button);
    
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("SBOM Viewer Guide")).toBeInTheDocument();
    expect(screen.getByText(/1. Generate an SBOM/i)).toBeInTheDocument();
  });
});
