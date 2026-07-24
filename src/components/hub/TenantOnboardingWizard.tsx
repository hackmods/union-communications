"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Callout } from "@/components/ui/Callout";
import { Skeleton } from "@/components/ui/Skeleton";
import type { TenantContext, TenantSeed } from "@/types/tenant";

type TenantGetResponse = {
  context: TenantContext;
  canManageOnboarding: boolean;
  canCreateUnion: boolean;
};

export function TenantOnboardingWizard() {
  const t = useTranslations("tenantOnboarding");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [ctx, setCtx] = useState<TenantContext | null>(null);
  const [canCreateUnion, setCanCreateUnion] = useState(false);

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

  if (loading) {
    return (
      <PageShell size="focus" className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </PageShell>
    );
  }

  return (
    <PageShell size="focus" className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-opseu-dark md:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-gray-600">{t("subtitle")}</p>
      </header>

      <Callout tone="muted">
        <p className="font-medium text-gray-800">{t("memoryNoteTitle")}</p>
        <p className="mt-1">{t("memoryNoteBody")}</p>
      </Callout>

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

      {ctx && (
        <section className="space-y-3" aria-labelledby="current-tenant-heading">
          <h2
            id="current-tenant-heading"
            className="text-sm font-medium text-gray-700"
          >
            {t("currentTenant")}
          </h2>
          <p className="text-sm text-gray-800">
            {ctx.union.name}
            {ctx.division ? ` · ${ctx.division.name}` : ""}
          </p>
          <ul className="list-inside list-disc text-sm text-gray-700">
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
                      (
                      {units.map((u) => u.name).join(", ")})
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="space-y-3" aria-labelledby="add-local-heading">
        <h2
          id="add-local-heading"
          className="text-sm font-medium text-gray-700"
        >
          {t("addLocalTitle")}
        </h2>
        <p className="text-sm text-gray-600">{t("addLocalHint")}</p>
        <form onSubmit={handleCreateLocal} className="space-y-3">
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
          <Button type="submit" className="min-h-11">
            {t("createLocal")}
          </Button>
        </form>
      </section>

      {ctx && ctx.locals.length > 0 && (
        <section className="space-y-3" aria-labelledby="add-collection-heading">
          <h2
            id="add-collection-heading"
            className="text-sm font-medium text-gray-700"
          >
            {t("addCollectionTitle")}
          </h2>
          <form onSubmit={handleCreateCollection} className="space-y-3">
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
            <Button type="submit" className="min-h-11">
              {t("createCollection")}
            </Button>
          </form>
        </section>
      )}

      {canCreateUnion && (
        <section className="space-y-3" aria-labelledby="new-union-heading">
          <h2
            id="new-union-heading"
            className="text-sm font-medium text-gray-700"
          >
            {t("newUnionTitle")}
          </h2>
          <Callout tone="muted">
            <p className="font-medium text-gray-800">{t("noOpseuTitle")}</p>
            <p className="mt-1">{t("noOpseuBody")}</p>
          </Callout>
          <form onSubmit={handleCreateUnion} className="space-y-3">
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
            <Input
              label={t("firstLocalOptional")}
              value={newLocalNumber}
              onChange={(e) => setNewLocalNumber(e.target.value)}
              autoComplete="off"
            />
            <p className="text-sm text-gray-600">{t("unionNotesPlaceholder")}</p>
            <Button type="submit" className="min-h-11">
              {t("createUnion")}
            </Button>
          </form>
          {createdUnion && (
            <p className="text-sm text-gray-700" role="status">
              {t("unionCreatedDetail", {
                name: createdUnion.union.name,
                id: createdUnion.union.id,
                slug: createdUnion.union.slug,
              })}
            </p>
          )}
        </section>
      )}
    </PageShell>
  );
}
