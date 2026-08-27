export const PROPOSAL_STATUSES = [
  "open",
  "tentativelyAgreed",
  "unionWithdrew",
  "employerWithdrew",
  "impasse",
] as const;

export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export type ProposalRow = {
  id: string;
  article: string;
  currentLanguage: string;
  unionProposal: string;
  employerCounter: string;
  status: ProposalStatus;
  notes: string;
};

export type ProposalTrackerDraft = {
  rows: ProposalRow[];
};
