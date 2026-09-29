import { OFFICER_LEARNING_MODULES } from "./modules";

/**
 * Maps each Officer Learning module slug to a `PAGE_SOURCE_IDS` key in
 * `comms-sources.ts`. Every catalog module must have an entry.
 */
export const SOURCES_PAGE_BY_SLUG: Record<string, string> = {
  "contract-enforcement": "officerLearningContract",
  "progressive-discipline": "officerLearningDiscipline",
  "human-rights-accommodation": "officerLearningHumanRights",
  "democratic-governance": "officerLearningGovernance",
  "financial-health": "officerLearningFinancial",
  "building-collective-power": "officerLearningCollectivePower",
  "mobilizer-bargaining-partner": "officerLearningMobilizer",
  "advanced-grievance-settlement": "officerLearningSettlement",
  "benefits-disability-claims": "officerLearningBenefits",
  "joint-workplace-committees": "officerLearningCommittees",
  "membership-lists-privacy": "officerLearningLists",
  "advanced-local-finance": "officerLearningAdvancedFinance",
  "digital-security-transitions": "officerLearningDigitalSecurity",
  "everyday-union-value": "officerLearningEverydayValue",
  "duty-of-fair-representation": "officerLearningDfr",
  "seniority-bumping-layoff": "officerLearningSeniority",
  "pdf-classification": "officerLearningPdfClassification",
};

/** Static params for `/guide/officer-learning/[slug]` — derived from the module catalog. */
export function officerLearningStaticParams(): Array<{ slug: string }> {
  return OFFICER_LEARNING_MODULES.map((module) => ({ slug: module.slug }));
}
