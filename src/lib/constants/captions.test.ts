import { describe, expect, it } from "vitest";
import {
  CAPTION_TEMPLATES,
  formatCaptionBody,
  isCaptionTemplateId,
} from "@/lib/constants/captions";
import { emojiChar } from "@/lib/constants/emoji";

describe("captions constants", () => {
  it("exposes six stable template ids", () => {
    expect(CAPTION_TEMPLATES).toHaveLength(6);
    for (const tpl of CAPTION_TEMPLATES) {
      expect(isCaptionTemplateId(tpl.id)).toBe(true);
      expect(tpl.hashtags.some((h) => h === "#LocalUnion")).toBe(true);
      expect(tpl.hashtags.join(" ")).not.toMatch(/OPSEU|CAAT/i);
    }
  });

  it("formats lead and trail emoji around caption bodies", () => {
    const agm = CAPTION_TEMPLATES.find((t) => t.id === "agm")!;
    expect(formatCaptionBody(agm, "BODY")).toBe(
      `${emojiChar("megaphone")} BODY`,
    );
    const thanks = CAPTION_TEMPLATES.find((t) => t.id === "event-thanks")!;
    expect(formatCaptionBody(thanks, "BODY")).toBe(
      `BODY ${emojiChar("strength")}`,
    );
  });
});
