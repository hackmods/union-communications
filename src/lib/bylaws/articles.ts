/** Canonical article keys for local bylaws templates. */
export const BYLAW_ARTICLE_KEYS = [
  "name",
  "purpose",
  "membership",
  "executive",
  "stewards",
  "quorum",
  "meetings",
  "elections",
  "finances",
  "trustees",
  "committees",
  "amendments",
  "conflict",
] as const;

export type BylawArticleKey = (typeof BYLAW_ARTICLE_KEYS)[number];

export type BylawArticleOverrides = Partial<Record<BylawArticleKey, string>>;

export type BylawArticleSet = "standard" | "opseu";

export type BylawBuilderMode = "template" | "committee";
