import type { ModuleReferenceSheet, RelatedResourceLink } from "./types";
import { documentGeneratorPresetHref } from "@/lib/constants/document-generator-links";

/** Peer guides + steward prep tools for each Officer Learning module. */
export const MODULE_RELATED_RESOURCES: Record<string, RelatedResourceLink[]> = {
  "contract-enforcement": [
    { href: "/tools/complaint-vs-grievance", labelKey: "complaintVsGrievance", kind: "tool" },
    { href: "/guide/steward-101", labelKey: "steward101", kind: "guide" },
    { href: "/guide/grievance-process", labelKey: "grievanceProcess", kind: "guide" },
    {
      href: "/guide/officer-learning/advanced-grievance-settlement",
      labelKey: "settlementModule",
      kind: "guide",
    },
    {
      href: "/tools/qr-card?preset=stewardRepresentation",
      labelKey: "stewardPocketCard",
      kind: "pocket",
    },
    {
      href: documentGeneratorPresetHref("grievance-intake"),
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
    { href: "/guide/running-meetings", labelKey: "runningMeetings", kind: "guide" },
    { href: "/guide/union-history", labelKey: "unionHistory", kind: "guide" },
    {
      href: "/guide/land-acknowledgement",
      labelKey: "landAcknowledgement",
      kind: "guide",
    },
    { href: "/tools/rules-of-order", labelKey: "rulesOfOrder", kind: "tool" },
    { href: "/guide/bylaws", labelKey: "bylaws", kind: "guide" },
    { href: "/tools/bylaw-builder", labelKey: "bylawBuilder", kind: "tool" },
    { href: "/guide/joint-committee", labelKey: "jointCommittee", kind: "guide" },
    { href: "/tools/org-chart", labelKey: "orgChart", kind: "tool" },
    { href: "/tools/board-notice", labelKey: "boardNotice", kind: "tool" },
    { href: "/tools/document-generator", labelKey: "documentGenerator", kind: "tool" },
  ],
  "financial-health": [
    { href: "/tools/document-generator", labelKey: "documentGenerator", kind: "tool" },
    { href: "/guide/union-boards", labelKey: "unionBoards", kind: "guide" },
    {
      href: "/guide/officer-learning/advanced-local-finance",
      labelKey: "advancedFinanceModule",
      kind: "guide",
    },
  ],
  "building-collective-power": [
    { href: "/guide/workplace-mapping", labelKey: "workplaceMapping", kind: "guide" },
    { href: "/guide/bargaining", labelKey: "bargaining", kind: "guide" },
    { href: "/guide/strike", labelKey: "strikeOps", kind: "guide" },
    { href: "/tools/proposal-tracker", labelKey: "proposalTracker", kind: "tool" },
    { href: "/guide/membership-signup", labelKey: "membershipSignup", kind: "guide" },
    { href: "/guide/crisis", labelKey: "crisis", kind: "guide" },
    { href: "/tools/solidarity-poster", labelKey: "solidarityPoster", kind: "tool" },
    {
      href: "/guide/officer-learning/mobilizer-bargaining-partner",
      labelKey: "mobilizerModule",
      kind: "guide",
    },
  ],
  "mobilizer-bargaining-partner": [
    { href: "/guide/workplace-mapping", labelKey: "workplaceMapping", kind: "guide" },
    { href: "/guide/bargaining", labelKey: "bargaining", kind: "guide" },
    { href: "/guide/strike", labelKey: "strikeOps", kind: "guide" },
    { href: "/guide/membership-signup", labelKey: "membershipSignup", kind: "guide" },
    { href: "/tools/proposal-tracker", labelKey: "proposalTracker", kind: "tool" },
    { href: "/tools/solidarity-poster", labelKey: "solidarityPoster", kind: "tool" },
    {
      href: "/guide/officer-learning/building-collective-power",
      labelKey: "collectivePowerModule",
      kind: "guide",
    },
  ],
  "advanced-grievance-settlement": [
    { href: "/guide/grievance-process", labelKey: "grievanceProcess", kind: "guide" },
    { href: "/tools/complaint-vs-grievance", labelKey: "complaintVsGrievance", kind: "tool" },
    {
      href: documentGeneratorPresetHref("grievance-intake"),
      labelKey: "grievanceIntake",
      kind: "tool",
    },
    { href: "/guide/steward-101", labelKey: "steward101", kind: "guide" },
    {
      href: "/guide/officer-learning/contract-enforcement",
      labelKey: "contractEnforcementModule",
      kind: "guide",
    },
    {
      href: "/tools/qr-card?preset=stewardRepresentation",
      labelKey: "stewardPocketCard",
      kind: "pocket",
    },
  ],
  "benefits-disability-claims": [
    { href: "/tools/rtw-accommodation", labelKey: "rtwAccommodation", kind: "tool" },
    { href: "/guide/steward-101", labelKey: "steward101", kind: "guide" },
    { href: "/guide/officer-learning/human-rights-accommodation", labelKey: "humanRightsModule", kind: "guide" },
  ],
  "joint-workplace-committees": [
    { href: "/guide/joint-committee", labelKey: "jointCommittee", kind: "guide" },
    { href: "/guide/right-to-refuse", labelKey: "rightToRefuse", kind: "guide" },
    { href: "/tools/org-chart", labelKey: "orgChart", kind: "tool" },
    { href: "/guide/running-meetings", labelKey: "runningMeetings", kind: "guide" },
    { href: "/tools/board-notice", labelKey: "boardNotice", kind: "tool" },
  ],
  "membership-lists-privacy": [
    { href: "/guide/membership-signup", labelKey: "membershipSignup", kind: "guide" },
    { href: "/guide/photo-consent", labelKey: "photoConsent", kind: "guide" },
    { href: "/guide/officer-learning/digital-security-transitions", labelKey: "digitalSecurityModule", kind: "guide" },
    { href: "/guide/officer-learning/everyday-union-value", labelKey: "everydayValueModule", kind: "guide" },
  ],
  "advanced-local-finance": [
    { href: "/guide/officer-learning/financial-health", labelKey: "financialHealthModule", kind: "guide" },
    { href: "/tools/document-generator", labelKey: "documentGenerator", kind: "tool" },
    { href: "/guide/union-boards", labelKey: "unionBoards", kind: "guide" },
    { href: "/guide/bylaws", labelKey: "bylaws", kind: "guide" },
  ],
  "digital-security-transitions": [
    { href: "/guide/officer-learning/membership-lists-privacy", labelKey: "membershipListsModule", kind: "guide" },
    { href: "/guide/running-meetings", labelKey: "runningMeetings", kind: "guide" },
    { href: "/guide/bylaws", labelKey: "bylaws", kind: "guide" },
    { href: "/guide/officer-learning/democratic-governance", labelKey: "democraticGovernanceModule", kind: "guide" },
  ],
  "everyday-union-value": [
    { href: "/guide/membership-signup", labelKey: "membershipSignup", kind: "guide" },
    { href: "/guide/officer-learning/membership-lists-privacy", labelKey: "membershipListsModule", kind: "guide" },
    { href: "/guide/officer-learning/building-collective-power", labelKey: "collectivePowerModule", kind: "guide" },
    { href: "/guide/workplace-mapping", labelKey: "workplaceMapping", kind: "guide" },
    { href: "/tools/solidarity-poster", labelKey: "solidarityPoster", kind: "tool" },
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
      id: "discipline-rights",
      titleKey: "disciplineTitle",
      bodyKey: "disciplineBody",
      ctaKey: "disciplineCta",
    },
    {
      id: "floor-checklist",
      titleKey: "checklistTitle",
      bodyKey: "checklistBody",
      ctaKey: "checklistCta",
    },
  ],
  "human-rights-accommodation": [
    {
      id: "meiorin-sheet",
      titleKey: "meiorinTitle",
      bodyKey: "meiorinBody",
      ctaKey: "meiorinCta",
    },
    {
      id: "floor-checklist",
      titleKey: "checklistTitle",
      bodyKey: "checklistBody",
      ctaKey: "checklistCta",
    },
  ],
  "democratic-governance": [
    {
      id: "quorum-motion",
      titleKey: "quorumTitle",
      bodyKey: "quorumBody",
      ctaKey: "quorumCta",
    },
    {
      id: "floor-checklist",
      titleKey: "checklistTitle",
      bodyKey: "checklistBody",
      ctaKey: "checklistCta",
    },
  ],
  "financial-health": [
    {
      id: "audit-controls",
      titleKey: "auditTitle",
      bodyKey: "auditBody",
      ctaKey: "auditCta",
    },
    {
      id: "floor-checklist",
      titleKey: "checklistTitle",
      bodyKey: "checklistBody",
      ctaKey: "checklistCta",
    },
  ],
  "building-collective-power": [
    {
      id: "equity-clause",
      titleKey: "equityTitle",
      bodyKey: "equityBody",
      ctaKey: "equityCta",
    },
    {
      id: "floor-checklist",
      titleKey: "checklistTitle",
      bodyKey: "checklistBody",
      ctaKey: "checklistCta",
    },
  ],
  "mobilizer-bargaining-partner": [
    {
      id: "workplace-map",
      titleKey: "mapTitle",
      bodyKey: "mapBody",
      ctaKey: "mapCta",
    },
    {
      id: "floor-checklist",
      titleKey: "checklistTitle",
      bodyKey: "checklistBody",
      ctaKey: "checklistCta",
    },
  ],
  "advanced-grievance-settlement": [
    {
      id: "settlement-corners",
      titleKey: "settlementTitle",
      bodyKey: "settlementBody",
      ctaKey: "settlementCta",
    },
    {
      id: "floor-checklist",
      titleKey: "checklistTitle",
      bodyKey: "checklistBody",
      ctaKey: "checklistCta",
    },
  ],
  "benefits-disability-claims": [
    {
      id: "medical-privacy",
      titleKey: "privacyTitle",
      bodyKey: "privacyBody",
      ctaKey: "privacyCta",
    },
    {
      id: "floor-checklist",
      titleKey: "checklistTitle",
      bodyKey: "checklistBody",
      ctaKey: "checklistCta",
    },
  ],
  "joint-workplace-committees": [
    {
      id: "caucus-briefing",
      titleKey: "caucusTitle",
      bodyKey: "caucusBody",
      ctaKey: "caucusCta",
    },
    {
      id: "floor-checklist",
      titleKey: "checklistTitle",
      bodyKey: "checklistBody",
      ctaKey: "checklistCta",
    },
  ],
  "membership-lists-privacy": [
    {
      id: "list-directive",
      titleKey: "listTitle",
      bodyKey: "listBody",
      ctaKey: "listCta",
    },
    {
      id: "floor-checklist",
      titleKey: "checklistTitle",
      bodyKey: "checklistBody",
      ctaKey: "checklistCta",
    },
  ],
  "advanced-local-finance": [
    {
      id: "expense-hardship",
      titleKey: "expenseTitle",
      bodyKey: "expenseBody",
      ctaKey: "expenseCta",
    },
    {
      id: "floor-checklist",
      titleKey: "checklistTitle",
      bodyKey: "checklistBody",
      ctaKey: "checklistCta",
    },
  ],
  "digital-security-transitions": [
    {
      id: "transition-checklist",
      titleKey: "transitionTitle",
      bodyKey: "transitionBody",
      ctaKey: "transitionCta",
    },
    {
      id: "floor-checklist",
      titleKey: "checklistTitle",
      bodyKey: "checklistBody",
      ctaKey: "checklistCta",
    },
  ],
  "everyday-union-value": [
    {
      id: "orientation-kit",
      titleKey: "orientationTitle",
      bodyKey: "orientationBody",
      ctaKey: "orientationCta",
    },
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
