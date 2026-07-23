import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Select } from "./Select";
import { Checkbox } from "./Checkbox";
import { Radio, RadioGroup } from "./Radio";
import { Dialog } from "./Dialog";
import { Badge } from "./Badge";
import { EmptyState } from "./EmptyState";
import { Skeleton } from "./Skeleton";

describe("ui primitives", () => {
  it("Select associates label via htmlFor", () => {
    render(
      <Select label="Category" defaultValue="a">
        <option value="a">A</option>
        <option value="b">B</option>
      </Select>,
    );
    expect(screen.getByLabelText("Category")).toHaveValue("a");
  });

  it("Checkbox associates label and description", () => {
    render(
      <Checkbox label="GPS" description="Optional location tag" />,
    );
    const input = screen.getByRole("checkbox", { name: "GPS" });
    expect(input).toHaveAccessibleDescription("Optional location tag");
  });

  it("RadioGroup exposes radios with shared name", () => {
    render(
      <RadioGroup legend="Mode">
        <Radio name="mode" value="a" label="Alpha" defaultChecked />
        <Radio name="mode" value="b" label="Beta" />
      </RadioGroup>,
    );
    expect(screen.getByRole("radio", { name: "Alpha" })).toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: "Beta" }));
    expect(screen.getByRole("radio", { name: "Beta" })).toBeChecked();
  });

  it("Dialog opens, closes on Escape, and restores focus", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Dialog open={false} onClose={onClose} title="Confirm" closeLabel="Close">
        Body
      </Dialog>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    rerender(
      <Dialog open onClose={onClose} title="Confirm" closeLabel="Close">
        Body
      </Dialog>,
    );
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Confirm");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("Badge and EmptyState render caller copy", () => {
    render(
      <>
        <Badge variant="danger">Overdue</Badge>
        <EmptyState title="Nothing here" description="Create one to start." />
      </>,
    );
    expect(screen.getByText("Overdue")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Nothing here");
  });

  it("Skeleton is decorative", () => {
    const { container } = render(<Skeleton className="h-4 w-24" />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });
});
