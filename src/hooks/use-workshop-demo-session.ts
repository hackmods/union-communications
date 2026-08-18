"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  isWorkshopDemoSession,
  markWorkshopDemoSession,
} from "@/lib/comms/workshop-demo-session";

const subscribe = () => () => {};

/**
 * True after the visitor joins the 20-minute path (Demo Path chip, First week
 * tool CTA, home hero Brand Kit, or ?demo=1). Stays false for cold tool visits.
 */
export function useWorkshopDemoSession(demoParam: string | null): boolean {
  const stored = useSyncExternalStore(
    subscribe,
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
