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
      expect(p.href).toMatch(/\.pdf$/);
      expect(p.href.startsWith("/assets/ontario-board-posters/")).toBe(true);
    }
  });

  it("ships anonymized local templates without real college domains", () => {
    const templates = materialsByKind("localTemplate");
    expect(templates.length).toBeGreaterThanOrEqual(3);
    const blob = JSON.stringify(BOARD_MATERIALS);
    expect(blob).not.toMatch(/niagaracollege/i);
    expect(blob).not.toMatch(/Local 243/i);
  });

  it("includes an example dense-board photo", () => {
    const photos = materialsByKind("examplePhoto");
    expect(photos).toHaveLength(1);
    expect(photos[0].href).toContain("example-dense-board");
  });
});
