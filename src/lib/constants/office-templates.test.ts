import { describe, expect, it } from "vitest";
import {
  OFFICE_PRESETS,
  brandPalette,
  defaultFieldsForPreset,
  getPreset,
} from "./office-templates";
import { DEFAULT_BRAND_KIT } from "@/lib/constants/brand";

describe("office-templates", () => {
  it("ships six high-quality presets including seniority worksheet", () => {
    expect(OFFICE_PRESETS.map((p) => p.id)).toEqual([
      "simple-letter",
      "letterhead",
      "quick-event",
      "welcome-letter",
      "seniority-worksheet",
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

  it("seniority worksheet is Excel-only with session footer fields", () => {
    const sheet = getPreset("seniority-worksheet");
    expect(sheet.outputs).toEqual({
      docx: false,
      xlsx: true,
      pptx: false,
      ics: false,
    });
    expect(sheet.fields.some((f) => f.key === "sessionDate")).toBe(true);
    expect(sheet.fields.some((f) => f.key === "caseId")).toBe(true);
    expect(sheet.fields.some((f) => f.key === "chair")).toBe(true);
  });
});
