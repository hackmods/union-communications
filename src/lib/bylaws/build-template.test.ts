import { describe, expect, it } from "vitest";
import {
  BYLAW_PRESETS,
  buildBylawTemplate,
  bylawDownloadBasename,
  bylawDownloadFilename,
  createEmptyBylawForm,
  isBylawFormValues,
  type BylawTemplateLabels,
} from "./build-template";

const labels: BylawTemplateLabels = {
  placeholders: {
    localName: "[Local Union Name & Number]",
    vicePresidents: "[Number]",
    stewards: "[Steward structure]",
    gmmQuorum: "[GMM Quorum Number]",
    lecQuorum: "[LEC Quorum Number]",
    signingOfficers: "[Signing officers]",
    trustees: "[Trustees]",
    meetingFrequency: "[Meeting frequency]",
    electionTerm: "[Election term]",
    amendmentNotice: "[Amendment notice]",
    fiscalYearEnd: "[Fiscal Year End Date]",
  },
  articles: {
    name: "Article 1: Name. This organization shall be known as {localName}.",
    purpose: "Article 2: Purpose. The Local shall advance members of {localName}.",
    membership: "Article 3: Membership. Members in good standing of {localName}.",
    executive:
      "Article 4: Executive. The LEC shall consist of the President, {vicePresidents} Vice-President(s), Secretary, Treasurer, and the Chief Steward.",
    stewards: "Article 5: Stewards. Steward structure: {stewards}.",
    quorum:
      "Article 6: Quorum. GMM quorum shall be {gmmQuorum}. LEC quorum shall be {lecQuorum}.",
    meetings:
      "Article 7: Meetings. The Local shall meet {meetingFrequency}.",
    elections:
      "Article 8: Elections. Officers serve {electionTerm} terms.",
    finances:
      "Article 9: Finances. Signing officers: {signingOfficers}. Fiscal year ends {fiscalYearEnd}.",
    trustees: "Article 10: Trustees. {trustees}.",
    committees:
      "Article 11: Committees. The LEC may establish standing and special committees.",
    amendments:
      "Article 12: Amendments. Notice: {amendmentNotice}. Two-thirds vote at a quorate GMM.",
    conflict:
      "Article 13: Conflict. These bylaws yield to the national constitution.",
  },
};

describe("buildBylawTemplate", () => {
  it("injects form values into articles", () => {
    const text = buildBylawTemplate(BYLAW_PRESETS.campus, labels);

    expect(text).toContain("OPSEU / SEFPO Local 243");
    expect(text).toContain("2 Vice-President(s)");
    expect(text).toContain("One steward per campus unit");
    expect(text).toContain("25 members or 10%");
    expect(text).toContain("President and Treasurer");
    expect(text).toContain("Three elected trustees who are not signing officers");
    expect(text).toContain("21 days written notice");
    expect(text).toContain("March 31");
  });

  it("falls back to placeholders when fields are blank", () => {
    const text = buildBylawTemplate(createEmptyBylawForm(), labels);

    expect(text).toContain("[Local Union Name & Number]");
    // Empty form seeds vicePresidents to "1" as a sensible default.
    expect(text).toContain("1 Vice-President(s)");
    expect(text).toContain("[Signing officers]");
    expect(text).toContain("[Amendment notice]");
  });

  it("keeps fiscal year only in the finances article for presets", () => {
    const text = buildBylawTemplate(BYLAW_PRESETS.small, labels);
    const fiscalMatches = text.match(/December 31/g) ?? [];
    expect(fiscalMatches).toHaveLength(1);
  });
});

describe("bylaw download helpers", () => {
  it("slugifies a local name", () => {
    expect(bylawDownloadBasename("OPSEU / SEFPO Local 123")).toBe(
      "opseu-sefpo-local-123-bylaws-draft",
    );
    expect(bylawDownloadFilename("OPSEU / SEFPO Local 123")).toBe(
      "opseu-sefpo-local-123-bylaws-draft.txt",
    );
  });

  it("uses a generic name when blank", () => {
    expect(bylawDownloadFilename("")).toBe("local-bylaws-draft.txt");
  });
});

describe("isBylawFormValues", () => {
  it("accepts complete string forms", () => {
    expect(isBylawFormValues(BYLAW_PRESETS.small)).toBe(true);
  });

  it("rejects incomplete objects", () => {
    expect(isBylawFormValues({ localName: "x" })).toBe(false);
    expect(isBylawFormValues(null)).toBe(false);
  });
});
