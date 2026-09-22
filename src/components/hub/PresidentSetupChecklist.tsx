"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Callout } from "@/components/ui/Callout";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";
import type { HubModule } from "@/types/tenant";
import { PUBLIC_SECTION_TITLE_CLASS } from "@/lib/constants/public-type";
import { cn } from "@/lib/utils";

type ChecklistState = {
  modulesReady: boolean;
  hallReady: boolean;
  invitesReady: boolean;
  configVisited: boolean;
};

const CONFIG_VISITED_KEY = "unionops:president-config-visited";

/**
 * Soft-launch progress for local presidents — modules → Hall → invites →
 * configuration visit. Complementary to the setup card.
 */
export function PresidentSetupChecklist({
  enabledModules,
  show,
}: {
  enabledModules: HubModule[];
  show: boolean;
}) {
  const t = useTranslations("hub.presidentChecklist");
  const [state, setState] = useState<ChecklistState | null>(null);

  useEffect(() => {
    if (!show) return;
    let cancelled = false;
    void (async () => {
      let hallReady = false;
      let invitesReady = false;
      let configVisited = false;
      try {
        configVisited = localStorage.getItem(CONFIG_VISITED_KEY) === "1";
      } catch {
        configVisited = false;
      }
      try {
        const [hallRes, invitesRes] = await Promise.all([
          fetch("/api/portal/station"),
          fetch("/api/invites"),
        ]);
        if (hallRes.ok) {
          const data = (await hallRes.json()) as {
            station?: { circles?: unknown[] };
          };
          hallReady = (data.station?.circles?.length ?? 0) > 0;
        }
        if (invitesRes.ok) {
          const data = (await invitesRes.json()) as { invites?: unknown[] };
          invitesReady = (data.invites?.length ?? 0) > 0;
        }
      } catch {
        /* checklist is advisory */
      }
      if (cancelled) return;
      setState({
        modulesReady:
          enabledModules.includes("grievance") &&
          enabledModules.includes("portal"),
        hallReady,
        invitesReady,
        configVisited,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [enabledModules, show]);

  if (!show || !state || isOfficerHubPublic()) return null;

  const steps = [
    {
      id: "modules",
      done: state.modulesReady,
      href: "/app/configuration",
      labelKey: "modules" as const,
    },
    {
      id: "hall",
      done: state.hallReady,
      href: "/app/onboarding",
      labelKey: "hall" as const,
    },
    {
      id: "invites",
      done: state.invitesReady,
      href: "/app/invites",
      labelKey: "invites" as const,
    },
    {
      id: "config",
      done: state.configVisited,
      href: "/app/configuration",
      labelKey: "config" as const,
    },
  ];

  const remaining = steps.filter((s) => !s.done).length;
  if (remaining === 0) return null;

  return (
    <Callout tone="brand" measure="fill" className="md:col-span-2">
      <h2 className={PUBLIC_SECTION_TITLE_CLASS}>{t("title")}</h2>
      <p className="mt-1 text-sm text-slate-700">{t("body")}</p>
      <ol className="mt-4 space-y-2">
        {steps.map((step) => (
          <li key={step.id}>
            <Link
              href={step.href}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2 text-sm font-medium",
                step.done
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-slate-200 bg-white text-opseu-dark hover:border-opseu-blue/40",
              )}
            >
              <span aria-hidden="true">{step.done ? "✓" : "○"}</span>
              <span>{t(`steps.${step.labelKey}`)}</span>
            </Link>
          </li>
        ))}
      </ol>
    </Callout>
  );
}

export function markPresidentConfigVisited(): void {
  try {
    localStorage.setItem(CONFIG_VISITED_KEY, "1");
  } catch {
    /* ignore */
  }
}
