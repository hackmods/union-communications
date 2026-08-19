import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";
import {
  UPDATE_KINDS,
  UPDATES,
  assertUpdateCatalogShape,
  filterUpdates,
  formatUpdateDate,
  formatUpdateMonth,
  groupUpdatesByMonth,
  monthKey,
  visibleUpdates,
} from "./updates";

describe("updates catalog", () => {
  it("is newest-first with unique ids and in-app hrefs", () => {
    expect(assertUpdateCatalogShape(UPDATES)).toEqual([]);
  });

  it("hides Officer Hub notes until the hub is advertised", () => {
    const publicIds = visibleUpdates({ officerHubPublic: false }).map((e) => e.id);
    const hubIds = visibleUpdates({ officerHubPublic: true }).map((e) => e.id);

    expect(publicIds).not.toContain("local-portal");
    expect(hubIds).toContain("local-portal");
    expect(publicIds.length).toBe(hubIds.length - 1);
  });

  it("filters by kind without dropping later months", () => {
    const guides = filterUpdates(UPDATES, "guide");
    expect(guides.every((e) => e.kind === "guide")).toBe(true);
    expect(guides.map((e) => e.id)).toContain("short-form-guide");
    expect(guides.map((e) => e.id)).not.toContain("graphic-portrait");
    expect(filterUpdates(UPDATES, "all")).toHaveLength(UPDATES.length);
  });

  it("groups consecutive entries by year-month", () => {
    const groups = groupUpdatesByMonth(UPDATES);
    expect(groups[0]?.month).toBe("2026-08");
    expect(groups.some((g) => g.month === "2026-07")).toBe(true);
    expect(groups.flatMap((g) => g.entries)).toHaveLength(UPDATES.length);
    expect(monthKey("2026-08-18")).toBe("2026-08");
  });

  it("formats dates in EN and FR without UTC day-shift", () => {
    expect(formatUpdateDate("2026-08-18", "en")).toMatch(/18/);
    expect(formatUpdateDate("2026-08-18", "en")).toMatch(/2026/);
    expect(formatUpdateMonth("2026-08", "en")).toMatch(/August/i);
    expect(formatUpdateMonth("2026-08", "fr")).toMatch(/[Aa]o[uû]t/);
    expect(formatUpdateMonth("2026-08", "fr").charAt(0)).toBe("A");
  });

  it("has EN and FR title and body for every catalog id", () => {
    const enItems = en.updates.items as Record<
      string,
      { title?: string; body?: string }
    >;
    const frItems = fr.updates.items as Record<
      string,
      { title?: string; body?: string }
    >;

    for (const entry of UPDATES) {
      expect(enItems[entry.id]?.title, `en title ${entry.id}`).toBeTruthy();
      expect(enItems[entry.id]?.body, `en body ${entry.id}`).toBeTruthy();
      expect(frItems[entry.id]?.title, `fr title ${entry.id}`).toBeTruthy();
      expect(frItems[entry.id]?.body, `fr body ${entry.id}`).toBeTruthy();
    }

    expect(Object.keys(enItems).sort()).toEqual(
      [...UPDATES.map((e) => e.id)].sort(),
    );
    expect(Object.keys(frItems).sort()).toEqual(
      [...UPDATES.map((e) => e.id)].sort(),
    );
  });

  it("covers every kind so filters are not empty on the public list", () => {
    const publicList = visibleUpdates({ officerHubPublic: false });
    for (const kind of UPDATE_KINDS) {
      expect(
        publicList.some((entry) => entry.kind === kind),
        `missing public ${kind}`,
      ).toBe(true);
    }
  });
});
