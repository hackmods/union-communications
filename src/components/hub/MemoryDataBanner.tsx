"use client";

import { useTranslations } from "next-intl";
import { useHubAuthenticated } from "@/components/hub/useHubAuthenticated";
import { PAGE_SHELL } from "@/lib/constants/page-shell";
import { cn } from "@/lib/utils";

type Props = {
  /** Server-computed — client bundles cannot read `*_DB_BACKEND` env. */
  active: boolean;
  /** Env keys still on memory for steward case-data (short labels for the body). */
  memoryModules?: string[];
};

function formatModuleLabel(key: string): string {
  return key
    .replace(/_DB_BACKEND$/, "")
    .replace(/_BACKEND$/, "")
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Persistent warning while steward casework still uses in-memory adapters
 * (SEC-003). Audit / feedback / Officer Learning memory does not show this.
 * Names which modules are still temporary so Portal-only memory is not
 * mistaken for a failed database migrate.
 */
export function MemoryDataBanner({ active, memoryModules = [] }: Props) {
  const { authenticated } = useHubAuthenticated();
  const t = useTranslations("hub");

  if (!active || !authenticated) return null;

  const modules = memoryModules.map(formatModuleLabel).join(", ");
  const body =
    modules.length > 0
      ? t("memoryBannerBody", { modules })
      : t("memoryBannerBodyAll");

  return (
    <div
      className="border-b border-red-300 bg-red-50 text-red-950"
      role="status"
      aria-live="polite"
    >
      <div className={cn(PAGE_SHELL.chrome, "flex items-start gap-3 py-2.5 text-sm")}>
        <span className="shrink-0 rounded bg-red-800 px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide text-red-50">
          {t("memoryBannerLabel")}
        </span>
        <p className="leading-snug">{body}</p>
      </div>
    </div>
  );
}
