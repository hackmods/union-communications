"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Callout } from "@/components/ui/Callout";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import {
  PORTAL_CONFIG_ROWS,
  PRESIDENT_ALWAYS_ON_TOOLS,
  PRESIDENT_PRESETS,
  applyHubModuleToggle,
  applyPortalSurfaceToggle,
  getPresidentPreset,
  isDestructiveHubOff,
  portalNavLinkAllowed,
  resolvePortalSurfaces,
  sameModuleSet,
  sameSurfaceSet,
  visibleHubConfigRows,
  type PortalSurfaceId,
  type PresidentPresetId,
} from "@/lib/president/module-catalog";
import { useLiveTenant } from "@/components/hub/TenantLiveProvider";
import type { HubModule, TenantContext } from "@/types/tenant";
import {
  PUBLIC_PAGE_TITLE_CLASS,
  PUBLIC_SECTION_TITLE_CLASS,
} from "@/lib/constants/public-type";
import type { LocalPresentationPrefs } from "@/lib/president/local-prefs";
import { cn } from "@/lib/utils";
import { markPresidentConfigVisited } from "@/components/hub/PresidentSetupChecklist";

type ConfigScope = "union" | "local";

type TenantPayload = {
  context: TenantContext | null;
  canManageLocalModules: boolean;
  canManageUnionModules: boolean;
  canMintLocal?: boolean;
  portalSurfaces: PortalSurfaceId[];
  localPrefs: LocalPresentationPrefs | null;
  sessionLocalId: string | null;
  needsUnionContext?: boolean;
  isPlatformAdmin?: boolean;
  operatorUnionId?: string | null;
  unions?: Array<{ id: string; name: string }>;
};

const COACH_KEY = "unionops:president-coach-dismissed";

function ModuleToggle({
  id,
  label,
  blurb,
  product,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  blurb: string;
  product?: string;
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
        {product ? (
          <span className="mt-0.5 block text-xs font-medium text-opseu-blue">
            {product}
          </span>
        ) : null}
        <span className="mt-1 block text-sm leading-relaxed text-slate-600">
          {blurb}
        </span>
      </span>
    </label>
  );
}

function PreviewPanel({
  modules,
  surfaces,
}: {
  modules: HubModule[];
  surfaces: PortalSurfaceId[];
}) {
  const t = useTranslations("hub.presidentConfig");
  const hubOn = visibleHubConfigRows().filter((row) => modules.includes(row.id));
  const portalOn = PORTAL_CONFIG_ROWS.filter(
    (row) =>
      surfaces.includes(row.id) &&
      portalNavLinkAllowed(row.navLinkIds[0]!, surfaces, modules),
  );

  return (
    <aside
      className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5"
      aria-labelledby="president-preview-heading"
    >
      <h2
        id="president-preview-heading"
        className="text-sm font-semibold text-opseu-dark"
      >
        {t("previewTitle")}
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-slate-600">
        {t("previewBody")}
      </p>
      <div className="mt-4 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t("previewHub")}
          </p>
          <ul className="mt-2 space-y-1.5">
            {hubOn.length === 0 ? (
              <li className="text-sm text-slate-500">{t("previewEmpty")}</li>
            ) : (
              hubOn.map((row) => (
                <li
                  key={row.id}
                  className="rounded-md bg-white px-2.5 py-1.5 text-sm text-opseu-dark ring-1 ring-slate-200"
                >
                  {t(`hubModules.${row.labelKey}`)}
                </li>
              ))
            )}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t("previewPortal")}
          </p>
          <ul className="mt-2 space-y-1.5">
            {!modules.includes("portal") ? (
              <li className="text-sm text-slate-500">{t("previewPortalOff")}</li>
            ) : portalOn.length === 0 ? (
              <li className="text-sm text-slate-500">{t("previewEmpty")}</li>
            ) : (
              portalOn.map((row) => (
                <li
                  key={row.id}
                  className="rounded-md bg-white px-2.5 py-1.5 text-sm text-opseu-dark ring-1 ring-slate-200"
                >
                  <span className="font-medium">
                    {t(`portalSurfaces.${row.labelKey}Product`)}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {t(`portalSurfaces.${row.labelKey}`)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </aside>
  );
}

export function PresidentConfiguration({
  initialUnionId = null,
}: {
  /** Site-admin deep link: `/app/configuration?unionId=…` */
  initialUnionId?: string | null;
}) {
  const t = useTranslations("hub.presidentConfig");
  const liveTenant = useLiveTenant();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [starterBusy, setStarterBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [canManageData, setCanManageData] = useState(false);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [needsUnionContext, setNeedsUnionContext] = useState(false);
  const [unionOptions, setUnionOptions] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [operatorUnionId, setOperatorUnionId] = useState<string | null>(
    initialUnionId,
  );
  const [unionName, setUnionName] = useState("");
  const [sessionLocalId, setSessionLocalId] = useState<string | null>(null);
  const [scope, setScope] = useState<ConfigScope>("union");

  const [savedModules, setSavedModules] = useState<HubModule[]>([]);
  const [savedSurfaces, setSavedSurfaces] = useState<PortalSurfaceId[]>([]);
  const [draftModules, setDraftModules] = useState<HubModule[]>([]);
  const [draftSurfaces, setDraftSurfaces] = useState<PortalSurfaceId[]>([]);
  const [undoSnapshot, setUndoSnapshot] = useState<{
    modules: HubModule[];
    surfaces: PortalSurfaceId[];
  } | null>(null);

  const [pendingOff, setPendingOff] = useState<HubModule | null>(null);
  const [coachOpen, setCoachOpen] = useState(() => {
    try {
      return localStorage.getItem(COACH_KEY) !== "1";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    markPresidentConfigVisited();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const qs =
          operatorUnionId != null && operatorUnionId.length > 0
            ? `?unionId=${encodeURIComponent(operatorUnionId)}`
            : "";
        const res = await fetch(`/api/tenant${qs}`);
        if (cancelled) return;
        if (!res.ok) {
          setCanManage(false);
          setError(t("loadError"));
          return;
        }
        const data = (await res.json()) as TenantPayload;
        if (cancelled) return;
        setCanManage(data.canManageLocalModules);
        setCanManageData(data.canManageUnionModules);
        setIsPlatformAdmin(Boolean(data.isPlatformAdmin));
        setSessionLocalId(data.sessionLocalId);
        if (data.unions?.length) {
          setUnionOptions(data.unions);
        }
        if (data.needsUnionContext || !data.context) {
          setNeedsUnionContext(true);
          setUnionName("");
          return;
        }
        setNeedsUnionContext(false);
        setOperatorUnionId(data.operatorUnionId ?? data.context.union.id);
        setUnionName(data.context.union.name);
        const unionModules = data.context.union.enabledModules;
        const unionSurfaces = resolvePortalSurfaces(data.portalSurfaces);
        setSavedModules(unionModules);
        setSavedSurfaces(unionSurfaces);
        if (data.localPrefs) {
          setDraftModules(data.localPrefs.hubModules);
          setDraftSurfaces(data.localPrefs.portalSurfaces);
          setScope("local");
        } else {
          setDraftModules(unionModules);
          setDraftSurfaces(unionSurfaces);
          setScope("union");
        }
      } catch {
        if (!cancelled) {
          setCanManage(false);
          setError(t("loadError"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t, liveTenant, operatorUnionId]);

  function operatorBody(
    base: Record<string, unknown>,
  ): Record<string, unknown> {
    if (isPlatformAdmin && operatorUnionId) {
      return { ...base, unionId: operatorUnionId };
    }
    return base;
  }

  const dirty = useMemo(() => {
    if (scope === "union") {
      return (
        !sameModuleSet(draftModules, savedModules) ||
        !sameSurfaceSet(draftSurfaces, savedSurfaces)
      );
    }
    return true;
  }, [draftModules, draftSurfaces, savedModules, savedSurfaces, scope]);

  function dismissCoach() {
    try {
      localStorage.setItem(COACH_KEY, "1");
    } catch {
      /* private browsing */
    }
    setCoachOpen(false);
  }

  function pushUndo() {
    setUndoSnapshot({ modules: [...draftModules], surfaces: [...draftSurfaces] });
  }

  function requestHubToggle(id: HubModule, enabled: boolean) {
    if (isDestructiveHubOff(id, enabled)) {
      setPendingOff(id);
      return;
    }
    pushUndo();
    setDraftModules(applyHubModuleToggle(draftModules, id, enabled));
  }

  function confirmDestructiveOff() {
    if (!pendingOff) return;
    pushUndo();
    setDraftModules(applyHubModuleToggle(draftModules, pendingOff, false));
    setPendingOff(null);
  }

  function applyPreset(id: PresidentPresetId) {
    const preset = getPresidentPreset(id);
    pushUndo();
    setDraftModules([...preset.modules]);
    setDraftSurfaces([...preset.surfaces]);
    setSuccess(t("presetApplied", { name: t(`presets.${id}.label`) }));
  }

  function undoLast() {
    if (!undoSnapshot) return;
    setDraftModules(undoSnapshot.modules);
    setDraftSurfaces(undoSnapshot.surfaces);
    setUndoSnapshot(null);
    setSuccess(t("undoSuccess"));
  }

  async function applyChanges() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (scope === "local") {
        if (!sessionLocalId) {
          setError(t("localScopeMissing"));
          return;
        }
        const res = await fetch("/api/tenant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            operatorBody({
              action: "set_local_prefs",
              localId: sessionLocalId,
              hubModules: draftModules,
              portalSurfaces: draftSurfaces,
            }),
          ),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          setError(body?.error ?? t("saveError"));
          return;
        }
        setSuccess(t("localSaveSuccess"));
        window.dispatchEvent(new Event("unionops:tenant-updated"));
        return;
      }

      const modulesRes = await fetch("/api/tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          operatorBody({
            action: "set_modules",
            enabledModules: draftModules,
          }),
        ),
      });
      if (!modulesRes.ok) {
        const body = (await modulesRes.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(body?.error ?? t("saveError"));
        return;
      }
      const modulesBody = (await modulesRes.json()) as {
        enabledModules: HubModule[];
      };

      const surfacesRes = await fetch("/api/tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          operatorBody({
            action: "set_portal_surfaces",
            portalSurfaces: draftSurfaces,
          }),
        ),
      });
      if (!surfacesRes.ok) {
        const body = (await surfacesRes.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(body?.error ?? t("saveError"));
        return;
      }
      const surfacesBody = (await surfacesRes.json()) as {
        portalSurfaces: PortalSurfaceId[];
      };

      setSavedModules(modulesBody.enabledModules);
      setSavedSurfaces(surfacesBody.portalSurfaces);
      setDraftModules(modulesBody.enabledModules);
      setDraftSurfaces(surfacesBody.portalSurfaces);
      setSuccess(t("saveSuccess"));
      window.dispatchEvent(new Event("unionops:tenant-updated"));
    } catch {
      setError(t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function clearLocalFilter() {
    if (!sessionLocalId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          operatorBody({
            action: "set_local_prefs",
            localId: sessionLocalId,
            hubModules: [],
            portalSurfaces: [],
            clear: true,
          }),
        ),
      });
      if (!res.ok) {
        setError(t("saveError"));
        return;
      }
      setScope("union");
      setDraftModules(savedModules);
      setDraftSurfaces(savedSurfaces);
      setSuccess(t("localCleared"));
      window.dispatchEvent(new Event("unionops:tenant-updated"));
    } catch {
      setError(t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function runCircleStarter() {
    setStarterBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const hallRes = await fetch("/api/portal/hall/ensure", { method: "POST" });
      if (!hallRes.ok) {
        setError(t("starterError"));
        return;
      }
      const circleRes = await fetch("/api/portal/circles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: t("starterCommitteeName"),
          kind: "committee",
          template: "lec",
          description: t("starterCommitteeDesc"),
        }),
      });
      if (!circleRes.ok && circleRes.status !== 201) {
        setError(t("starterError"));
        return;
      }
      setSuccess(t("starterSuccess"));
    } catch {
      setError(t("starterError"));
    } finally {
      setStarterBusy(false);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-slate-600" aria-live="polite">
        {t("loading")}
      </p>
    );
  }

  if (error && !canManage && !needsUnionContext) {
    return (
      <div className="space-y-4">
        <h1 className={PUBLIC_PAGE_TITLE_CLASS}>{t("title")}</h1>
        <Callout tone="danger" role="alert" measure="fill">
          {error}
        </Callout>
        <Link
          href="/app"
          className="inline-flex text-sm font-semibold text-opseu-blue underline"
        >
          {t("backToDashboard")}
        </Link>
      </div>
    );
  }

  if (needsUnionContext && isPlatformAdmin) {
    return (
      <div className="space-y-4">
        <h1 className={PUBLIC_PAGE_TITLE_CLASS}>{t("title")}</h1>
        <Callout tone="brand" measure="fill">
          {t("pickUnionBody")}
        </Callout>
        {unionOptions.length > 0 ? (
          <Select
            label={t("pickUnionLabel")}
            value={operatorUnionId ?? ""}
            onChange={(e) => {
              const next = e.target.value;
              setOperatorUnionId(next || null);
            }}
          >
            <option value="">{t("pickUnionPlaceholder")}</option>
            {unionOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        ) : (
          <Callout tone="muted" measure="fill">
            {t("pickUnionEmpty")}
          </Callout>
        )}
        <Link
          href="/app/site-admin"
          className="inline-flex text-sm font-semibold text-opseu-blue underline"
        >
          {t("backToSiteAdmin")}
        </Link>
      </div>
    );
  }

  const readOnly = !canManage;
  if (readOnly) {
    return (
      <div className="space-y-4">
        <h1 className={PUBLIC_PAGE_TITLE_CLASS}>{t("title")}</h1>
        <Callout tone="muted" measure="fill">
          {t("stewardReadOnly")}
        </Callout>
        <Link
          href="/app"
          className="inline-flex text-sm font-semibold text-opseu-blue underline"
        >
          {t("backToDashboard")}
        </Link>
      </div>
    );
  }

  const executive = visibleHubConfigRows().filter((row) => row.tier === "executive");
  const operational = visibleHubConfigRows().filter((row) => row.tier === "operational");

  return (
    <div className="space-y-8">
      <header className="max-w-2xl space-y-3">
        <h1 className={PUBLIC_PAGE_TITLE_CLASS}>{t("title")}</h1>
        <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
          {t("intro", { union: unionName || t("yourUnion") })}
        </p>
        {isPlatformAdmin && unionOptions.length > 0 ? (
          <Select
            label={t("pickUnionLabel")}
            value={operatorUnionId ?? ""}
            onChange={(e) => {
              const next = e.target.value;
              if (next && next !== operatorUnionId) {
                setOperatorUnionId(next);
              }
            }}
          >
            {unionOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        ) : null}
        {coachOpen ? (
          <Callout tone="brand" measure="fill">
            <p>{t("coachBody")}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={dismissCoach}
            >
              {t("coachDismiss")}
            </Button>
          </Callout>
        ) : null}
        <Callout tone="muted" measure="fill">
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

      {pendingOff ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="destructive-off-title"
          className="rounded-xl border border-amber-300 bg-amber-50 p-4 sm:p-5"
        >
          <h2
            id="destructive-off-title"
            className="text-sm font-semibold text-opseu-dark"
          >
            {t("destructiveTitle")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            {t(`destructive.${pendingOff}`)}
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={confirmDestructiveOff}>
              {t("destructiveConfirm")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingOff(null)}
            >
              {t("destructiveCancel")}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("presetsLabel")}>
          {PRESIDENT_PRESETS.map((preset) => (
            <Button
              key={preset.id}
              type="button"
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => applyPreset(preset.id)}
            >
              {t(`presets.${preset.id}.label`)}
            </Button>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!undoSnapshot || saving}
          onClick={undoLast}
        >
          {t("undo")}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("scopeLabel")}>
        <button
          type="button"
          role="radio"
          aria-checked={scope === "union"}
          className={cn(
            "rounded-lg border px-3 py-2 text-sm font-semibold",
            scope === "union"
              ? "border-opseu-blue bg-opseu-blue/10 text-opseu-dark"
              : "border-slate-200 text-slate-700 hover:bg-slate-50",
          )}
          onClick={() => {
            setScope("union");
            setDraftModules(savedModules);
            setDraftSurfaces(savedSurfaces);
          }}
        >
          {t("scopeUnion")}
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={scope === "local"}
          disabled={!sessionLocalId}
          className={cn(
            "rounded-lg border px-3 py-2 text-sm font-semibold",
            scope === "local"
              ? "border-opseu-blue bg-opseu-blue/10 text-opseu-dark"
              : "border-slate-200 text-slate-700 hover:bg-slate-50",
            !sessionLocalId && "opacity-50",
          )}
          onClick={() => setScope("local")}
        >
          {t("scopeLocal")}
        </button>
        {scope === "local" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={saving}
            onClick={() => void clearLocalFilter()}
          >
            {t("clearLocalFilter")}
          </Button>
        ) : null}
      </div>
      {scope === "local" ? (
        <p className="text-sm text-slate-600">{t("scopeLocalHint")}</p>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)] lg:items-start">
        <div className="space-y-10">
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
                  checked={draftModules.includes(row.id)}
                  disabled={saving || !row.presidentToggle}
                  onChange={(next) => requestHubToggle(row.id, next)}
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
                    checked={draftModules.includes(row.id)}
                    disabled={saving || lockedData || !row.presidentToggle}
                    onChange={(next) => requestHubToggle(row.id, next)}
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
            {!draftModules.includes("portal") ? (
              <Callout tone="muted" measure="fill">
                {t("portalDisabledHint")}
              </Callout>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  {PORTAL_CONFIG_ROWS.map((row) => (
                    <ModuleToggle
                      key={row.id}
                      id={`portal-${row.id}`}
                      label={t(`portalSurfaces.${row.labelKey}`)}
                      product={t(`portalSurfaces.${row.labelKey}Product`)}
                      blurb={t(`portalSurfaces.${row.blurbKey}`)}
                      checked={draftSurfaces.includes(row.id)}
                      disabled={
                        saving ||
                        (row.id === "discussions" &&
                          draftSurfaces.includes("discussions"))
                      }
                      onChange={(next) => {
                        pushUndo();
                        setDraftSurfaces(
                          applyPortalSurfaceToggle(draftSurfaces, row.id, next),
                        );
                      }}
                    />
                  ))}
                </div>
                <div className="rounded-lg border border-dashed border-opseu-blue/40 bg-white p-4">
                  <h3 className="text-sm font-semibold text-opseu-dark">
                    {t("starterTitle")}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">{t("starterBody")}</p>
                  <Button
                    type="button"
                    className="mt-3"
                    disabled={starterBusy || saving}
                    onClick={() => void runCircleStarter()}
                  >
                    {starterBusy ? t("starterBusy") : t("starterCta")}
                  </Button>
                </div>
              </>
            )}
          </section>
        </div>

        <div className="lg:sticky lg:top-[calc(var(--site-header-height,3.5rem)+5rem)]">
          <PreviewPanel modules={draftModules} surfaces={draftSurfaces} />
        </div>
      </div>

      <div className="sticky bottom-0 z-20 -mx-1 border-t border-slate-200 bg-white/95 px-1 py-4 backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            {dirty ? t("unsavedChanges") : t("nextSteps")}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/app/onboarding"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border-2 border-opseu-blue px-4 py-2 text-sm font-semibold text-opseu-blue hover:bg-opseu-blue/5"
            >
              {t("openOnboarding")}
            </Link>
            <Button
              type="button"
              disabled={saving || (scope === "union" && !dirty)}
              onClick={() => void applyChanges()}
            >
              {saving ? t("applying") : t("applyChanges")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
