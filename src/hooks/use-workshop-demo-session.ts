"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  isWorkshopDemoSession,
  markWorkshopDemoSession,
} from "@/lib/comms/workshop-demo-session";

const subscribe = () => () => {};

/**
 * True after the visitor clicks a Demo Path chip (or lands with ?demo=1).
 * Stays false for cold tool visits so Graphic Maker / Captions stay ordinary.
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
