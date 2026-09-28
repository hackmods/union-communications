/**
 * Member broadcast consent wording (ADR-022).
 * Bump version when either locale string changes.
 */
export const MEMBER_BROADCAST_NOTICE_VERSION = "member-broadcast-2026-09-v1";

export const MEMBER_BROADCAST_NOTICE = {
  en: "I want emails from my local about meetings and local union news through UnionOps. I can withdraw anytime. This is separate from UnionOps product news.",
  fr: "Je souhaite recevoir des courriels de ma section locale au sujet des réunions et des nouvelles locales via UnionOps. Je peux me retirer en tout temps. Ceci est distinct des nouvelles sur les produits UnionOps.",
} as const;
