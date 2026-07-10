import { describe, it, expect } from "vitest";
import { EMOJIS, emojiChar } from "@/lib/constants/emoji";
import { resolveEmoji } from "@/lib/utils/emoji";

describe("emoji registry", () => {
  it("defines a fallback for every site emoji", () => {
    for (const def of Object.values(EMOJIS)) {
      expect(def.fallback).toBeTruthy();
      expect(def.fallback).not.toBe(def.primary);
      expect(def.label).toBeTruthy();
    }
  });

  it("uses fallback for text-presentation warning symbol in copy", () => {
    expect(emojiChar("warning")).toBe("❗");
    expect(emojiChar("warning")).not.toBe("⚠️");
  });

  it("uses primary for well-supported emojis in copy", () => {
    expect(emojiChar("megaphone")).toBe("📢");
    expect(emojiChar("clipboard")).toBe("📋");
    expect(emojiChar("document")).toBe("📄");
    expect(emojiChar("star")).toBe("🌟");
    expect(emojiChar("strength")).toBe("💪");
  });

  it("resolves preferFallback emojis without probing", () => {
    expect(resolveEmoji(EMOJIS.warning)).toBe("❗");
  });
});
