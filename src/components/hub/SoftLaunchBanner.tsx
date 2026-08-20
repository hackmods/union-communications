"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";
import { PAGE_SHELL } from "@/lib/constants/page-shell";
import { cn } from "@/lib/utils";

/**
 * Quiet notice while Officer Hub / Local Portal are not advertised nationally.
 * Invite-accept and login stay reachable; Home stays Comms-focused.
 */
export function SoftLaunchBanner() {
  const { status } = useSession();
  const t = useTranslations("hub");

  if (isOfficerHubPublic() || status !== "authenticated") return null;

  return (
    <div
      className="border-b border-sky-300 bg-sky-50 text-sky-950"
      role="status"
      aria-live="polite"
    >
      <div className={cn(PAGE_SHELL.chrome, "flex items-start gap-3 py-2.5 text-sm")}>
        <span className="shrink-0 rounded bg-sky-800 px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide text-sky-50">
          {t("softLaunchBannerLabel")}
        </span>
        <p className="leading-snug">{t("softLaunchBannerBody")}</p>
      </div>
    </div>
  );
}
