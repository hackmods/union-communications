import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ICON_48_PATH,
  ICON_192_PATH,
  ICON_512_PATH,
  OG_IMAGE_PATH,
  OG_IMAGE_STATIC_PATH,
  TWITTER_IMAGE_PATH,
} from "./site";

describe("SEO share + favicon paths", () => {
  it("points OG and Twitter cards at the static PNG (crawler-safe)", () => {
    expect(OG_IMAGE_PATH).toBe("/og-image.png");
    expect(TWITTER_IMAGE_PATH).toBe("/og-image.png");
    expect(OG_IMAGE_STATIC_PATH).toBe("/og-image.png");
  });

  it("ships Google-sized 48px icon plus PWA icons and OG card on disk", () => {
    const root = path.resolve(__dirname, "../../..");
    for (const iconPath of [
      ICON_48_PATH,
      ICON_192_PATH,
      ICON_512_PATH,
      OG_IMAGE_PATH,
    ]) {
      const absolute = path.join(root, "public", iconPath.replace(/^\//, ""));
      expect(fs.existsSync(absolute), `missing ${absolute}`).toBe(true);
    }
  });
});
