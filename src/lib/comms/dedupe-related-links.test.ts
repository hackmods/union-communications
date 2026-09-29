import { describe, expect, it } from "vitest";
import {
  dedupeRelatedByHref,
  normalizeRelatedHref,
} from "./dedupe-related-links";

describe("dedupeRelatedByHref", () => {
  it("keeps the first occurrence and emits canonical Learn paths", () => {
    const links = [
      { href: "/guide/dfr", label: "DFR" },
      { href: "/guide/steward-101", label: "Steward 101" },
      { href: "/learn/dfr/", label: "DFR again" },
      { href: "/guide/dfr?x=1", label: "DFR query" },
    ];
    expect(dedupeRelatedByHref(links)).toEqual([
      { href: "/learn/dfr", label: "DFR" },
      { href: "/learn/steward-101", label: "Steward 101" },
    ]);
  });

  it("normalizes trailing slashes and query/hash via canonical paths", () => {
    expect(normalizeRelatedHref("/guide/dfr/")).toBe("/learn/dfr");
    expect(normalizeRelatedHref("/guide/dfr?foo=1#bar")).toBe("/learn/dfr");
    expect(normalizeRelatedHref("/guide/officer-learning/contract-enforcement")).toBe(
      "/learn/officer/contract-enforcement",
    );
  });
});
