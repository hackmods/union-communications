import { describe, expect, it } from "vitest";
import {
  dedupeRelatedByHref,
  normalizeRelatedHref,
} from "./dedupe-related-links";

describe("dedupeRelatedByHref", () => {
  it("keeps the first occurrence of each href", () => {
    const links = [
      { href: "/guide/dfr", label: "DFR" },
      { href: "/guide/steward-101", label: "Steward 101" },
      { href: "/guide/dfr/", label: "DFR again" },
      { href: "/guide/dfr?x=1", label: "DFR query" },
    ];
    expect(dedupeRelatedByHref(links)).toEqual([
      { href: "/guide/dfr", label: "DFR" },
      { href: "/guide/steward-101", label: "Steward 101" },
    ]);
  });

  it("normalizes trailing slashes and query/hash", () => {
    expect(normalizeRelatedHref("/guide/dfr/")).toBe("/guide/dfr");
    expect(normalizeRelatedHref("/guide/dfr?foo=1#bar")).toBe("/guide/dfr");
  });
});
