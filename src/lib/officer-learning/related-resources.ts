import type { ModuleReferenceSheet, RelatedResourceLink } from "./types";

/** Peer guides + steward prep tools for each Officer Learning module. */
export const MODULE_RELATED_RESOURCES: Record<string, RelatedResourceLink[]> = {
  "contract-enforcement": [
    { href: "/tools/complaint-vs-grievance", labelKey: "complaintVsGrievance", kind: "tool" },
    { href: "/guide/steward-101", labelKey: "steward101", kind: "guide" },
    { href: "/guide/grievance-process", labelKey: "grievanceProcess", kind: "guide" },
    {
      href: "/tools/qr-card?preset=stewardRepresentation",
      labelKey: "stewardPocketCard",
      kind: "pocket",
    },
    {
      href: "/tools/document-generator?preset=grievance-intake",
      labelKey: "grievanceIntake",
      kind: "tool",
    },
  ],
  "progressive-discipline": [
    { href: "/tools/pre-disciplinary-log", labelKey: "preDisciplinaryLog", kind: "tool" },
    { href: "/guide/steward-101", labelKey: "steward101", kind: "guide" },
    { href: "/guide/grievance-process", labelKey: "grievanceProcess", kind: "guide" },
    {
      href: "/tools/qr-card?preset=stewardRepresentation",
      labelKey: "stewardPocketCard",
      kind: "pocket",
    },
  ],
  "human-rights-accommodation": [
    { href: "/tools/rtw-accommodation", labelKey: "rtwAccommodation", kind: "tool" },
    { href: "/guide/steward-101", labelKey: "steward101", kind: "guide" },
    { href: "/guide/photo-consent", labelKey: "photoConsent", kind: "guide" },
  ],
  "democratic-governance": [
    { href: "/guide/joint-committee", labelKey: "jointCommittee", kind: "guide" },
    { href: "/tools/org-chart", labelKey: "orgChart", kind: "tool" },
    { href: "/tools/board-notice", labelKey: "boardNotice", kind: "tool" },
    { href: "/tools/document-generator", labelKey: "documentGenerator", kind: "tool" },
  ],
  "financial-health": [
    { href: "/tools/document-generator", labelKey: "documentGenerator", kind: "tool" },
    { href: "/guide", labelKey: "blueprint", kind: "guide" },
  ],
  "building-collective-power": [
    { href: "/guide/workplace-mapping", labelKey: "workplaceMapping", kind: "guide" },
    { href: "/guide/membership-signup", labelKey: "membershipSignup", kind: "guide" },
    { href: "/guide/crisis", labelKey: "crisis", kind: "guide" },
  ],
};

export const MODULE_REFERENCE_SHEETS: Record<string, ModuleReferenceSheet[]> = {
  "contract-enforcement": [
    {
      id: "far-sheet",
      titleKey: "farTitle",
      bodyKey: "farBody",
      ctaKey: "farCta",
    },
    {
      id: "floor-checklist",
      titleKey: "checklistTitle",
      bodyKey: "checklistBody",
      ctaKey: "checklistCta",
    },
  ],
  "progressive-discipline": [
    {
      id: "floor-checklist",
      titleKey: "checklistTitle",
      bodyKey: "checklistBody",
      ctaKey: "checklistCta",
    },
  ],
  "human-rights-accommodation": [
    {
      id: "floor-checklist",
      titleKey: "checklistTitle",
      bodyKey: "checklistBody",
      ctaKey: "checklistCta",
    },
  ],
  "democratic-governance": [
    {
      id: "floor-checklist",
      titleKey: "checklistTitle",
      bodyKey: "checklistBody",
      ctaKey: "checklistCta",
    },
  ],
  "financial-health": [
    {
      id: "floor-checklist",
      titleKey: "checklistTitle",
      bodyKey: "checklistBody",
      ctaKey: "checklistCta",
    },
  ],
  "building-collective-power": [
    {
      id: "floor-checklist",
      titleKey: "checklistTitle",
      bodyKey: "checklistBody",
      ctaKey: "checklistCta",
    },
  ],
};

export function getRelatedResources(slug: string): RelatedResourceLink[] {
  return MODULE_RELATED_RESOURCES[slug] ?? [];
}

export function getReferenceSheets(slug: string): ModuleReferenceSheet[] {
  return MODULE_REFERENCE_SHEETS[slug] ?? [];
}
