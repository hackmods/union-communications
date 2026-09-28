/**
 * Maps a Hub return path to MFA journey copy intent keys.
 * Pages look up `hub.mfaJourney.context.<intent>.*` in messages.
 */

export type MfaCopyIntent =
  | "grievances"
  | "bumping"
  | "time"
  | "casework"
  | "setup"
  | "enroll"
  | "replace"
  | "manage";

const PREFIX_INTENTS: ReadonlyArray<{ prefix: string; intent: MfaCopyIntent }> = [
  { prefix: "/app/grievances", intent: "grievances" },
  { prefix: "/app/bumping", intent: "bumping" },
  { prefix: "/app/time", intent: "time" },
  { prefix: "/app/overdue", intent: "casework" },
  { prefix: "/app/tasks", intent: "casework" },
  { prefix: "/app/discussions", intent: "casework" },
  { prefix: "/app/documents", intent: "casework" },
  { prefix: "/app/data", intent: "casework" },
  { prefix: "/app/proposals", intent: "casework" },
  { prefix: "/app/bylaws", intent: "casework" },
  { prefix: "/app/checkins", intent: "casework" },
  { prefix: "/app/meetings", intent: "casework" },
  { prefix: "/app/minutes", intent: "casework" },
  { prefix: "/app/ledger", intent: "casework" },
  { prefix: "/app/expenses", intent: "casework" },
  { prefix: "/app/travel", intent: "casework" },
  { prefix: "/app/elections", intent: "casework" },
  { prefix: "/app/officers", intent: "casework" },
  { prefix: "/app/committees", intent: "casework" },
  { prefix: "/app/polls", intent: "casework" },
  { prefix: "/app/snippets", intent: "casework" },
  { prefix: "/app/marketplace", intent: "casework" },
  { prefix: "/app/hybrid", intent: "casework" },
  { prefix: "/app/audit", intent: "casework" },
  { prefix: "/app/reports", intent: "casework" },
  { prefix: "/app/invites", intent: "casework" },
  { prefix: "/app/onboarding", intent: "casework" },
  { prefix: "/app/configuration", intent: "casework" },
  { prefix: "/app/handoff", intent: "casework" },
  { prefix: "/app/informal-log", intent: "casework" },
  { prefix: "/app/organization", intent: "casework" },
  { prefix: "/app/calendar", intent: "casework" },
  { prefix: "/app/steward-guides", intent: "casework" },
  { prefix: "/app/officer-learning", intent: "casework" },
  { prefix: "/app/site-admin", intent: "casework" },
  { prefix: "/app/send-feedback", intent: "casework" },
  { prefix: "/app/feedback", intent: "casework" },
];

export function resolveMfaCopyIntent(input: {
  next?: string | null;
  step?: "challenge" | "enroll" | "replace" | "manage" | "success";
}): MfaCopyIntent {
  if (input.step === "replace") return "replace";
  if (input.step === "enroll") return "enroll";
  if (input.step === "manage") return "manage";
  if (input.step === "success") return "manage";

  const path = (input.next ?? "").split("?")[0]?.split("#")[0] ?? "";
  if (!path || path === "/app") return "setup";

  for (const { prefix, intent } of PREFIX_INTENTS) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return intent;
  }
  return "setup";
}
