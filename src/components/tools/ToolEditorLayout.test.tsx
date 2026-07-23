import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { ToolEditorLayout } from "./ToolEditorLayout";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const copy: Record<string, string> = {
      edit: "Edit",
      preview: "Preview",
      toolEditorPanes: "Editor panels",
      expandPreview: "Enlarge preview",
      collapsePreview: "Hide preview",
      showPreview: "Show preview",
      backToEdit: "Back to edit",
    };
    return copy[key] ?? key;
  },
}));

function stubMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe("ToolEditorLayout", () => {
  beforeEach(() => {
    stubMatchMedia(false);
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders title, form, and preview content", () => {
    render(
      <ToolEditorLayout
        title="Board Banner"
        description="Build a notice"
        form={<label htmlFor="headline">Headline</label>}
        preview={<div>Canvas preview</div>}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Board Banner" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Build a notice")).toBeInTheDocument();
    expect(screen.getByText("Headline")).toBeInTheDocument();
    expect(screen.getByText("Canvas preview")).toBeInTheDocument();
  });

  it("surfaces exportError as a danger alert", () => {
    render(
      <ToolEditorLayout
        title="Flyer"
        form={<div>Form</div>}
        preview={<div>Preview</div>}
        exportError="PDF export failed"
      />,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("PDF export failed");
  });

  it("wraps preview in an accessible named group when provided", () => {
    render(
      <ToolEditorLayout
        title="Poster"
        form={<div>Form</div>}
        preview={<div>Live canvas</div>}
        previewAccessibleName="Solidarity poster preview"
      />,
    );

    const group = screen.getByRole("group", {
      name: "Solidarity poster preview",
    });
    expect(within(group).getByText("Live canvas")).toBeInTheDocument();
  });

  it("switches mobile Edit/Preview tabs and shows preview actions", () => {
    render(
      <ToolEditorLayout
        title="Trim"
        form={<div>Edit form fields</div>}
        preview={<div>Trim canvas</div>}
        previewActions={<button type="button">Download PDF</button>}
        previewSecondary={<div>Print sheet</div>}
      />,
    );

    const tablist = screen.getByRole("tablist", { name: "Editor panels" });
    const editTab = within(tablist).getByRole("tab", { name: "Edit" });
    const previewTab = within(tablist).getByRole("tab", { name: "Preview" });

    expect(editTab).toHaveAttribute("aria-selected", "true");
    expect(previewTab).toHaveAttribute("aria-selected", "false");
    const formPanel = screen.getByText("Edit form fields").closest("[role='tabpanel']");
    expect(formPanel).toHaveClass("block");
    expect(screen.queryByText("Download PDF")).not.toBeInTheDocument();
    expect(screen.queryByText("Print sheet")).not.toBeInTheDocument();

    fireEvent.click(previewTab);

    expect(editTab).toHaveAttribute("aria-selected", "false");
    expect(previewTab).toHaveAttribute("aria-selected", "true");
    expect(formPanel).toHaveClass("hidden");
    expect(screen.getByRole("button", { name: "Download PDF" })).toBeInTheDocument();
    expect(screen.getByText("Print sheet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back to edit" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back to edit" }));
    expect(editTab).toHaveAttribute("aria-selected", "true");
    expect(formPanel).toHaveClass("block");
  });

  it("collapses and restores the mobile mini preview dock", () => {
    render(
      <ToolEditorLayout
        title="Graphic"
        form={<div>Form</div>}
        preview={<div>Mini canvas</div>}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Hide preview" }));
    expect(screen.getByRole("button", { name: "Show preview" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show preview" }));
    expect(screen.getByRole("button", { name: "Hide preview" })).toBeInTheDocument();
  });

  it("hides mobile mini-preview chrome when miniPreview is false", () => {
    render(
      <ToolEditorLayout
        title="Alt text"
        form={<div>Form</div>}
        preview={<div>Preview</div>}
        miniPreview={false}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Hide preview" }),
    ).not.toBeInTheDocument();
  });

  it("keeps both columns and secondary preview on desktop", async () => {
    stubMatchMedia(true);

    render(
      <ToolEditorLayout
        title="Desktop tool"
        form={<div>Desktop form</div>}
        preview={<div>Desktop preview</div>}
        previewSecondary={<div>Secondary sheet</div>}
        previewActions={<button type="button">Export</button>}
      />,
    );

    expect(screen.getByText("Desktop form")).toBeInTheDocument();
    expect(screen.getByText("Desktop preview")).toBeInTheDocument();
    // isLg flips after matchMedia effect — secondary only mounts when isLg.
    expect(await screen.findByText("Secondary sheet")).toBeInTheDocument();
    expect(screen.queryByText("Export")).not.toBeInTheDocument();
  });
});
