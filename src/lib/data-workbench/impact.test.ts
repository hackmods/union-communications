import { describe, expect, it } from "vitest";
import { summarizePublishImpact } from "./impact";

describe("publish impact preview", () => {
  const dataset = { kind: "member_employment" as const, fields: [] };
  const mapping = {
    "Member #": "memberNumber",
    Name: "fullName",
    Title: "jobTitle",
    "Position ID": "positionId",
    Standing: "duesStanding",
  };

  it("counts new vs matched people and flags jobs missing position IDs", () => {
    const impact = summarizePublishImpact(dataset, mapping, [
      {
        decision: "accept",
        matchPersonId: null,
        rawValues: {
          "Member #": "001",
          Name: "Alex",
          Title: "Clerk",
          "Position ID": "P-1",
          Standing: "good",
        },
      },
      {
        decision: "accept",
        matchPersonId: "person-existing",
        rawValues: {
          "Member #": "002",
          Name: "Sam",
          Title: "Cook",
          "Position ID": "",
          Standing: "",
        },
      },
      {
        decision: "exclude",
        matchPersonId: null,
        rawValues: { "Member #": "003", Name: "Pat", Title: "", "Position ID": "", Standing: "" },
      },
      {
        decision: "pending",
        matchPersonId: null,
        rawValues: { "Member #": "004", Name: "Jo", Title: "", "Position ID": "", Standing: "" },
      },
    ]);

    expect(impact).toEqual({
      acceptedRows: 2,
      excludedRows: 1,
      pendingRows: 1,
      newPeople: 1,
      matchedPeople: 1,
      jobsWithPositionId: 1,
      jobsMissingPositionId: 1,
      duesStandingRows: 1,
    });
  });

  it("ignores job and dues counts for general table datasets", () => {
    const impact = summarizePublishImpact(
      { kind: "table", fields: [{ id: "col_a", label: "A", type: "text", access: "officer" }] },
      { A: "col_a" },
      [{ decision: "accept", matchPersonId: null, rawValues: { A: "x" } }],
    );
    expect(impact).toMatchObject({
      acceptedRows: 1,
      newPeople: 0,
      jobsWithPositionId: 0,
      duesStandingRows: 0,
    });
  });
});
