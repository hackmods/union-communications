/**
 * Shared namespace lists for public Comms + Officer Hub copy guards.
 * Keep in sync: readability report and public-copy-style tests both import these.
 */

export const PUBLIC_NS = [
  "metadata",
  // nav carries the locked tool names, so it belongs in the locked-term and
  // French-quality sweeps.
  "nav",
  "share",
  "consent",
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
  "orgChart",
  "graphicMaker",
  "quoteCard",
  "flyerMaker",
  "altTextAssistant",
  "websiteTemplate",
  "logoBuilder",
  "brandKit",
  "rtwAccommodation",
  "preDisciplinaryLog",
  "complaintVsGrievance",
  "stewardGuidesShared",
  // Brand Kit editors on the public /brand-kit page (not Hub-only).
  "localLinks",
  "membershipUrls",
  "assets",
  "sources",
  "examples",
  "captions",
  "manifesto",
  "updates",
  "supportPage",
  "accessibility",
  "installPage",
  "onboarding",
  "unionBoardsGuide",
  "printGuide",
  "websiteGuide",
  "emailBroadcastGuide",
  "shortFormGuide",
  "photoConsentGuide",
  "crisisGuide",
  "membershipSignupGuide",
  "dfrGuide",
  "grievanceGuide",
  "workplaceMappingGuide",
  "seniorityGuide",
  "jointCommitteeGuide",
  "rightToRefuseGuide",
  "pollPublic",
  "pollPlaceholder",
  // Token pages members reach without signing in.
  "rsvpPublic",
  "meetingPublic",
  "common",
  "routeUi",
  "footer",
  "relatedTools",
  "privacyPage",
  "feedbackPage",
] as const;

/**
 * Authenticated Officer Hub namespaces. Kept separate from PUBLIC_NS so
 * public-only rules (e.g. flyer→tract) stay public-only. See
 * docs/audit/hub-copy-qol-2026-08.md.
 */
export const HUB_NS = [
  "hub",
  "tenantOnboarding",
  "invites",
  "inviteAccept",
  "passwordReset",
  "ledger",
  "travel",
  "expenses",
  "hubPolls",
  "meetings",
  "meetingsRsvp",
  "officers",
  "committees",
  "elections",
  "informalLog",
  "stewardGuidesHub",
  "minutes",
  "discussions",
  "hubSocial",
  "checkins",
  "tasks",
  "hybrid",
  "documents",
  "qol",
  "grievance",
  "bumping",
  "time",
  "portal",
] as const;

export type CopyLeaf = readonly [path: string, value: string];

/** Every string leaf under the given namespaces, as `ns.a.b` paths. */
export function leavesFor(
  catalog: Record<string, unknown>,
  namespaces: readonly string[],
): CopyLeaf[] {
  const out: CopyLeaf[] = [];
  const walk = (node: Record<string, unknown>, prefix: string) => {
    for (const [key, value] of Object.entries(node)) {
      const path = `${prefix}.${key}`;
      if (typeof value === "string") out.push([path, value]);
      else if (value && typeof value === "object") {
        walk(value as Record<string, unknown>, path);
      }
    }
  };
  for (const ns of namespaces) {
    const block = catalog[ns];
    if (block && typeof block === "object") {
      walk(block as Record<string, unknown>, ns);
    }
  }
  return out;
}

export function publicLeaves(catalog: Record<string, unknown>): CopyLeaf[] {
  return leavesFor(catalog, PUBLIC_NS);
}

export function hubLeaves(catalog: Record<string, unknown>): CopyLeaf[] {
  return leavesFor(catalog, HUB_NS);
}

export function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}
