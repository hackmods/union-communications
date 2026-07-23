import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { BoardTrimCanvas } from "./BoardTrimCanvas";

vi.mock("@/components/brand/BrandLogo", () => ({
  BrandLogo: ({
    variantOverride,
  }: {
    variantOverride?: "lockup" | "mark";
  }) => (
    <div
      data-testid="brand-logo"
      data-variant={variantOverride ?? "default"}
    />
  ),
}));

const baseProps = {
  primaryColor: "#003DA5",
  secondaryColor: "#C8102E",
  accentColor: "#FFD100",
  localNumber: "243",
  showLocal: true,
  logoMode: "none" as const,
  showByline: false,
  byline: "",
};

describe("BoardTrimCanvas", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders side rail with local labels and optional logo/byline", () => {
    const { rerender } = render(
      <BoardTrimCanvas
        {...baseProps}
        piece="side"
        accessibleName="Side trim preview"
      />,
    );

    const group = screen.getByRole("group", { name: "Side trim preview" });
    expect(group).toBeInTheDocument();
    expect(within(group).getAllByText("LOCAL 243")).toHaveLength(2);
    expect(within(group).queryByTestId("brand-logo")).not.toBeInTheDocument();

    rerender(
      <BoardTrimCanvas
        {...baseProps}
        piece="side"
        showLocal={false}
        logoMode="mark"
        showByline
        byline="In solidarity"
        edgeWidthInches={2}
        accessibleName="Side trim preview"
      />,
    );

    expect(within(group).getByTestId("brand-logo")).toHaveAttribute(
      "data-variant",
      "mark",
    );
    expect(
      within(group).getAllByText("In solidarity").length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("gates the vertical side byline when the edge is too narrow", () => {
    render(
      <BoardTrimCanvas
        {...baseProps}
        piece="side"
        showLocal={false}
        showByline
        byline="Too narrow"
        edgeWidthInches={1.5}
      />,
    );

    // Bottom/top caps may still fall back to byline; the rail-body vertical
    // byline requires edgeWidthInches >= 2.
    const vertical = screen
      .getAllByText("Too narrow")
      .filter((el) => (el as HTMLElement).style.writingMode === "vertical-rl");
    expect(vertical).toHaveLength(0);
    expect(screen.getByText("Too narrow")).toBeInTheDocument();
  });

  it("renders bottom rail with logo and horizontal byline", () => {
    render(
      <BoardTrimCanvas
        {...baseProps}
        piece="bottom"
        showLocal={false}
        logoMode="lockup"
        showByline
        byline="Bottom byline"
      />,
    );

    expect(screen.getByTestId("brand-logo")).toHaveAttribute(
      "data-variant",
      "lockup",
    );
    expect(screen.getAllByText("Bottom byline").length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("renders corner L-miter with gated byline and local label", () => {
    const { rerender } = render(
      <BoardTrimCanvas
        {...baseProps}
        piece="corner"
        logoMode="lockup"
        showByline
        byline="Corner note"
        edgeWidthInches={2}
        accessibleName="Corner trim preview"
      />,
    );

    const group = screen.getByRole("group", { name: "Corner trim preview" });
    expect(within(group).getByText("LOCAL 243")).toBeInTheDocument();
    expect(within(group).getByText("Corner note")).toBeInTheDocument();
    expect(within(group).getByTestId("brand-logo")).toBeInTheDocument();

    rerender(
      <BoardTrimCanvas
        {...baseProps}
        piece="corner"
        showLocal={false}
        logoMode="none"
        showByline
        byline="Corner note"
        edgeWidthInches={1}
        accessibleName="Corner trim preview"
      />,
    );

    expect(within(group).queryByText("LOCAL 243")).not.toBeInTheDocument();
    expect(within(group).queryByText("Corner note")).not.toBeInTheDocument();
    expect(within(group).queryByTestId("brand-logo")).not.toBeInTheDocument();
  });
});
