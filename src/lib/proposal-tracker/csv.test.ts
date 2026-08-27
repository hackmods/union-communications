import { describe, expect, it } from "vitest";
import { serializeProposalTrackerCsv } from "./csv";
import type { ProposalRow } from "./types";

describe("serializeProposalTrackerCsv", () => {
  it("writes a header and escaped cells", () => {
    const rows: ProposalRow[] = [
      {
        id: "1",
        article: "Article 12.01",
        currentLanguage: "Hours of work are 35 per week.",
        unionProposal: 'Include "flex" language',
        employerCounter: "No change,\nstatus quo",
        status: "open",
        notes: "Priority wage package",
      },
    ];
    const csv = serializeProposalTrackerCsv(rows);
    expect(csv.startsWith("article,currentLanguage,unionProposal,")).toBe(
      true,
    );
    expect(csv).toContain("Article 12.01");
    expect(csv).toContain('"Include ""flex"" language"');
    expect(csv).toContain('"No change,\nstatus quo"');
    expect(csv).toContain("open");
  });

  it("handles an empty list", () => {
    expect(serializeProposalTrackerCsv([])).toBe(
      "article,currentLanguage,unionProposal,employerCounter,status,notes",
    );
  });
});
