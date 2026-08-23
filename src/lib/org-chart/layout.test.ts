import { describe, expect, it } from "vitest";
import { directoryRowsFromPeople } from "./layout";
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

describe("directoryRowsFromPeople", () => {
  it("orders executive, stewards with shared label, then committee", () => {
    const rows = directoryRowsFromPeople(
      [
        person({
          id: "e1",
          group: "executive",
          name: "Ada",
          role: "President",
          unit: "ft",
        }),
        person({
          id: "s1",
          group: "stewards",
          name: "Bo",
          role: "Steward",
          location: "North",
        }),
        person({
          id: "s2",
          group: "stewards",
          name: "Cy",
          role: "Steward",
          location: "South",
          unit: "pt",
        }),
        person({
          id: "c1",
          group: "committee",
          name: "Di",
          role: "Chair",
          committeeName: "Equity",
        }),
      ],
      "Stewards",
    );
    expect(rows.map((r) => r.position)).toEqual([
      "President",
      "Stewards",
      "",
      "Chair",
    ]);
    expect(rows[0]?.name).toContain("(FT)");
    expect(rows[2]?.name).toContain("(PT)");
  });
});
