import { describe, expect, it } from "vitest";
import { DEFAULT_WEBSITE_OFFICERS } from "@/types/website-template";
import {
  defaultPublicRoster,
  emptyRosterPerson,
  groupOrgChartPeople,
  officersFromRoster,
  parsePublicRosterCsv,
  parsePublicRosterJson,
  parsePublicRosterJsonText,
  rosterHasNamedPeople,
  serializePublicRoster,
  serializePublicRosterCsv,
  stampRoster,
} from "./index";
import type { PublicRosterPerson } from "@/types/public-roster";

function person(
  patch: Partial<PublicRosterPerson> & Pick<PublicRosterPerson, "id" | "group">,
): PublicRosterPerson {
  return {
    name: "",
    role: "",
    location: "",
    showOnWebsite: false,
    ...patch,
  };
}

describe("public roster defaults", () => {
  it("seeds executive rows from the website officer placeholders", () => {
    const roster = defaultPublicRoster();
    expect(roster.version).toBe("1.0");
    const executive = roster.people.filter((row) => row.group === "executive");
    const stewards = roster.people.filter((row) => row.group === "stewards");
    expect(executive).toHaveLength(DEFAULT_WEBSITE_OFFICERS.length);
    expect(executive.every((row) => row.showOnWebsite)).toBe(true);
    expect(stewards).toHaveLength(1);
    expect(stewards[0]?.showOnWebsite).toBe(false);
    const president = roster.people.find((row) => row.id === "exec-president");
    expect(president?.reportsToId).toBeNull();
    expect(
      executive
        .filter((row) => row.id !== "exec-president")
        .every((row) => row.reportsToId === "exec-president"),
    ).toBe(true);
  });
});

describe("JSON import/export", () => {
  it("round-trips a roster", () => {
    const roster = stampRoster([
      person({
        id: "p1",
        name: "Ada",
        role: "President",
        group: "executive",
        showOnWebsite: true,
      }),
    ]);
    const text = serializePublicRoster(roster);
    const parsed = parsePublicRosterJsonText(text);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.roster.people).toEqual(roster.people);
    }
  });

  it("rejects a Brand Kit JSON file", () => {
    const result = parsePublicRosterJson({
      version: "2.0",
      local: { localNumber: "243" },
      primaryColor: "#003DA5",
    });
    expect(result).toEqual({ ok: false, code: "brandKit" });
  });

  it("rejects invalid JSON text and empty people", () => {
    expect(parsePublicRosterJsonText("{")).toEqual({
      ok: false,
      code: "invalidJson",
    });
    expect(parsePublicRosterJson({ version: "1.0", people: [] })).toEqual({
      ok: false,
      code: "empty",
    });
    expect(parsePublicRosterJson({ version: "9.0", people: [{}] })).toEqual({
      ok: false,
      code: "invalidSchema",
    });
  });
});

describe("CSV import/export", () => {
  it("round-trips names, groups, website flags, and reports-to by name", () => {
    const roster = stampRoster([
      person({
        id: "p1",
        name: "Ada",
        role: "President",
        group: "executive",
        showOnWebsite: true,
      }),
      person({
        id: "p2",
        name: "Bea",
        role: "Treasurer",
        group: "executive",
        reportsToId: "p1",
        showOnWebsite: true,
      }),
      person({
        id: "p3",
        name: "Cara",
        role: "Steward",
        location: "North campus",
        group: "stewards",
        showOnWebsite: false,
      }),
    ]);
    const csv = serializePublicRosterCsv(roster);
    expect(csv).toContain("name,role,location,group,committee,showOnWebsite,reportsTo");
    expect(csv).toContain("Ada");
    const parsed = parsePublicRosterCsv(csv);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.roster.people.map((row) => row.name)).toEqual([
      "Ada",
      "Bea",
      "Cara",
    ]);
    const bea = parsed.roster.people.find((row) => row.name === "Bea");
    const ada = parsed.roster.people.find((row) => row.name === "Ada");
    expect(bea?.reportsToId).toBe(ada?.id);
    expect(
      parsed.roster.people.find((row) => row.name === "Cara")?.group,
    ).toBe("stewards");
    expect(
      parsed.roster.people.find((row) => row.name === "Cara")?.showOnWebsite,
    ).toBe(false);
  });

  it("matches reports-to by role when ids are absent", () => {
    const parsed = parsePublicRosterCsv(
      [
        "name,role,location,group,committee,showOnWebsite,reportsTo",
        "Ada,President,,executive,,true,",
        "Bea,Vice President,,executive,,true,President",
      ].join("\n"),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const bea = parsed.roster.people.find((row) => row.name === "Bea");
    const ada = parsed.roster.people.find((row) => row.name === "Ada");
    expect(bea?.reportsToId).toBe(ada?.id);
  });

  it("rejects a header-only sheet", () => {
    expect(
      parsePublicRosterCsv("name,role,location,group,committee,showOnWebsite,reportsTo\n"),
    ).toEqual({ ok: false, code: "empty" });
  });

  it("rejects a sheet without name and role columns", () => {
    expect(parsePublicRosterCsv("foo,bar\n1,2\n")).toEqual({
      ok: false,
      code: "invalidCsv",
    });
  });
});

describe("layout grouping", () => {
  it("puts the president on top and groups stewards by location", () => {
    const bands = groupOrgChartPeople([
      person({
        id: "vp",
        name: "Bea",
        role: "Vice President",
        group: "executive",
        reportsToId: "pres",
        showOnWebsite: true,
      }),
      person({
        id: "pres",
        name: "Ada",
        role: "President",
        group: "executive",
        showOnWebsite: true,
      }),
      person({
        id: "s1",
        name: "Cara",
        role: "Steward",
        location: "North",
        group: "stewards",
        showOnWebsite: false,
      }),
      person({
        id: "s2",
        name: "Dee",
        role: "Steward",
        location: "North",
        group: "stewards",
        showOnWebsite: false,
      }),
      person({
        id: "c1",
        name: "Eve",
        role: "Chair",
        group: "committee",
        committeeName: "JHSC",
        showOnWebsite: false,
      }),
      emptyRosterPerson("stewards"),
    ]);
    expect(bands.map((band) => band.kind)).toEqual([
      "executive-lead",
      "executive",
      "stewards",
      "committee",
    ]);
    expect(bands[0]?.people[0]?.name).toBe("Ada");
    expect(bands[1]?.people.map((row) => row.name)).toEqual(["Bea"]);
    expect(bands[2]?.title).toBe("North");
    expect(bands[2]?.people).toHaveLength(2);
    expect(bands[3]?.title).toBe("JHSC");
  });

  it("treats placeholder-only rows as named for the empty-state check", () => {
    expect(rosterHasNamedPeople(defaultPublicRoster().people)).toBe(true);
    expect(rosterHasNamedPeople([emptyRosterPerson()])).toBe(false);
  });
});

describe("website mapping", () => {
  it("copies flagged named people and respects the cap", () => {
    const people = Array.from({ length: 30 }, (_, index) =>
      person({
        id: `p${index}`,
        name: `Person ${index}`,
        role: "Officer",
        group: "executive",
        showOnWebsite: index % 2 === 0,
      }),
    );
    people.push(
      person({
        id: "hidden",
        name: "Hidden",
        role: "Steward",
        group: "stewards",
        showOnWebsite: false,
      }),
    );
    const officers = officersFromRoster(stampRoster(people), 24);
    expect(officers).toHaveLength(15);
    expect(officers[0]).toEqual({
      name: "Person 0",
      role: "Officer",
      location: "",
    });
    expect(officers.some((row) => row.name === "Hidden")).toBe(false);
  });
});
