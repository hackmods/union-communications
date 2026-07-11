import { describe, expect, it } from "vitest";
import {
  EXAMPLE_POSTS,
  captionHref,
  getExamplePost,
  layoutSupportsPhoto,
  primaryToolHref,
} from "./examples";

describe("examples handoff", () => {
  it("resolves posts by id", () => {
    expect(getExamplePost("member-spotlight")?.layout).toBe("spotlight");
    expect(getExamplePost("missing")).toBeUndefined();
  });

  it("deep-links every post with example= to the primary tool", () => {
    for (const post of EXAMPLE_POSTS) {
      const href = primaryToolHref(post);
      expect(href).toContain(`example=${post.id}`);
      if (post.primaryTool === "graphic-maker") {
        expect(href).toMatch(/^\/tools\/graphic-maker\?/);
      } else if (post.primaryTool === "quote-card") {
        expect(href).toMatch(/^\/tools\/quote-card\?/);
      } else {
        expect(href).toMatch(/^\/tools\/flyer-maker\?/);
      }
    }
  });

  it("builds caption deep links", () => {
    expect(captionHref("strike")).toBe("/captions?caption=strike");
  });

  it("marks photo-friendly layouts", () => {
    expect(layoutSupportsPhoto("solidarity")).toBe(true);
    expect(layoutSupportsPhoto("spotlight")).toBe(true);
    expect(layoutSupportsPhoto("thanks")).toBe(true);
    expect(layoutSupportsPhoto("notice")).toBe(false);
    expect(layoutSupportsPhoto("results")).toBe(false);
  });
});
