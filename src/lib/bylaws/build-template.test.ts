import { describe, expect, it } from "vitest";
import {
  buildBylawTemplate,
  bylawDownloadFilename,
  type BylawTemplateLabels,
} from "./build-template";

const labels: BylawTemplateLabels = {
  placeholders: {
    localName: "[Local Union Name & Number]",
    vicePresidents: "[Number]",
    stewards: "[Steward structure]",
    gmmQuorum: "[GMM Quorum Number]",
    lecQuorum: "[LEC Quorum Number]",
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
    meetings: "Article 7: Meetings. Fiscal year ends {fiscalYearEnd}.",
    elections: "Article 8: Elections. Officers elected per these bylaws.",
    finances:
      "Article 9: Finances. Two signing officers; fiscal year ends {fiscalYearEnd}.",
    amendments: "Article 10: Amendments. Notice, GMM quorum, two-thirds vote.",
    conflict:
      "Article 11: Conflict. These bylaws yield to the national constitution.",
  },
};

describe("buildBylawTemplate", () => {
  it("injects form values into articles", () => {
    const text = buildBylawTemplate(
      {
        localName: "OPSEU Local 123",
        vicePresidents: "2",
        stewards: "One per department",
        gmmQuorum: "15 members",
        lecQuorum: "50% of the executive",
        fiscalYearEnd: "December 31",
      },
      labels,
    );

    expect(text).toContain("OPSEU Local 123");
    expect(text).toContain("2 Vice-President(s)");
    expect(text).toContain("One per department");
    expect(text).toContain("15 members");
    expect(text).toContain("50% of the executive");
    expect(text).toContain("December 31");
  });

  it("falls back to placeholders when fields are blank", () => {
    const text = buildBylawTemplate(
      {
        localName: "  ",
        vicePresidents: "",
        stewards: "",
        gmmQuorum: "",
        lecQuorum: "",
        fiscalYearEnd: "",
      },
      labels,
    );

    expect(text).toContain("[Local Union Name & Number]");
    expect(text).toContain("[Number] Vice-President(s)");
    expect(text).toContain("[GMM Quorum Number]");
  });
});

describe("bylawDownloadFilename", () => {
  it("slugifies a local name", () => {
    expect(bylawDownloadFilename("OPSEU Local 123")).toBe(
      "opseu-local-123-bylaws-draft.txt",
    );
  });

  it("uses a generic name when blank", () => {
    expect(bylawDownloadFilename("")).toBe("local-bylaws-draft.txt");
  });
});
