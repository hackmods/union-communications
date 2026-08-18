/**
 * Tab-scoped flag: the visitor started the 20-minute Demo Path.
 * sessionStorage only (not Brand Kit / prefs) — try/catch for private browsing.
 */

export const WORKSHOP_DEMO_SESSION_KEY = "unionops-workshop-demo";

/** Destinations that mean the visitor started the 20-minute path. */
export const WORKSHOP_DEMO_JOIN_HREFS = [
  "/brand-kit",
  "/onboarding",
  "/tools/board-notice",
  "/tools/graphic-maker",
  "/captions",
] as const;

export function isWorkshopDemoJoinHref(href: string): boolean {
  return (WORKSHOP_DEMO_JOIN_HREFS as readonly string[]).includes(href);
}

export function markWorkshopDemoSession(): void {
  try {
    sessionStorage.setItem(WORKSHOP_DEMO_SESSION_KEY, "1");
  } catch {
    // private browsing / quota
  }
}

export function isWorkshopDemoSession(): boolean {
  try {
    return sessionStorage.getItem(WORKSHOP_DEMO_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}
