"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Callout } from "@/components/ui/Callout";
import {
  HUB_CONFIG_ROWS,
  PORTAL_CONFIG_ROWS,
  PRESIDENT_ALWAYS_ON_TOOLS,
  applyHubModuleToggle,
  applyPortalSurfaceToggle,
  type PortalSurfaceId,
} from "@/lib/president/module-catalog";
import { useLiveTenant } from "@/components/hub/TenantLiveProvider";
import type { HubModule, TenantContext } from "@/types/tenant";
import {
  PUBLIC_PAGE_TITLE_CLASS,
  PUBLIC_SECTION_TITLE_CLASS,
} from "@/lib/constants/public-type";
import { cn } from "@/lib/utils";

type TenantPayload = {
  context: TenantContext;
  canManageLocalModules: boolean;
  canManageUnionModules: boolean;
  portalSurfaces: PortalSurfaceId[];
};

function ModuleToggle({
  id,
  label,
  blurb,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  blurb: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 transition-colors",
        checked ? "border-opseu-blue/40 bg-opseu-blue/[0.03]" : "hover:border-slate-300",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <input
        id={id}
        type="checkbox"
        className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300 text-opseu-blue focus:ring-opseu-blue/40"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-opseu-dark">{label}</span>
        <span className="mt-1 block text-sm leading-relaxed text-slate-600">
          {blurb}
        </span>
      </span>
    </label>
  );
}

export function PresidentConfiguration() {
  const t = useTranslations("hub.presidentConfig");
  const liveTenant = useLiveTenant();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [canManageData, setCanManageData] = useState(false);
  const [modules, setModules] = useState<HubModule[]>([]);
  const [surfaces, setSurfaces] = useState<PortalSurfaceId[]>([]);
  const [unionName, setUnionName] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/tenant");
        if (cancelled) return;
        if (!res.ok) {
          setError(t("loadError"));
          return;
        }
        const data = (await res.json()) as TenantPayload;
        if (cancelled) return;
        setCanManage(data.canManageLocalModules);
        setCanManageData(data.canManageUnionModules);
        setModules(data.context.union.enabledModules);
        setSurfaces(data.portalSurfaces);
        setUnionName(data.context.union.name);
      } catch {
        if (!cancelled) setError(t("loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t, liveTenant]);

  async function saveModules(next: HubModule[]) {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_modules",
          enabledModules: next,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(body?.error ?? t("saveError"));
        return;
      }
      const body = (await res.json()) as { enabledModules: HubModule[] };
      setModules(body.enabledModules);
      setSuccess(t("saveSuccess"));
    } catch {
      setError(t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function saveSurfaces(next: PortalSurfaceId[]) {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_portal_surfaces",
          portalSurfaces: next,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(body?.error ?? t("saveError"));
        return;
      }
      const body = (await res.json()) as { portalSurfaces: PortalSurfaceId[] };
      setSurfaces(body.portalSurfaces);
      setSuccess(t("saveSuccess"));
    } catch {
      setError(t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  function onHubToggle(id: HubModule, enabled: boolean) {
    const next = applyHubModuleToggle(modules, id, enabled);
    setModules(next);
    void saveModules(next);
  }

  function onPortalToggle(id: PortalSurfaceId, enabled: boolean) {
    const next = applyPortalSurfaceToggle(surfaces, id, enabled);
    setSurfaces(next);
    void saveSurfaces(next);
  }

  if (loading) {
    return (
      <p className="text-sm text-slate-600" aria-live="polite">
        {t("loading")}
      </p>
    );
  }

  if (!canManage) {
    return (
      <Callout tone="muted" measure="fill">
        {t("forbidden")}
      </Callout>
    );
  }

  const executive = HUB_CONFIG_ROWS.filter((row) => row.tier === "executive");
  const operational = HUB_CONFIG_ROWS.filter((row) => row.tier === "operational");

  return (
    <div className="space-y-10">
      <header className="max-w-2xl space-y-3">
        <h1 className={PUBLIC_PAGE_TITLE_CLASS}>{t("title")}</h1>
        <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
          {t("intro", { union: unionName || t("yourUnion") })}
        </p>
        <Callout tone="brand" measure="fill">
          {t("workflowTip")}
        </Callout>
      </header>

      {error ? (
        <Callout tone="danger" role="alert" measure="fill">
          {error}
        </Callout>
      ) : null}
      {success ? (
        <Callout tone="brand" role="status" measure="fill">
          {success}
        </Callout>
      ) : null}

      <section aria-labelledby="president-always-on" className="space-y-4">
        <h2 id="president-always-on" className={PUBLIC_SECTION_TITLE_CLASS}>
          {t("alwaysOnTitle")}
        </h2>
        <p className="max-w-prose text-sm text-slate-600">{t("alwaysOnBody")}</p>
        <ul className="grid gap-3 sm:grid-cols-3">
          {PRESIDENT_ALWAYS_ON_TOOLS.map((tool) => (
            <li key={tool.id}>
              <Link
                href={tool.href}
                className="block rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-opseu-dark hover:border-opseu-blue/40 hover:bg-opseu-blue/[0.03]"
              >
                {t(`alwaysOn.${tool.id}`)}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="president-hub-exec" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="president-hub-exec" className={PUBLIC_SECTION_TITLE_CLASS}>
              {t("hubExecutiveTitle")}
            </h2>
            <p className="mt-1 max-w-prose text-sm text-slate-600">
              {t("hubExecutiveBody")}
            </p>
          </div>
          <span className="rounded-md bg-opseu-blue/10 px-2.5 py-1 text-xs font-semibold text-opseu-dark">
            {t("recommendedOn")}
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {executive.map((row) => (
            <ModuleToggle
              key={row.id}
              id={`hub-${row.id}`}
              label={t(`hubModules.${row.labelKey}`)}
              blurb={t(`hubModules.${row.blurbKey}`)}
              checked={modules.includes(row.id)}
              disabled={saving || !row.presidentToggle}
              onChange={(next) => onHubToggle(row.id, next)}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="president-hub-ops" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="president-hub-ops" className={PUBLIC_SECTION_TITLE_CLASS}>
              {t("hubOperationalTitle")}
            </h2>
            <p className="mt-1 max-w-prose text-sm text-slate-600">
              {t("hubOperationalBody")}
            </p>
          </div>
          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            {t("recommendedOff")}
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {operational.map((row) => {
            const lockedData = row.id === "data" && !canManageData;
            return (
              <ModuleToggle
                key={row.id}
                id={`hub-${row.id}`}
                label={t(`hubModules.${row.labelKey}`)}
                blurb={
                  lockedData
                    ? t("hubModules.dataLockedBlurb")
                    : t(`hubModules.${row.blurbKey}`)
                }
                checked={modules.includes(row.id)}
                disabled={saving || lockedData || !row.presidentToggle}
                onChange={(next) => onHubToggle(row.id, next)}
              />
            );
          })}
        </div>
      </section>

      <section aria-labelledby="president-portal" className="space-y-4">
        <div>
          <h2 id="president-portal" className={PUBLIC_SECTION_TITLE_CLASS}>
            {t("portalTitle")}
          </h2>
          <p className="mt-1 max-w-prose text-sm text-slate-600">
            {t("portalBody")}
          </p>
        </div>
        {!modules.includes("portal") ? (
          <Callout tone="muted" measure="fill">
            {t("portalDisabledHint")}
          </Callout>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {PORTAL_CONFIG_ROWS.map((row) => (
              <ModuleToggle
                key={row.id}
                id={`portal-${row.id}`}
                label={t(`portalSurfaces.${row.labelKey}`)}
                blurb={t(`portalSurfaces.${row.blurbKey}`)}
                checked={surfaces.includes(row.id)}
                disabled={
                  saving ||
                  (row.id === "discussions" && surfaces.includes("discussions"))
                }
                onChange={(next) => onPortalToggle(row.id, next)}
              />
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">{t("nextSteps")}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/app/onboarding"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border-2 border-opseu-blue px-4 py-2 text-sm font-semibold text-opseu-blue hover:bg-opseu-blue/5"
          >
            {t("openOnboarding")}
          </Link>
          <Link
            href="/app/invites"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-opseu-blue px-4 py-2 text-sm font-semibold text-white hover:bg-opseu-dark"
          >
            {t("openInvites")}
          </Link>
        </div>
      </div>
    </div>
  );
}
