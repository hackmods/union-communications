"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Callout } from "@/components/ui/Callout";
import { Skeleton } from "@/components/ui/Skeleton";
import { PublicHubPanel } from "@/components/comms/PublicHubPanel";
import { PUBLIC_PAGE_TITLE_CLASS } from "@/lib/constants/public-type";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";
import type { TenantContext, TenantSeed } from "@/types/tenant";
import { cn } from "@/lib/utils";

type TenantGetResponse = {
  context: TenantContext;
  canManageOnboarding: boolean;
  canCreateUnion: boolean;
  durableTenants?: boolean;
};

export function TenantOnboardingWizard() {
  const t = useTranslations("tenantOnboarding");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [ctx, setCtx] = useState<TenantContext | null>(null);
  const [canCreateUnion, setCanCreateUnion] = useState(false);
  const [durableTenants, setDurableTenants] = useState(false);
  const [hallStatus, setHallStatus] = useState<string | null>(null);
  const [hallBusy, setHallBusy] = useState(false);
  const hubPublic = isOfficerHubPublic();

  const [localNumber, setLocalNumber] = useState("");
  const [subText, setSubText] = useState("");
  const [collectionCode, setCollectionCode] = useState("");
  const [collectionName, setCollectionName] = useState("");

  const [addUnitLocalId, setAddUnitLocalId] = useState("");
  const [unitCode, setUnitCode] = useState("");
  const [unitName, setUnitName] = useState("");

  const [unionName, setUnionName] = useState("");
  const [unionSlug, setUnionSlug] = useState("");
  const [newLocalNumber, setNewLocalNumber] = useState("");
  const [createdUnion, setCreatedUnion] = useState<TenantSeed | null>(null);

  async function refresh() {
    const res = await fetch("/api/tenant");
    if (!res.ok) throw new Error("fail");
    const data = (await res.json()) as TenantGetResponse;
    setCtx(data.context);
    setCanCreateUnion(data.canCreateUnion);
    setDurableTenants(data.durableTenants === true);
    if (!addUnitLocalId && data.context.locals[0]) {
      setAddUnitLocalId(data.context.locals[0].id);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await refresh();
      } catch {
        if (!cancelled) setError(t("loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load
  }, [t]);

  async function handleCreateLocal(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const res = await fetch("/api/tenant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_local",
        localNumber,
        subText,
        ...(collectionCode && collectionName
          ? { collectionCode, collectionName }
          : {}),
      }),
    });
    if (!res.ok) {
      setError(t("saveError"));
      return;
    }
    const data = (await res.json()) as { context: TenantContext };
    setCtx(data.context);
    setMessage(t("localCreated"));
    setLocalNumber("");
    setSubText("");
    setCollectionCode("");
    setCollectionName("");
    window.dispatchEvent(new Event("unionops:tenant-updated"));
  }

  async function handleCreateCollection(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const res = await fetch("/api/tenant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_collection",
        localId: addUnitLocalId,
        code: unitCode,
        name: unitName,
      }),
    });
    if (!res.ok) {
      setError(t("saveError"));
      return;
    }
    const data = (await res.json()) as { context: TenantContext };
    setCtx(data.context);
    setMessage(t("collectionCreated"));
    setUnitCode("");
    setUnitName("");
    window.dispatchEvent(new Event("unionops:tenant-updated"));
  }

  async function handleCreateUnion(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const res = await fetch("/api/tenant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_union",
        name: unionName,
        ...(unionSlug ? { slug: unionSlug } : {}),
        ...(newLocalNumber
          ? {
              localNumber: newLocalNumber,
              localSubText: "Support Staff",
              collectionCode: "default",
              collectionName: "Default collection",
            }
          : {}),
      }),
    });
    if (!res.ok) {
      setError(t("saveError"));
      return;
    }
    const data = (await res.json()) as { seed: TenantSeed };
    setCreatedUnion(data.seed);
    setMessage(t("unionCreated"));
    setUnionName("");
    setUnionSlug("");
    setNewLocalNumber("");
  }

  async function handleEnsureHall() {
    setHallBusy(true);
    setHallStatus(null);
    setError(null);
    try {
      const res = await fetch("/api/portal/hall/ensure", { method: "POST" });
      if (!res.ok) {
        setHallStatus(t("hallError"));
        return;
      }
      setHallStatus(t("hallReady"));
    } catch {
      setHallStatus(t("hallError"));
    } finally {
      setHallBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64 max-w-full" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="max-w-3xl">
        <h1 className={PUBLIC_PAGE_TITLE_CLASS}>{t("title")}</h1>
        <p className="mt-2 max-w-prose text-base leading-relaxed text-gray-600">
          {t("subtitle")}
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {!hubPublic && (
          <Callout tone="brand" measure="fill">
            <p className="font-medium text-gray-800">{t("earlyAccessTitle")}</p>
            <p className="mt-1 text-sm leading-relaxed">{t("earlyAccessBody")}</p>
          </Callout>
        )}
        <Callout
          tone={durableTenants ? "success" : "muted"}
          measure="fill"
          className={cn(!hubPublic ? undefined : "lg:col-span-2")}
        >
          <p className="font-medium text-gray-800">
            {durableTenants ? t("durableNoteTitle") : t("memoryNoteTitle")}
          </p>
          <p className="mt-1 text-sm leading-relaxed">
            {durableTenants ? t("durableNoteBody") : t("memoryNoteBody")}
          </p>
        </Callout>
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="text-sm text-green-700" role="status">
          {message}
        </p>
      )}

      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <PublicHubPanel
          title={t("checklistTitle")}
          description={t("checklistHint")}
          className="xl:col-span-1"
        >
          <ol className="list-decimal space-y-3 pl-5 text-sm text-gray-800">
            <li>{t("checklistLocal")}</li>
            <li>
              <Link href="/brand-kit" className="text-opseu-blue underline">
                {t("checklistBrand")}
              </Link>
            </li>
            <li>
              <div className="flex flex-wrap items-center gap-2">
                <span>{t("checklistHall")}</span>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  disabled={hallBusy}
                  onClick={() => void handleEnsureHall()}
                >
                  {hallBusy ? t("hallWorking") : t("openHall")}
                </Button>
                <Link href="/portal" className="text-opseu-blue underline">
                  {t("hallLink")}
                </Link>
              </div>
              {hallStatus && (
                <p className="mt-1 text-gray-700" role="status">
                  {hallStatus}
                </p>
              )}
            </li>
            <li>
              <Link href="/app/invites" className="text-opseu-blue underline">
                {t("checklistInvites")}
              </Link>
            </li>
          </ol>
        </PublicHubPanel>

        {ctx && (
          <PublicHubPanel title={t("currentTenant")}>
            <p className="text-sm text-gray-800">
              {ctx.union.name}
              {ctx.division ? ` · ${ctx.division.name}` : ""}
            </p>
            <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-gray-700">
              {ctx.locals.map((local) => {
                const units = ctx.bargainingUnits.filter(
                  (u) => u.localId === local.id,
                );
                return (
                  <li key={local.id}>
                    {t("localLabel", { number: local.localNumber })}
                    {local.subText ? ` — ${local.subText}` : ""}
                    {units.length > 0 && (
                      <span className="text-gray-500">
                        {" "}
                        ({units.map((u) => u.name).join(", ")})
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </PublicHubPanel>
        )}

        <PublicHubPanel
          title={t("addLocalTitle")}
          description={t("addLocalHint")}
        >
          <form onSubmit={handleCreateLocal} className="grid gap-3 sm:grid-cols-2">
            <Input
              label={t("localNumber")}
              value={localNumber}
              onChange={(e) => setLocalNumber(e.target.value)}
              required
              autoComplete="off"
            />
            <Input
              label={t("subText")}
              value={subText}
              onChange={(e) => setSubText(e.target.value)}
              autoComplete="off"
            />
            <Input
              label={t("optionalCollectionCode")}
              value={collectionCode}
              onChange={(e) => setCollectionCode(e.target.value)}
              autoComplete="off"
            />
            <Input
              label={t("optionalCollectionName")}
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              autoComplete="off"
            />
            <div className="sm:col-span-2">
              <Button type="submit" className="min-h-11">
                {t("createLocal")}
              </Button>
            </div>
          </form>
        </PublicHubPanel>

        {ctx && ctx.locals.length > 0 && (
          <PublicHubPanel title={t("addCollectionTitle")}>
            <form
              onSubmit={handleCreateCollection}
              className="grid gap-3 sm:grid-cols-2"
            >
              <div className="sm:col-span-2">
                <Select
                  label={t("forLocal")}
                  value={addUnitLocalId}
                  onChange={(e) => setAddUnitLocalId(e.target.value)}
                  required
                >
                  {ctx.locals.map((local) => (
                    <option key={local.id} value={local.id}>
                      {t("localLabel", { number: local.localNumber })}
                    </option>
                  ))}
                </Select>
              </div>
              <Input
                label={t("collectionCode")}
                value={unitCode}
                onChange={(e) => setUnitCode(e.target.value)}
                required
                autoComplete="off"
              />
              <Input
                label={t("collectionName")}
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                required
                autoComplete="off"
              />
              <div className="sm:col-span-2">
                <Button type="submit" className="min-h-11">
                  {t("createCollection")}
                </Button>
              </div>
            </form>
          </PublicHubPanel>
        )}

        {canCreateUnion && (
          <PublicHubPanel
            title={t("newUnionTitle")}
            className="lg:col-span-2 xl:col-span-1"
          >
            <Callout tone="muted" measure="fill">
              <p className="font-medium text-gray-800">{t("noOpseuTitle")}</p>
              <p className="mt-1 text-sm leading-relaxed">{t("noOpseuBody")}</p>
            </Callout>
            <form
              onSubmit={handleCreateUnion}
              className="mt-3 grid gap-3 sm:grid-cols-2"
            >
              <Input
                label={t("unionName")}
                value={unionName}
                onChange={(e) => setUnionName(e.target.value)}
                required
                autoComplete="organization"
              />
              <Input
                label={t("unionSlug")}
                value={unionSlug}
                onChange={(e) => setUnionSlug(e.target.value)}
                autoComplete="off"
              />
              <div className="sm:col-span-2">
                <Input
                  label={t("firstLocalOptional")}
                  value={newLocalNumber}
                  onChange={(e) => setNewLocalNumber(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <p className="text-sm text-gray-600 sm:col-span-2">
                {t("unionNotesPlaceholder")}
              </p>
              <div className="sm:col-span-2">
                <Button type="submit" className="min-h-11">
                  {t("createUnion")}
                </Button>
              </div>
            </form>
            {createdUnion && (
              <p className="mt-3 text-sm text-gray-700" role="status">
                {t("unionCreatedDetail", {
                  name: createdUnion.union.name,
                  id: createdUnion.union.id,
                  slug: createdUnion.union.slug,
                })}
              </p>
            )}
          </PublicHubPanel>
        )}
      </div>
    </div>
  );
}
