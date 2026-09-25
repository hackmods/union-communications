"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Callout } from "@/components/ui/Callout";
import type { HubModule } from "@/types/tenant";

/** Optional local setup routes. No browser visit or seeded content is treated as readiness. */
export function PresidentSetupChecklist({
  enabledModules,
  show,
}: {
  enabledModules: HubModule[];
  show: boolean;
}) {
  const t = useTranslations("hub.presidentChecklist");
  if (!show) return null;

  const steps = [
    { id: "config", href: "/app/configuration", label: t("steps.config") },
    ...(enabledModules.includes("portal")
      ? [{ id: "hall", href: "/app/onboarding", label: t("steps.hall") }]
      : []),
    { id: "invites", href: "/app/invites", label: t("steps.invites") },
    ...(enabledModules.includes("grievance")
      ? [{ id: "snippets", href: "/app/snippets", label: t("steps.snippets") }]
      : []),
  ];

  return (
    <Callout tone="brand" measure="fill" className="min-w-0">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center">
        <div>
          <h2 className="text-base font-semibold text-opseu-dark">{t("title")}</h2>
          <p className="mt-1 max-w-prose text-sm leading-relaxed text-slate-700">{t("body")}</p>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {steps.map((step) => (
            <li key={step.id} className="min-w-0">
              <Link
                href={step.href}
                className="flex min-h-11 items-center rounded-lg border border-opseu-blue/25 bg-white px-3 py-2 text-sm font-medium text-opseu-blue hover:border-opseu-blue focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {step.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Callout>
  );
}
