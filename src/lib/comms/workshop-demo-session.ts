/**
 * Tab-scoped flag: the visitor started the 20-minute Demo Path.
 * sessionStorage only (not Brand Kit / prefs) — try/catch for private browsing.
 */

export const WORKSHOP_DEMO_SESSION_KEY = "unionops-workshop-demo";

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
