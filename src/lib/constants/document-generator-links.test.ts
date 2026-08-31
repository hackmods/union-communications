import { describe, expect, it } from "vitest";
import {
  documentGeneratorPresetHref,
  resolveOfficePresetFromQuery,
} from "./document-generator-links";

describe("document-generator-links", () => {
  it("builds trailing-slash-safe preset hrefs", () => {
    expect(documentGeneratorPresetHref("grievance-intake")).toBe(
      "/tools/document-generator/?preset=grievance-intake",
    );
    expect(documentGeneratorPresetHref("seniority-worksheet")).toBe(
      "/tools/document-generator/?preset=seniority-worksheet",
    );
  });

  it("resolves known presets and falls back for unknown ids", () => {
    expect(resolveOfficePresetFromQuery("grievance-intake")).toBe(
      "grievance-intake",
    );
    expect(resolveOfficePresetFromQuery("not-a-preset")).toBe("simple-letter");
    expect(resolveOfficePresetFromQuery(null)).toBe("simple-letter");
    expect(resolveOfficePresetFromQuery(undefined, "letterhead")).toBe(
      "letterhead",
    );
  });
});
