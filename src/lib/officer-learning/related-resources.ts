import type { ModuleReferenceSheet, RelatedResourceLink } from "./types";
import { documentGeneratorPresetHref } from "@/lib/constants/document-generator-links";
import { canonicalizePublicHref } from "@/lib/seo/public-routes";

/** Peer guides + steward prep tools for each Officer Learning module. */
export const MODULE_RELATED_RESOURCES: Record<string, RelatedResourceLink[]> = {
  "contract-enforcement": [
    { href: "/utilities/complaint-vs-grievance", labelKey: "complaintVsGrievance", kind: "tool" },
    { href: "/learn/steward-101", labelKey: "steward101", kind: "guide" },
    { href: "/learn/grievance-process", labelKey: "grievanceProcess", kind: "guide" },
    {
      href: "/learn/officer/duty-of-fair-representation",
      labelKey: "dfrModule",
      kind: "guide",
    },
    {
      href: "/learn/officer/advanced-grievance-settlement",
      labelKey: "settlementModule",
      kind: "guide",
    },
    {
      href: "/create/qr-card?preset=stewardRepresentation",
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
    { href: "/utilities/pre-disciplinary-log", labelKey: "preDisciplinaryLog", kind: "tool" },
    { href: "/learn/steward-101", labelKey: "steward101", kind: "guide" },
    { href: "/learn/grievance-process", labelKey: "grievanceProcess", kind: "guide" },
    {
      href: "/create/qr-card?preset=stewardRepresentation",
      labelKey: "stewardPocketCard",
      kind: "pocket",
    },
  ],
  "human-rights-accommodation": [
    { href: "/utilities/rtw-accommodation", labelKey: "rtwAccommodation", kind: "tool" },
    { href: "/learn/steward-101", labelKey: "steward101", kind: "guide" },
    {
      href: "/learn/officer/benefits-disability-claims",
      labelKey: "benefitsDisabilityModule",
      kind: "guide",
    },
  ],
  "democratic-governance": [
    { href: "/learn/running-meetings", labelKey: "runningMeetings", kind: "guide" },
    { href: "/learn/union-history", labelKey: "unionHistory", kind: "guide" },
    {
      href: "/learn/land-acknowledgement",
      labelKey: "landAcknowledgement",
      kind: "guide",
    },
    { href: "/utilities/rules-of-order", labelKey: "rulesOfOrder", kind: "tool" },
    { href: "/learn/bylaws", labelKey: "bylaws", kind: "guide" },
    { href: "/utilities/bylaw-builder", labelKey: "bylawBuilder", kind: "tool" },
    { href: "/learn/joint-committee", labelKey: "jointCommittee", kind: "guide" },
    { href: "/create/org-chart", labelKey: "orgChart", kind: "tool" },
    { href: "/create/board-notice", labelKey: "boardNotice", kind: "tool" },
    { href: "/create/document-generator", labelKey: "documentGenerator", kind: "tool" },
  ],
  "financial-health": [
    { href: "/create/document-generator", labelKey: "documentGenerator", kind: "tool" },
    { href: "/learn/union-boards", labelKey: "unionBoards", kind: "guide" },
    {
      href: "/learn/officer/advanced-local-finance",
      labelKey: "advancedFinanceModule",
      kind: "guide",
    },
  ],
  "building-collective-power": [
    { href: "/learn/workplace-mapping", labelKey: "workplaceMapping", kind: "guide" },
    { href: "/learn/bargaining", labelKey: "bargaining", kind: "guide" },
    { href: "/learn/strike", labelKey: "strikeOps", kind: "guide" },
    { href: "/utilities/proposal-tracker", labelKey: "proposalTracker", kind: "tool" },
    { href: "/learn/membership-signup", labelKey: "membershipSignup", kind: "guide" },
    { href: "/learn/crisis", labelKey: "crisis", kind: "guide" },
    { href: "/create/solidarity-poster", labelKey: "solidarityPoster", kind: "tool" },
    {
      href: "/learn/officer/mobilizer-bargaining-partner",
      labelKey: "mobilizerModule",
      kind: "guide",
    },
  ],
  "mobilizer-bargaining-partner": [
    { href: "/learn/workplace-mapping", labelKey: "workplaceMapping", kind: "guide" },
    { href: "/learn/bargaining", labelKey: "bargaining", kind: "guide" },
    { href: "/learn/strike", labelKey: "strikeOps", kind: "guide" },
    { href: "/learn/membership-signup", labelKey: "membershipSignup", kind: "guide" },
    { href: "/utilities/proposal-tracker", labelKey: "proposalTracker", kind: "tool" },
    { href: "/create/solidarity-poster", labelKey: "solidarityPoster", kind: "tool" },
    {
      href: "/learn/officer/building-collective-power",
      labelKey: "collectivePowerModule",
      kind: "guide",
    },
  ],
  "advanced-grievance-settlement": [
    { href: "/learn/grievance-process", labelKey: "grievanceProcess", kind: "guide" },
    { href: "/utilities/complaint-vs-grievance", labelKey: "complaintVsGrievance", kind: "tool" },
    {
      href: documentGeneratorPresetHref("grievance-intake"),
      labelKey: "grievanceIntake",
      kind: "tool",
    },
    { href: "/learn/steward-101", labelKey: "steward101", kind: "guide" },
    {
      href: "/learn/officer/contract-enforcement",
      labelKey: "contractEnforcementModule",
      kind: "guide",
    },
    {
      href: "/create/qr-card?preset=stewardRepresentation",
      labelKey: "stewardPocketCard",
      kind: "pocket",
    },
  ],
  "benefits-disability-claims": [
    { href: "/utilities/rtw-accommodation", labelKey: "rtwAccommodation", kind: "tool" },
    { href: "/learn/steward-101", labelKey: "steward101", kind: "guide" },
    { href: "/learn/officer/human-rights-accommodation", labelKey: "humanRightsModule", kind: "guide" },
  ],
  "joint-workplace-committees": [
    { href: "/learn/joint-committee", labelKey: "jointCommittee", kind: "guide" },
    { href: "/learn/right-to-refuse", labelKey: "rightToRefuse", kind: "guide" },
    { href: "/create/org-chart", labelKey: "orgChart", kind: "tool" },
    { href: "/learn/running-meetings", labelKey: "runningMeetings", kind: "guide" },
    { href: "/create/board-notice", labelKey: "boardNotice", kind: "tool" },
  ],
  "membership-lists-privacy": [
    { href: "/learn/membership-signup", labelKey: "membershipSignup", kind: "guide" },
    { href: "/learn/photo-consent", labelKey: "photoConsent", kind: "guide" },
    { href: "/learn/officer/digital-security-transitions", labelKey: "digitalSecurityModule", kind: "guide" },
    { href: "/learn/officer/everyday-union-value", labelKey: "everydayValueModule", kind: "guide" },
  ],
  "advanced-local-finance": [
    { href: "/learn/officer/financial-health", labelKey: "financialHealthModule", kind: "guide" },
    { href: "/create/document-generator", labelKey: "documentGenerator", kind: "tool" },
    { href: "/learn/union-boards", labelKey: "unionBoards", kind: "guide" },
    { href: "/learn/bylaws", labelKey: "bylaws", kind: "guide" },
  ],
  "digital-security-transitions": [
    { href: "/learn/officer/membership-lists-privacy", labelKey: "membershipListsModule", kind: "guide" },
    { href: "/learn/running-meetings", labelKey: "runningMeetings", kind: "guide" },
    { href: "/learn/bylaws", labelKey: "bylaws", kind: "guide" },
    { href: "/learn/officer/democratic-governance", labelKey: "democraticGovernanceModule", kind: "guide" },
  ],
  "everyday-union-value": [
    { href: "/learn/membership-signup", labelKey: "membershipSignup", kind: "guide" },
    { href: "/learn/officer/membership-lists-privacy", labelKey: "membershipListsModule", kind: "guide" },
    { href: "/learn/officer/building-collective-power", labelKey: "collectivePowerModule", kind: "guide" },
    { href: "/learn/workplace-mapping", labelKey: "workplaceMapping", kind: "guide" },
    { href: "/create/solidarity-poster", labelKey: "solidarityPoster", kind: "tool" },
  ],
  "duty-of-fair-representation": [
    { href: "/learn/dfr", labelKey: "dfrGuide", kind: "guide" },
    { href: "/learn/grievance-process", labelKey: "grievanceProcess", kind: "guide" },
    { href: "/learn/steward-101", labelKey: "steward101", kind: "guide" },
    {
      href: "/learn/officer/contract-enforcement",
      labelKey: "contractEnforcementModule",
      kind: "guide",
    },
    {
      href: "/learn/officer/advanced-grievance-settlement",
      labelKey: "settlementModule",
      kind: "guide",
    },
  ],
  "seniority-bumping-layoff": [
    { href: "/learn/seniority-bumping", labelKey: "seniorityBumpingGuide", kind: "guide" },
    { href: "/learn/grievance-process", labelKey: "grievanceProcess", kind: "guide" },
    {
      href: "/learn/officer/contract-enforcement",
      labelKey: "contractEnforcementModule",
      kind: "guide",
    },
    {
      href: "/learn/officer/human-rights-accommodation",
      labelKey: "humanRightsModule",
      kind: "guide",
    },
    {
      href: "/learn/officer/duty-of-fair-representation",
      labelKey: "dfrModule",
      kind: "guide",
    },
    {
      href: "/learn/officer/pdf-classification",
      labelKey: "pdfClassificationModule",
      kind: "guide",
    },
  ],
  "pdf-classification": [
    { href: "/learn/grievance-process", labelKey: "grievanceProcess", kind: "guide" },
    { href: "/learn/steward-101", labelKey: "steward101", kind: "guide" },
    { href: "/learn/joint-committee", labelKey: "jointCommittee", kind: "guide" },
    {
      href: "/learn/officer/contract-enforcement",
      labelKey: "contractEnforcementModule",
      kind: "guide",
    },
    {
      href: "/learn/officer/advanced-grievance-settlement",
      labelKey: "settlementModule",
      kind: "guide",
    },
    {
      href: "/learn/officer/seniority-bumping-layoff",
      labelKey: "seniorityModule",
      kind: "guide",
    },
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
  "duty-of-fair-representation": [
    {
      id: "dfr-duty",
      titleKey: "dfrTitle",
      bodyKey: "dfrBody",
      ctaKey: "dfrCta",
    },
    {
      id: "floor-checklist",
      titleKey: "checklistTitle",
      bodyKey: "checklistBody",
      ctaKey: "checklistCta",
    },
  ],
  "seniority-bumping-layoff": [
    {
      id: "bumping-intake",
      titleKey: "bumpingTitle",
      bodyKey: "bumpingBody",
      ctaKey: "bumpingCta",
    },
    {
      id: "floor-checklist",
      titleKey: "checklistTitle",
      bodyKey: "checklistBody",
      ctaKey: "checklistCta",
    },
  ],
  "pdf-classification": [
    {
      id: "pdf-audit",
      titleKey: "pdfAuditTitle",
      bodyKey: "pdfAuditBody",
      ctaKey: "pdfAuditCta",
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
  return (MODULE_RELATED_RESOURCES[slug] ?? []).map((link) => ({
    ...link,
    href: canonicalizePublicHref(link.href),
  }));
}

export function getReferenceSheets(slug: string): ModuleReferenceSheet[] {
  return MODULE_REFERENCE_SHEETS[slug] ?? [];
}
