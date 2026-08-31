import { describe, expect, it } from "vitest";
import {
  BOARD_MATERIALS,
  materialsByKind,
} from "./board-materials";

describe("board-materials", () => {
  it("includes printable ministry posters", () => {
    const posters = materialsByKind("ministryPoster");
    expect(posters.length).toBeGreaterThanOrEqual(2);
    for (const p of posters) {
      expect(p.href).toBeDefined();
      expect(p.href!).toMatch(/\.pdf$/);
      expect(p.href!.startsWith("/assets/ontario-board-posters/")).toBe(true);
    }
  });

  it("ships anonymized local templates without real college domains", () => {
    const templates = materialsByKind("localTemplate");
    expect(templates.length).toBeGreaterThanOrEqual(3);
    const blob = JSON.stringify(BOARD_MATERIALS);
    expect(blob).not.toMatch(/niagaracollege/i);
    expect(blob).not.toMatch(/Local 243/i);
  });

  it("uses branded PDF references instead of raw markdown templates", () => {
    const pdfTemplates = materialsByKind("localTemplate").filter(
      (m) => m.pdfReference,
    );
    expect(pdfTemplates.map((m) => m.pdfReference)).toEqual([
      "board-checklist",
      "ohsa-qr-tip",
    ]);
    for (const item of pdfTemplates) {
      expect(item.href).toBeUndefined();
    }
  });

  it("offers optional XLSX for CSV sample templates", () => {
    const csvTemplates = materialsByKind("localTemplate").filter((m) => m.href);
    expect(csvTemplates.every((m) => m.href?.endsWith(".csv"))).toBe(true);
    expect(csvTemplates.filter((m) => m.offerXlsx).length).toBeGreaterThanOrEqual(
      2,
    );
  });

  it("links ministry statutes through the comms registry", () => {
    const links = materialsByKind("ministryLink");
    for (const link of links) {
      expect(link.href).toMatch(/^https:\/\//);
    }
  });

  it("includes an example dense-board photo", () => {
    const photos = materialsByKind("examplePhoto");
    expect(photos.length).toBeGreaterThanOrEqual(3);
    expect(photos.some((p) => p.href?.includes("board-l33"))).toBe(true);
    expect(photos.some((p) => p.href?.includes("board-w010"))).toBe(true);
  });
});
