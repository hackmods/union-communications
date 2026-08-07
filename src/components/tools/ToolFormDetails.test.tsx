import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ToolFormDetails } from "@/components/tools/ToolFormDetails";

describe("ToolFormDetails", () => {
  it("starts collapsed and reveals children when opened", () => {
    render(
      <ToolFormDetails title="Ornaments">
        <p>Show local number</p>
      </ToolFormDetails>,
    );

    const details = screen.getByText("Ornaments").closest("details");
    expect(details).not.toBeNull();
    expect(details).not.toHaveAttribute("open");

    fireEvent.click(screen.getByText("Ornaments"));
    expect(details).toHaveAttribute("open");
    expect(screen.getByText("Show local number")).toBeInTheDocument();
  });

  it("honours defaultOpen", () => {
    render(
      <ToolFormDetails title="Colours" defaultOpen>
        <p>Theme picker</p>
      </ToolFormDetails>,
    );
    const details = screen.getByText("Colours").closest("details");
    expect(details).toHaveAttribute("open");
    expect(screen.getByText("Theme picker")).toBeInTheDocument();
  });
});
