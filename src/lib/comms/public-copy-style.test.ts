import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";

const PUBLIC_NS = [
  "metadata",
  "home",
  "socialMediaPlan",
  "resources",
  "workshopDemo",
  "workshopGuide",
  "toolsIndex",
  "guide",
  "boardNotice",
  "boardBanner",
  "resizer",
  "documentGenerator",
  "solidarityPoster",
  "meetingBackground",
  "qrCard",
  "actionCard",
  "pulsePoll",
  "qrBoard",
  "graphicMaker",
  "quoteCard",
  "flyerMaker",
  "altTextAssistant",
  "websiteTemplate",
  "logoBuilder",
  "brandKit",
  "assets",
  "sources",
  "examples",
  "captions",
  "manifesto",
  "supportPage",
  "accessibility",
  "installPage",
  "onboarding",
  "unionBoardsGuide",
  "printGuide",
  "websiteGuide",
  "emailBroadcastGuide",
  "photoConsentGuide",
  "crisisGuide",
  "membershipSignupGuide",
  "dfrGuide",
  "seniorityGuide",
  "rightToRefuseGuide",
  "pollPublic",
  "pollPlaceholder",
  "common",
  "routeUi",
  "footer",
  "relatedTools",
  "privacyPage",
] as const;

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function emDashCount(s: string): number {
  return (s.match(/\u2014/g) ?? []).length;
}

describe("public Comms copy style", () => {
  it("exposes shared Brand Kit nudge + privacy page keys in EN and FR", () => {
    expect(en.common.setupBrandPrompt).toBeTruthy();
    expect(en.common.setupBrandLink).toBeTruthy();
    expect(fr.common.setupBrandPrompt).toBeTruthy();
    expect(fr.common.setupBrandLink).toBeTruthy();
    expect(en.privacyPage.title).toBeTruthy();
    expect(fr.privacyPage.title).toBeTruthy();
  });

  it("keeps Brand Kit nudge on common, not duplicated on canvas tools", () => {
    const tools = [
      "boardNotice",
      "boardBanner",
      "resizer",
      "solidarityPoster",
      "meetingBackground",
      "qrCard",
      "actionCard",
      "pulsePoll",
      "qrBoard",
      "graphicMaker",
      "quoteCard",
      "flyerMaker",
    ] as const;
    for (const ns of tools) {
      expect(
        (en as Record<string, { setupBrandPrompt?: string }>)[ns]
          .setupBrandPrompt,
      ).toBeUndefined();
      expect(
        (fr as Record<string, { setupBrandPrompt?: string }>)[ns]
          .setupBrandPrompt,
      ).toBeUndefined();
    }
    // Doc-gen keeps a letterhead-specific override.
    expect(en.documentGenerator.setupBrandPrompt).toBeTruthy();
    expect(fr.documentGenerator.setupBrandPrompt).toBeTruthy();
  });

  it("keeps key lead copy short", () => {
    expect(wordCount(en.home.subtitle)).toBeLessThanOrEqual(20);
    expect(wordCount(en.socialMediaPlan.intro)).toBeLessThanOrEqual(35);
    expect(wordCount(en.resources.intro)).toBeLessThanOrEqual(28);
    expect(wordCount(en.boardBanner.subtitle)).toBeLessThanOrEqual(16);
    expect(wordCount(en.actionCard.subtitle)).toBeLessThanOrEqual(18);
    expect(wordCount(en.websiteTemplate.referenceNote)).toBeLessThanOrEqual(40);
  });

  // Deliberately no blanket per-leaf word ceiling. It optimized for brevity
  // over clarity and rewarded clipping subjects/verbs out of body copy
  // ("Prefer Install when it appears."). Body tips and guide paragraphs
  // should read as complete sentences; only named lead fields are kept short
  // above, and em-dash stacking is capped below.

  it("allows at most one em dash on public tool/guide lead fields", () => {
    const leads: string[] = [];
    for (const ns of PUBLIC_NS) {
      const block = (en as Record<string, unknown>)[ns];
      if (!block || typeof block !== "object") continue;
      const rec = block as Record<string, unknown>;
      for (const key of ["subtitle", "intro", "description", "whenToUse"]) {
        const v = rec[key];
        if (typeof v === "string") leads.push(`${ns}.${key}: ${v}`);
      }
    }
    const crowded = leads.filter((line) => emDashCount(line) > 1);
    expect(crowded, crowded.join("\n")).toEqual([]);
  });
});
