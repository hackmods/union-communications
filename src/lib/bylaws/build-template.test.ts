import { describe, expect, it } from "vitest";
import {
  BYLAW_PRESETS,
  buildBylawTemplate,
  buildBylawArticleMap,
  bylawDownloadBasename,
  createEmptyBylawForm,
  defaultArticleSetForPreset,
  isBylawDraft,
  isBylawFormValues,
  normalizeBylawPresetId,
  type BylawTemplateLabels,
} from "./build-template";
import { applyBylawPreset } from "./presets";

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
    meetings: "Article 7: Meetings. The Local shall meet {meetingFrequency}.",
    elections: "Article 8: Elections. Officers serve {electionTerm} terms.",
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

const opseuArticles = {
  ...labels.articles,
  amendments:
    "Article 12: Amendments. Notice: {amendmentNotice}. Two-thirds vote at a quorate GMM and OPSEU / SEFPO National President approval.",
};

describe("buildBylawTemplate", () => {
  it("injects OPSEU CAAT preset values", () => {
    const text = buildBylawTemplate(BYLAW_PRESETS.opseuCaat, labels, {
      articleSet: "opseu",
      opseuArticles,
    });

    expect(text).toContain("OPSEU / SEFPO Local 243");
    expect(text).toContain("2 Vice-President(s)");
    expect(text).toContain("One steward per campus unit");
    expect(text).toContain("25 members in good standing or 10%");
    expect(text).toContain("National President approval");
    expect(text).toContain("March 31");
  });

  it("honours article overrides", () => {
    const text = buildBylawTemplate(createEmptyBylawForm(), labels, {
      articleOverrides: {
        quorum: "Article 6: Quorum. Custom quorum text.",
      },
    });
    expect(text).toContain("Custom quorum text.");
  });

  it("falls back to placeholders when fields are blank", () => {
    const text = buildBylawTemplate(createEmptyBylawForm(), labels);

    expect(text).toContain("[Local Union Name & Number]");
    expect(text).toContain("1 Vice-President(s)");
  });

  it("builds per-article map for committee mode", () => {
    const map = buildBylawArticleMap(BYLAW_PRESETS.small, labels);
    expect(Object.keys(map)).toHaveLength(13);
    expect(map.name).toContain("Local 123");
  });
});

describe("presets", () => {
  it("uses Brand Kit local number for OPSEU presets", () => {
    const applied = applyBylawPreset("opseuCaat", {
      local: { id: "local-567", localNumber: "567", subText: "Demo" },
      unionName: "OPSEU / SEFPO",
      unionPresetId: "opseu",
    });
    expect(applied.localName).toBe("OPSEU / SEFPO Local 567");
    expect(applied.articleSet).toBe("opseu");
  });

  it("defaults OPSEU article set for campus presets", () => {
    expect(defaultArticleSetForPreset("opseuCaat")).toBe("opseu");
    expect(normalizeBylawPresetId("campus")).toBe("opseuCaat");
  });
});

describe("bylaw download helpers", () => {
  it("slugifies a local name", () => {
    expect(bylawDownloadBasename("OPSEU / SEFPO Local 123")).toBe(
      "opseu-sefpo-local-123-bylaws-draft",
    );
  });
});

describe("isBylawDraft", () => {
  it("accepts extended drafts", () => {
    expect(
      isBylawDraft({
        ...BYLAW_PRESETS.small,
        mode: "committee",
        articleSet: "opseu",
        articleOverrides: {},
        committeeNotes: { quorum: "Review with LEC" },
        existingBylaws: "",
      }),
    ).toBe(true);
  });

  it("rejects incomplete objects", () => {
    expect(isBylawFormValues(BYLAW_PRESETS.small)).toBe(true);
    expect(isBylawDraft(BYLAW_PRESETS.small)).toBe(false);
  });
});
