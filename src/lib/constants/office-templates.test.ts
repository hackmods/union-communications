import { describe, expect, it } from "vitest";
import {
  OFFICE_PRESETS,
  brandPalette,
  defaultFieldsForPreset,
  getPreset,
} from "./office-templates";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";

describe("office-templates", () => {
  it("ships seven high-quality presets including seniority and grievance intake", () => {
    expect(OFFICE_PRESETS.map((p) => p.id)).toEqual([
      "simple-letter",
      "letterhead",
      "quick-event",
      "welcome-letter",
      "seniority-worksheet",
      "grievance-intake",
      "lec-directory",
    ]);
  });

  it("maps Brand Kit to palette", () => {
    expect(
      brandPalette({
        ...DEFAULT_BRAND_KIT,
        primaryColor: "#112233",
        secondaryColor: "#445566",
        accentColor: "#778899",
      }),
    ).toEqual({
      primary: "#112233",
      secondary: "#445566",
      accent: "#778899",
    });
  });

  it("builds default fields", () => {
    const fields = defaultFieldsForPreset(getPreset("simple-letter"));
    expect(fields.memberName).toBeTruthy();
    expect(fields.body).toBeTruthy();
  });

  it("welcome letter includes membership and president fields", () => {
    const welcome = getPreset("welcome-letter");
    expect(welcome.outputs.docx).toBe(true);
    expect(welcome.outputs.xlsx).toBe(false);
    expect(welcome.fields.some((f) => f.key === "membershipUrl")).toBe(true);
    expect(welcome.fields.some((f) => f.key === "presidentName")).toBe(true);
    expect(welcome.fields.some((f) => f.key === "collection")).toBe(true);
  });

  it("event preset includes xlsx, ics, and hybrid LEC fields", () => {
    const event = getPreset("quick-event");
    expect(event.outputs.xlsx).toBe(true);
    expect(event.outputs.ics).toBe(true);
    expect(event.fields.some((f) => f.key === "calendarStart")).toBe(true);
    expect(event.fields.some((f) => f.key === "quorumNeeded")).toBe(true);
    expect(getPreset("simple-letter").outputs.xlsx).toBe(false);
    expect(getPreset("simple-letter").outputs.ics).toBe(false);
  });


  it("lec-directory is Brand Kit chrome only (docx+xlsx, no roster fields)", () => {
    const sheet = getPreset("lec-directory");
    expect(sheet.outputs.docx).toBe(true);
    expect(sheet.outputs.xlsx).toBe(true);
    expect(sheet.outputs.pptx).toBe(false);
    expect(sheet.fields.some((f) => f.key === "termYears")).toBe(true);
    expect(sheet.fields.every((f) => f.key !== "memberName")).toBe(true);
  });

  it("seniority worksheet ships Word and Excel with session footer fields", () => {
    const sheet = getPreset("seniority-worksheet");
    expect(sheet.outputs).toEqual({
      docx: true,
      xlsx: true,
      pptx: false,
      ics: false,
    });
    expect(sheet.fields.some((f) => f.key === "sessionDate")).toBe(true);
    expect(sheet.fields.some((f) => f.key === "caseId")).toBe(true);
    expect(sheet.fields.some((f) => f.key === "chair")).toBe(true);
  });

  it("grievance intake ships Word and Excel with empty 6 W's fields", () => {
    const sheet = getPreset("grievance-intake");
    expect(sheet.outputs).toEqual({
      docx: true,
      xlsx: true,
      pptx: false,
      ics: false,
    });
    const fields = defaultFieldsForPreset(sheet);
    expect(fields.who).toBe("");
    expect(fields.want).toBe("");
    expect(fields.witnesses).toBe("");
    expect(Object.values(fields).every((v) => v === "")).toBe(true);
  });

  it("every preset i18n key exists in English catalog", async () => {
    const en = (await import("../../../messages/en.json")).default
      .documentGenerator as Record<string, unknown>;
    function lookup(path: string): unknown {
      return path.split(".").reduce<unknown>((acc, part) => {
        if (!acc || typeof acc !== "object") return undefined;
        return (acc as Record<string, unknown>)[part];
      }, en);
    }
    for (const preset of OFFICE_PRESETS) {
      expect(lookup(preset.titleKey), preset.titleKey).toEqual(expect.any(String));
      expect(lookup(preset.blurbKey), preset.blurbKey).toEqual(expect.any(String));
      for (const field of preset.fields) {
        expect(lookup(field.labelKey), `${preset.id}:${field.labelKey}`).toEqual(
          expect.any(String),
        );
      }
      for (const key of preset.structureKeys) {
        expect(lookup(key), `${preset.id}:${key}`).toEqual(expect.any(String));
      }
    }
  });
});
