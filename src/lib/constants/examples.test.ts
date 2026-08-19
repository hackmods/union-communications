import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";
import {
  EXAMPLE_POSTS,
  aspectFromQuery,
  captionHref,
  coerceAspectForGraphicLayout,
  getExamplePost,
  graphicAspectClass,
  isExampleAspect,
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

  it("includes a portrait Graphic Maker still for Reels covers", () => {
    const post = getExamplePost("reel-picket");
    expect(post?.aspect).toBe("portrait");
    expect(post?.primaryTool).toBe("graphic-maker");
    expect(post?.layout).toBe("solidarity");
  });

  it("maps Graphic Maker aspects to canvas classes", () => {
    expect(graphicAspectClass("landscape")).toBe("aspect-[1200/630]");
    expect(graphicAspectClass("square")).toBe("aspect-square");
    expect(graphicAspectClass("portrait")).toBe("aspect-[9/16]");
    expect(isExampleAspect("portrait")).toBe(true);
    expect(isExampleAspect("ultrawide")).toBe(false);
  });

  it("reads ?aspect= from the query with a fallback", () => {
    expect(
      aspectFromQuery(
        { get: (name) => (name === "aspect" ? "portrait" : null) },
        "square",
      ),
    ).toBe("portrait");
    expect(aspectFromQuery({ get: () => null }, "square")).toBe("square");
    expect(aspectFromQuery({ get: () => "ultrawide" }, "square")).toBe(
      "square",
    );
  });

  it("keeps portrait when spotlight or results would otherwise force square", () => {
    expect(coerceAspectForGraphicLayout("spotlight", "landscape")).toBe("square");
    expect(coerceAspectForGraphicLayout("results", "landscape")).toBe("square");
    expect(coerceAspectForGraphicLayout("spotlight", "portrait")).toBe("portrait");
    expect(coerceAspectForGraphicLayout("solidarity", "landscape")).toBe(
      "landscape",
    );
  });

  it("has EN and FR copy for every example post", () => {
    const enPosts = en.examples.posts as Record<
      string,
      { title?: string; description?: string }
    >;
    const frPosts = fr.examples.posts as Record<
      string,
      { title?: string; description?: string }
    >;
    for (const post of EXAMPLE_POSTS) {
      expect(enPosts[post.id]?.title, `en ${post.id}`).toBeTruthy();
      expect(enPosts[post.id]?.description, `en ${post.id}`).toBeTruthy();
      expect(frPosts[post.id]?.title, `fr ${post.id}`).toBeTruthy();
      expect(frPosts[post.id]?.description, `fr ${post.id}`).toBeTruthy();
    }
  });

  it("marks photo-friendly layouts", () => {
    expect(layoutSupportsPhoto("solidarity")).toBe(true);
    expect(layoutSupportsPhoto("spotlight")).toBe(true);
    expect(layoutSupportsPhoto("thanks")).toBe(true);
    expect(layoutSupportsPhoto("notice")).toBe(false);
    expect(layoutSupportsPhoto("results")).toBe(false);
  });
});
