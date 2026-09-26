import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";
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

  it("links every template id to EN and FR message bodies", () => {
    const enTpl = en.captions.templates as Record<
      string,
      { category: string; title: string; caption: string }
    >;
    const frTpl = fr.captions.templates as Record<
      string,
      { category: string; title: string; caption: string }
    >;
    for (const tpl of CAPTION_TEMPLATES) {
      const enRow = enTpl[tpl.id];
      const frRow = frTpl[tpl.id];
      expect(enRow, `missing EN captions.templates.${tpl.id}`).toBeTruthy();
      expect(frRow, `missing FR captions.templates.${tpl.id}`).toBeTruthy();
      expect(enRow.title.trim().length).toBeGreaterThan(0);
      expect(enRow.caption.trim().length).toBeGreaterThan(0);
      expect(frRow.title.trim().length).toBeGreaterThan(0);
      expect(frRow.caption.trim().length).toBeGreaterThan(0);
      const placeholders = enRow.caption.match(/\[[^\]]+\]/g) ?? [];
      for (const ph of placeholders) {
        expect(frRow.caption).toContain(ph);
      }
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
