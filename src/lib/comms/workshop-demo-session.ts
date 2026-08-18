/**
 * Tab-scoped flag: the visitor started the 20-minute Demo Path.
 * sessionStorage only (not Brand Kit / prefs) — try/catch for private browsing.
 */

export const WORKSHOP_DEMO_SESSION_KEY = "unionops-workshop-demo";
export const WORKSHOP_DEMO_VISITS_KEY = "unionops-workshop-demo-visits";

/** Destinations that mean the visitor started the 20-minute path. */
export const WORKSHOP_DEMO_JOIN_HREFS = [
  "/brand-kit",
  "/onboarding",
  "/tools/board-notice",
  "/tools/graphic-maker",
  "/captions",
] as const;

export const WORKSHOP_DEMO_CORE_HREFS = [
  "/brand-kit",
  "/tools/board-notice",
  "/tools/graphic-maker",
  "/captions",
] as const;

export const WORKSHOP_DEMO_WEBSITE_HREF = "/tools/website-template";

const listeners = new Set<() => void>();

export function subscribeWorkshopDemoSession(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function notifyWorkshopDemoSession(): void {
  listeners.forEach((listener) => listener());
}

export function isWorkshopDemoJoinHref(href: string): boolean {
  return (WORKSHOP_DEMO_JOIN_HREFS as readonly string[]).includes(href);
}

export function markWorkshopDemoSession(): void {
  try {
    if (sessionStorage.getItem(WORKSHOP_DEMO_SESSION_KEY) === "1") return;
    sessionStorage.setItem(WORKSHOP_DEMO_SESSION_KEY, "1");
    notifyWorkshopDemoSession();
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

function readVisited(): string[] {
  try {
    const raw = sessionStorage.getItem(WORKSHOP_DEMO_VISITS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export function canonicalWorkshopDemoHref(pathname: string): string | null {
  if (pathname === "/onboarding" || pathname.startsWith("/onboarding/")) {
    return "/brand-kit";
  }
  const known = [...WORKSHOP_DEMO_CORE_HREFS, WORKSHOP_DEMO_WEBSITE_HREF];
  return known.find((href) => pathname === href || pathname.startsWith(`${href}/`)) ?? null;
}

/** Record that this tab visited a demo stop. Joins the session if needed. */
export function markWorkshopDemoStep(href: string): void {
  const canonical = canonicalWorkshopDemoHref(href) ?? href;
  markWorkshopDemoSession();
  const visited = readVisited();
  if (visited.includes(canonical)) return;
  try {
    sessionStorage.setItem(
      WORKSHOP_DEMO_VISITS_KEY,
      JSON.stringify([...visited, canonical]),
    );
    notifyWorkshopDemoSession();
  } catch {
    // private browsing / quota
  }
}

export function hasCompletedWorkshopDemoQuartet(): boolean {
  const visited = readVisited();
  return WORKSHOP_DEMO_CORE_HREFS.every((href) => visited.includes(href));
}
