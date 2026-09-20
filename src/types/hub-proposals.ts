import type { ProposalStatus } from "@/lib/proposal-tracker/types";

export type HubProposalPackageStatus = "active" | "closed" | "archived";

export type HubProposalPackage = {
  id: string;
  unionId: string;
  localId: string;
  bargainingUnitId?: string;
  name: string;
  roundLabel: string;
  status: HubProposalPackageStatus;
  caucusNote: string;
  publishedAt?: string;
  publishedSummary?: {
    headline: string;
    bullets: string[];
    guideHref?: string;
  } | null;
  createdById: string;
  updatedById: string;
  createdAt: string;
  updatedAt: string;
};

export type HubProposalRow = {
  id: string;
  packageId: string;
  unionId: string;
  localId: string;
  article: string;
  currentLanguage: string;
  unionProposal: string;
  employerCounter: string;
  status: ProposalStatus;
  notes: string;
  sortOrder: number;
  assigneeIds: string[];
  updatedAt: string;
};

export type HubProposalEvent = {
  id: string;
  packageId: string;
  rowId?: string;
  unionId: string;
  localId: string;
  authorId: string;
  authorName: string;
  kind: "comment" | "status" | "system";
  body: string;
  createdAt: string;
};

/** Member-safe Portal snapshot — never includes counters or caucus notes. */
export type ProposalPublication = {
  id: string;
  packageId: string;
  unionId: string;
  localId: string;
  headline: string;
  bullets: string[];
  guideHref?: string;
  publishedById: string;
  publishedAt: string;
  archivedAt?: string;
};
