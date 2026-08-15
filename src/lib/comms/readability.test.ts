import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import {
  countSentences,
  countSyllables,
  fleschKincaidGrade,
  formatReadabilityReport,
  rankHardest,
  rankPublicAndHub,
  scoreLeaf,
  stripTemplateTokens,
} from "./readability";

describe("readability (COPY-005)", () => {
  it("counts syllables with a stable vowel-group heuristic", () => {
    expect(countSyllables("cat")).toBe(1);
    expect(countSyllables("local")).toBe(2);
    expect(countSyllables("grievance")).toBeGreaterThanOrEqual(2);
  });

  it("treats terminator-less UI strings as one sentence", () => {
    expect(countSentences("Open Brand Kit and set your colours")).toBe(1);
    expect(countSentences("First. Second! Third?")).toBe(3);
  });

  it("strips template tokens before scoring", () => {
    expect(stripTemplateTokens("Hello {name} and #LocalUnion")).toBe(
      "Hello   and  ",
    );
  });

  it("scores easy copy lower than dense jargon", () => {
    const easy = fleschKincaidGrade(
      "Open Brand Kit. Set your colours. Print a flyer for the board.",
    );
    const hard = fleschKincaidGrade(
      "Utilize the reference tenant defaults to leverage progressive web app canvas chrome and type scale configuration for subsequent multi-tenant isolation overlays.",
    );
    expect(easy).not.toBeNull();
    expect(hard).not.toBeNull();
    expect(hard!.grade).toBeGreaterThan(easy!.grade);
  });

  it("skips short leaves", () => {
    expect(scoreLeaf("nav.home", "Home")).toBeNull();
    expect(
      scoreLeaf(
        "home.subtitle",
        "Free Comms tools for any local: brand, boards, print, social, and a simple website.",
      ),
    ).not.toBeNull();
  });

  it("ranks hardest first and respects the limit", () => {
    const leaves = [
      ["a.easy", "Open Brand Kit. Set your colours. Print a flyer."] as const,
      [
        "a.hard",
        "Utilize the reference tenant defaults to leverage progressive web app canvas chrome and type scale configuration for subsequent multi-tenant isolation overlays.",
      ] as const,
      [
        "a.mid",
        "When people have not consented, prefer group photos over close-ups of faces.",
      ] as const,
    ];
    const ranked = rankHardest(leaves, 2);
    expect(ranked).toHaveLength(2);
    expect(ranked[0].path).toBe("a.hard");
    expect(ranked[0].grade).toBeGreaterThan(ranked[1].grade);
  });

  it("formats a readable report line", () => {
    const rows = rankHardest(
      [
        [
          "demo.path",
          "Utilize the reference tenant defaults to leverage progressive web app canvas chrome.",
        ],
      ] as const,
      1,
    );
    const text = formatReadabilityReport(rows);
    expect(text).toContain("demo.path");
    expect(text).toMatch(/grade \d+\.\d/);
  });

  it("ranks public and Hub sections from the EN catalog without throwing", () => {
    const { public: pub, hub } = rankPublicAndHub(
      en as unknown as Record<string, unknown>,
      5,
    );
    expect(pub.length).toBeGreaterThan(0);
    expect(pub.length).toBeLessThanOrEqual(5);
    expect(hub.length).toBeGreaterThan(0);
    expect(hub.length).toBeLessThanOrEqual(5);
    // Stable sort: grades descend.
    for (let i = 1; i < pub.length; i++) {
      expect(pub[i - 1].grade).toBeGreaterThanOrEqual(pub[i].grade);
    }
  });
});
