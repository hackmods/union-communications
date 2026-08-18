"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "@/i18n/navigation";
import {
  canonicalWorkshopDemoHref,
  hasCompletedWorkshopDemoQuartet,
  isWorkshopDemoSession,
  markWorkshopDemoSession,
  markWorkshopDemoStep,
  subscribeWorkshopDemoSession,
} from "@/lib/comms/workshop-demo-session";

/**
 * True after the visitor joins the 20-minute path (Demo Path chip, First week
 * tool CTA, home hero Brand Kit, or ?demo=1). Stays false for cold tool visits.
 */
export function useWorkshopDemoSession(demoParam: string | null): boolean {
  const stored = useSyncExternalStore(
    subscribeWorkshopDemoSession,
    isWorkshopDemoSession,
    () => false,
  );

  useEffect(() => {
    if (demoParam === "1") {
      markWorkshopDemoSession();
    }
  }, [demoParam]);

  return demoParam === "1" || stored;
}

/** True once Brand Kit, Board Notice, Graphic Maker, and Captions were visited. */
export function useWorkshopDemoQuartetComplete(): boolean {
  return useSyncExternalStore(
    subscribeWorkshopDemoSession,
    hasCompletedWorkshopDemoQuartet,
    () => false,
  );
}

/** Record the current tool as a demo stop while the tab is on the path. */
export function useWorkshopDemoStepVisit(inDemo: boolean): void {
  const pathname = usePathname();

  useEffect(() => {
    if (!inDemo) return;
    const href = canonicalWorkshopDemoHref(pathname);
    if (href) markWorkshopDemoStep(href);
  }, [inDemo, pathname]);
}
