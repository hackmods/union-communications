"use client";

import { useLayoutEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { DemoSiteBanner } from "@/components/hub/DemoSiteBanner";
import { SoftLaunchBanner } from "@/components/hub/SoftLaunchBanner";
import { MemoryDataBanner } from "@/components/hub/MemoryDataBanner";
import { MeetingReminderBanner } from "@/components/hub/MeetingReminderBanner";
import { useHubAuthenticated } from "@/components/hub/useHubAuthenticated";
import { isDemoSite } from "@/lib/features/demo-site";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";

type Props = {
  /** From server layout via `isMemoryCaseDataActive()` — not readable in the browser. */
  memoryCaseDataActive: boolean;
  /** Env keys still on memory (for an honest banner body). */
  memoryBackendKeys?: string[];
};

/**
 * Sticky status banners below the public header. Publishes
 * `--hub-banner-stack-height` so HubNav can stick under the stack instead of
 * letting banners scroll away under the site header on mobile.
 */
export function HubBannerStack({
  memoryCaseDataActive,
  memoryBackendKeys = [],
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const t = useTranslations("hub");
  const { authenticated } = useHubAuthenticated();
  const dashboard = pathname === "/app" || pathname === "/app/";
  const labels = authenticated
    ? [
        isDemoSite() ? t("demoBannerLabel") : null,
        !isOfficerHubPublic() ? t("softLaunchBannerLabel") : null,
        memoryCaseDataActive ? t("memoryBannerLabel") : null,
      ].filter(Boolean)
    : [];

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
      {dashboard ? (
        labels.length > 0 ? (
          <details className="border-b border-slate-300 bg-slate-50 text-opseu-dark">
            <summary className="mx-auto flex min-h-11 max-w-[100rem] cursor-pointer flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-[-3px] sm:px-6 xl:px-8">
              <span>{t("dashboardHome.notices")}</span>
              <span className="text-gray-700">{labels.join(" · ")}</span>
              {(isDemoSite() || memoryCaseDataActive) ? (
                <span className="text-red-900">{t("dashboardHome.noticeCaution")}</span>
              ) : null}
              <span className="ml-auto text-opseu-blue underline underline-offset-2">{t("dashboardHome.noticeDetails")}</span>
            </summary>
            <DemoSiteBanner />
            <SoftLaunchBanner />
            <MemoryDataBanner active={memoryCaseDataActive} memoryModules={memoryBackendKeys} />
          </details>
        ) : null
      ) : (
        <>
          <DemoSiteBanner />
          <SoftLaunchBanner />
          <MemoryDataBanner active={memoryCaseDataActive} memoryModules={memoryBackendKeys} />
        </>
      )}
      <MeetingReminderBanner />
    </div>
  );
}
