"use client";

import { useLayoutEffect, useRef } from "react";
import { DemoSiteBanner } from "@/components/hub/DemoSiteBanner";
import { SoftLaunchBanner } from "@/components/hub/SoftLaunchBanner";
import { MemoryDataBanner } from "@/components/hub/MemoryDataBanner";
import { MeetingReminderBanner } from "@/components/hub/MeetingReminderBanner";

/**
 * Sticky status banners below the public header. Publishes
 * `--hub-banner-stack-height` so HubNav can stick under the stack instead of
 * letting banners scroll away under the site header on mobile.
 */
export function HubBannerStack() {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const height = Math.ceil(el.getBoundingClientRect().height);
      document.documentElement.style.setProperty(
        "--hub-banner-stack-height",
        `${height}px`,
      );
    };

    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--hub-banner-stack-height");
    };
  }, []);

  return (
    <div
      ref={ref}
      className="sticky top-[var(--site-header-height,3.5rem)] z-30"
    >
      <DemoSiteBanner />
      <SoftLaunchBanner />
      <MemoryDataBanner />
      <MeetingReminderBanner />
    </div>
  );
}
