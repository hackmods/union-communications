import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Dialog } from "./Dialog";

afterEach(() => { cleanup(); document.body.replaceChildren(); vi.restoreAllMocks(); });

describe("Dialog", () => {
  it("makes adjacent content inert and restores focus and scroll on close", () => {
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();
    const view = render(<section><button data-testid="sibling">Outside</button><Dialog open onClose={() => {}} title="Consent"><button>Continue</button></Dialog></section>);
    expect(screen.getByTestId("sibling").inert).toBe(true);
    expect(document.activeElement).toBe(screen.getByRole("dialog"));
    expect(document.body.style.overflow).toBe("hidden");
    view.unmount();
    expect(document.activeElement).toBe(trigger);
    expect(document.body.style.overflow).toBe("");
  });

  it("contains Tab focus and uses the latest close handler without resetting focus", () => {
    vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([{}] as unknown as DOMRectList);
    const onClose = vi.fn();
    const view = render(<Dialog open onClose={() => {}} title="Consent"><button>Continue</button></Dialog>);
    const last = screen.getByRole("button", { name: "Continue" });
    last.focus();
    view.rerender(<Dialog open onClose={onClose} title="Consent"><button>Continue</button></Dialog>);
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(last, { key: "Tab" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close" }));
    fireEvent.keyDown(document.activeElement!, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(last, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
