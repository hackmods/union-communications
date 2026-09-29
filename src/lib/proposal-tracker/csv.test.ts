import { describe, expect, it } from "vitest";
import {
  parseProposalTrackerCsv,
  serializeProposalTrackerCsv,
} from "./csv";
import type { ProposalRow } from "./types";

const sampleRows: ProposalRow[] = [
  {
    id: "1",
    article: "Article 12.01",
    currentLanguage: "Hours of work are 35 per week.",
    unionProposal: 'Include "flex" language',
    employerCounter: "No change,\nstatus quo",
    status: "open",
    notes: "Priority wage package",
  },
  {
    id: "2",
    article: "Article 20",
    currentLanguage: "",
    unionProposal: "Add bereavement leave",
    employerCounter: "",
    status: "tentativelyAgreed",
    notes: "",
  },
];

describe("serializeProposalTrackerCsv", () => {
  it("writes a header and escaped cells", () => {
    const csv = serializeProposalTrackerCsv(sampleRows);
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

describe("parseProposalTrackerCsv", () => {
  it("round-trips export output with fresh ids", () => {
    const csv = serializeProposalTrackerCsv(sampleRows);
    const parsed = parseProposalTrackerCsv(csv);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0]?.id).not.toBe("1");
    expect(parsed.rows[0]).toMatchObject({
      article: "Article 12.01",
      unionProposal: 'Include "flex" language',
      employerCounter: "No change,\nstatus quo",
      status: "open",
      notes: "Priority wage package",
    });
    expect(parsed.rows[1]).toMatchObject({
      article: "Article 20",
      status: "tentativelyAgreed",
    });
  });

  it("rejects missing header columns", () => {
    expect(parseProposalTrackerCsv("foo,bar\n1,2\n")).toEqual({
      ok: false,
      code: "invalidCsv",
    });
  });

  it("rejects header-only or blank files", () => {
    expect(
      parseProposalTrackerCsv(
        "article,currentLanguage,unionProposal,employerCounter,status,notes\n",
      ),
    ).toEqual({ ok: false, code: "empty" });
    expect(parseProposalTrackerCsv("")).toEqual({ ok: false, code: "empty" });
  });

  it("defaults unknown status to open and skips blank rows", () => {
    const csv = [
      "article,currentLanguage,unionProposal,employerCounter,status,notes",
      "Art 1,,Keep language,,WEIRD,",
      ",,,,,",
    ].join("\n");
    const parsed = parseProposalTrackerCsv(csv);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]?.status).toBe("open");
  });

  it("accepts BOM and case-insensitive headers", () => {
    const csv =
      "\uFEFFarticle,CurrentLanguage,UnionProposal,EmployerCounter,Status,Notes\nA,,B,,,";
    const parsed = parseProposalTrackerCsv(csv);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.rows[0]).toMatchObject({ article: "A", unionProposal: "B" });
  });
});
