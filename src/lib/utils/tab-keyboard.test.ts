import { afterEach, describe, expect, it, vi } from "vitest";
import { moveTabFocus } from "./tab-keyboard";

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); });

function tablist() {
  const list = document.createElement("div");
  list.setAttribute("role", "tablist");
  for (const key of ["edit", "preview"]) {
    const tab = document.createElement("button");
    tab.setAttribute("role", "tab");
    tab.dataset.tabKey = key;
    list.append(tab);
  }
  document.body.append(list);
  return list;
}

describe("tab keyboard navigation", () => {
  it("moves focus within the initiating tablist even when another has identical keys", () => {
    tablist();
    const list = tablist();
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => { callback(0); return 1; });
    const select = vi.fn();
    const preventDefault = vi.fn();
    moveTabFocus({ key: "ArrowRight", currentTarget: list.firstElementChild, preventDefault }, "edit", ["edit", "preview"], select);
    expect(select).toHaveBeenCalledWith("preview");
    expect(document.activeElement).toBe(list.lastElementChild);
    expect(preventDefault).toHaveBeenCalledOnce();
  });

  it("ignores empty or stale tab sets and ordinary typing", () => {
    const select = vi.fn();
    const event = { key: "End", currentTarget: null, preventDefault: vi.fn() };
    moveTabFocus(event, "edit", [], select);
    moveTabFocus(event, "missing", ["edit"], select);
    moveTabFocus({ ...event, key: "a" }, "edit", ["edit"], select);
    expect(select).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});
