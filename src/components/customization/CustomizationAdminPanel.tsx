"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { CustomizationScope } from "@/lib/customization/types";

type Props = {
  unions: Array<{ id: string; name: string; slug?: string }>;
  enabled: boolean;
  configurationError: string | null;
};

type HistoryPayload = {
  releases: Array<{ id: string; revisionId: string; publishedBy: string; createdAt: string }>;
  audits: Array<{ id: string; action: string; reason: string; actorId: string; createdAt: string }>;
};

type ConfirmAction = "withdraw" | "rollback" | "inherit" | null;

const systemTarget: CustomizationScope = { id: "system", kind: "system", archived: false };

export function CustomizationAdminPanel({ unions, enabled, configurationError }: Props) {
  const t = useTranslations("hub.platformOperator.customization");
  const errorRef = useRef<HTMLParagraphElement>(null);
  const errorId = useId();
  const [scopes, setScopes] = useState<CustomizationScope[]>([]);
  const [selectedUnionId, setSelectedUnionId] = useState(unions[0]?.id ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resourceId, setResourceId] = useState<string | null>(null);
  const [resourceKey, setResourceKey] = useState("guide:custom-meeting");
  const [lockVersion, setLockVersion] = useState(0);
  const [generation, setGeneration] = useState(1);
  const [policyVersion, setPolicyVersion] = useState(1);
  const [lastRevisionId, setLastRevisionId] = useState<string | null>(null);
  const [titleEn, setTitleEn] = useState("");
  const [titleFr, setTitleFr] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [bodyFr, setBodyFr] = useState("");
  const [sourceUrl, setSourceUrl] = useState("https://example.org/reference");
  const [primaryColor, setPrimaryColor] = useState("#112233");
  const [reason, setReason] = useState("");
  const [publicListing, setPublicListing] = useState(false);
  const [localeTab, setLocaleTab] = useState<"en" | "fr">("en");
  const [previewTitle, setPreviewTitle] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryPayload | null>(null);
  const [kind, setKind] = useState<"guide" | "brand" | "source">("guide");
  const [audience, setAudience] = useState<"public" | "verified_member" | "local_officer">("public");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [publishedHref, setPublishedHref] = useState<string | null>(null);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  function selectedUnion() {
    return unions.find((union) => union.id === selectedUnionId);
  }

  function currentTarget(): CustomizationScope {
    return {
      id: `union-${selectedUnionId}`,
      kind: "union",
      unionId: selectedUnionId,
      parentScopeId: "system",
      archived: false,
    };
  }

  function mutationReason(fallback: string) {
    const trimmed = reason.trim();
    return trimmed || fallback;
  }

  async function postJson(url: string, body: unknown) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : t("requestFailed"));
    return data;
  }

  async function patchDraft(url: string, body: unknown) {
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : t("requestFailed"));
    return data;
  }

  async function refreshScopes(target: CustomizationScope) {
    const data = await postJson("/api/site-admin/customization/scopes", { action: "list", target });
    setScopes(Array.isArray(data.scopes) ? data.scopes : []);
  }

  async function ensureUnionScope() {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      if (!selectedUnionId) throw new Error(t("pickUnion"));
      const unionTarget = currentTarget();
      await postJson("/api/site-admin/customization/scopes", {
        action: "create",
        target: systemTarget,
        scope: systemTarget,
      }).catch(() => null);
      await postJson("/api/site-admin/customization/scopes", {
        action: "create",
        target: unionTarget,
        scope: unionTarget,
      });
      await refreshScopes(unionTarget);
      setStatus(t("scopeReady", { unionId: selectedUnionId }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("requestFailed"));
    } finally {
      setBusy(false);
    }
  }

  function buildPayload(target: CustomizationScope, key: string) {
    if (kind === "brand") {
      return {
        schemaVersion: 1,
        key,
        scopeId: target.id,
        revisionId: "draft-1",
        mode: "define",
        resource: {
          schemaVersion: 1,
          key,
          policy: { audience, enabled: true, editableFields: ["label", "logoAssetId"] },
          payload: {
            kind: "brand",
            label: { en: titleEn.trim() || "Union brand", fr: titleFr.trim() || "Marque syndicale" },
            primaryColor: primaryColor.trim() || "#112233",
            secondaryColor: "#445566",
            accentColor: "#778899",
            headlineFontId: "montserrat",
            bodyFontId: "sourceSans",
            logoAssetId: null,
          },
        },
      };
    }
    if (kind === "source") {
      return {
        schemaVersion: 1,
        key,
        scopeId: target.id,
        revisionId: "draft-1",
        mode: "define",
        resource: {
          schemaVersion: 1,
          key,
          policy: { audience, enabled: true, editableFields: ["label"] },
          payload: {
            kind: "source",
            label: { en: titleEn.trim() || "Reference source", fr: titleFr.trim() || "Source de référence" },
            note: { en: bodyEn.trim() || "Reviewed by Root", fr: bodyFr.trim() || "Relu par Root" },
            url: sourceUrl.trim() || "https://example.org/reference",
            publisher: "Example",
            jurisdiction: "Example",
            applicability: { en: "Example only", fr: "Exemple seulement" },
            checkedAt: "2026-09-22",
            reviewDueAt: "2027-09-22",
            rightsNote: null,
          },
        },
      };
    }
    return {
      schemaVersion: 1,
      key,
      scopeId: target.id,
      revisionId: "draft-1",
      mode: "define",
      resource: {
        schemaVersion: 1,
        key,
        policy: { audience, enabled: true, editableFields: ["title", "blocks", "sources"] },
        payload: {
          kind: "guide",
          title: { en: titleEn.trim() || "Custom meeting guide", fr: titleFr.trim() || "Guide de réunion personnalisé" },
          blocks: [{
            id: "prepare",
            type: "paragraph",
            audience,
            sourceIds: [],
            content: {
              en: [{ type: "text", text: bodyEn.trim() || "Prepare with your local." }],
              fr: [{ type: "text", text: bodyFr.trim() || "Préparez-vous avec votre section locale." }],
            },
          }],
          sources: [],
        },
      },
    };
  }

  async function createDraft() {
    setBusy(true);
    setError(null);
    setStatus(null);
    setPublishedHref(null);
    try {
      if (!selectedUnionId) throw new Error(t("pickUnion"));
      const target = currentTarget();
      const key = kind === "guide" ? "guide:custom-meeting" : kind === "brand" ? "brand:baseline" : `source:root-${selectedUnionId}`;
      const created = await postJson("/api/site-admin/customization/resources", {
        target,
        key,
        kind,
        slug: kind === "guide" ? "custom-meeting" : undefined,
      });
      const payload = buildPayload(target, key);
      const draft = await patchDraft(`/api/site-admin/customization/resources/${encodeURIComponent(created.resourceId)}/draft`, {
        target,
        resourceId: created.resourceId,
        expectedLockVersion: 0,
        payload,
        reason: mutationReason("Root empty-state draft"),
        markReviewed: true,
      });
      setResourceId(created.resourceId);
      setResourceKey(key);
      setLockVersion(draft.lockVersion ?? 1);
      setGeneration(1);
      setPolicyVersion(1);
      setLastRevisionId(null);
      setPreviewTitle(null);
      setStatus(t("draftSaved"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("requestFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function previewDraft() {
    if (!resourceId || !selectedUnionId) return;
    setBusy(true);
    setError(null);
    try {
      const target = currentTarget();
      const preview = await postJson(`/api/site-admin/customization/resources/${encodeURIComponent(resourceId)}/preview`, {
        target,
        resourceId,
        locale: localeTab,
        scopes: [systemTarget, target],
        reason: mutationReason("Root private preview"),
      });
      setPreviewTitle(String(preview.discovery?.title ?? preview.fragments?.[0]?.payload?.title ?? ""));
      setStatus(t("previewReady"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("requestFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function publishDraft() {
    if (!resourceId || !selectedUnionId) return;
    setBusy(true);
    setError(null);
    try {
      const target = currentTarget();
      const result = await postJson(`/api/site-admin/customization/resources/${encodeURIComponent(resourceId)}/publish`, {
        target,
        resourceId,
        reason: mutationReason("Root publish from empty state"),
        idempotencyKey: `ui-publish-${resourceId}-${generation}`,
        expectedDraftLockVersion: lockVersion,
        expectedGeneration: generation,
        scopes: [systemTarget, target],
      });
      setGeneration(result.generation ?? generation + 1);
      setLastRevisionId(result.revisionId ?? null);
      setStatus(t("published", { releaseId: result.releaseId }));
      const slug = selectedUnion()?.slug;
      if (kind === "guide" && slug) {
        setPublishedHref(`/learn/custom/${slug}/custom-meeting`);
      }
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("requestFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function withdrawResource() {
    if (!resourceId || !selectedUnionId) return;
    setBusy(true);
    setError(null);
    setConfirmAction(null);
    try {
      const target = currentTarget();
      const result = await postJson(`/api/site-admin/customization/resources/${encodeURIComponent(resourceId)}/policy`, {
        target,
        resourceId,
        reason: mutationReason("Emergency withdrawal"),
        expectedPolicyVersion: policyVersion,
        withdrawn: true,
      });
      setPolicyVersion(result.policyVersion ?? policyVersion + 1);
      setPublishedHref(null);
      setStatus(t("withdrawn"));
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("requestFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function rollbackResource() {
    if (!resourceId || !selectedUnionId || !lastRevisionId) return;
    setBusy(true);
    setError(null);
    setConfirmAction(null);
    try {
      const target = currentTarget();
      const result = await postJson(`/api/site-admin/customization/resources/${encodeURIComponent(resourceId)}/rollback`, {
        target,
        resourceId,
        historicalRevisionId: lastRevisionId,
        reason: mutationReason("Rollback to last published revision"),
        idempotencyKey: `ui-rollback-${resourceId}-${generation}`,
        expectedDraftLockVersion: lockVersion,
        expectedGeneration: generation,
        scopes: [systemTarget, target],
      });
      setGeneration(result.generation ?? generation + 1);
      setLockVersion(lockVersion + 1);
      setLastRevisionId(result.revisionId ?? lastRevisionId);
      setStatus(t("rolledBack", { releaseId: result.releaseId }));
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("requestFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function inheritResource() {
    if (!resourceId || !selectedUnionId) return;
    setBusy(true);
    setError(null);
    setConfirmAction(null);
    try {
      const target = currentTarget();
      const result = await postJson(`/api/site-admin/customization/resources/${encodeURIComponent(resourceId)}/inherit`, {
        target,
        resourceId,
        key: resourceKey,
        reason: mutationReason("Inherit again from ancestors"),
        expectedLockVersion: lockVersion,
        scopes: [systemTarget, target],
      });
      setLockVersion(result.lockVersion ?? lockVersion + 1);
      setStatus(t("inherited"));
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("requestFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function setResourceAudience() {
    if (!resourceId || !selectedUnionId) return;
    setBusy(true);
    setError(null);
    try {
      const target = currentTarget();
      const result = await postJson(`/api/site-admin/customization/resources/${encodeURIComponent(resourceId)}/policy`, {
        target,
        resourceId,
        reason: mutationReason(`Set audience to ${audience}`),
        expectedPolicyVersion: policyVersion,
        audience,
        publicListing: audience === "public" ? publicListing : false,
      });
      setPolicyVersion(result.policyVersion ?? policyVersion + 1);
      setStatus(t("audienceUpdated", { audience: t(`audience.${audience}`) }));
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("requestFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function loadHistory() {
    if (!resourceId || !selectedUnionId) return;
    const target = currentTarget();
    const data = await postJson(`/api/site-admin/customization/resources/${encodeURIComponent(resourceId)}/history`, {
      target,
      resourceId,
      limit: 10,
    });
    setHistory(data as HistoryPayload);
  }

  if (!enabled) {
    return (
      <div className="rounded-lg border border-opseu-orange/30 bg-white px-4 py-5" role="status">
        <h2 className="text-lg font-semibold text-opseu-dark">{t("disabledTitle")}</h2>
        <p className="mt-2 text-sm text-opseu-gray-dark">{configurationError ?? t("disabledBody")}</p>
      </div>
    );
  }

  const scopeLabel = selectedUnionId ? `union-${selectedUnionId}` : t("noScope");

  return (
    <div className="space-y-6" aria-busy={busy}>
      <p className="text-sm font-medium text-opseu-dark" aria-live="polite">
        {t("scopeHeading", { scope: scopeLabel })}
      </p>

      <section className="rounded-lg border border-opseu-gray/15 bg-white px-4 py-5 shadow-sm">
        <h2 className="text-lg font-semibold text-opseu-dark">{t("emptyTitle")}</h2>
        <p className="mt-2 text-sm text-opseu-gray-dark">{t("emptyBody")}</p>
        <label className="mt-4 block text-sm font-medium text-opseu-dark" htmlFor="customization-union">
          {t("unionLabel")}
        </label>
        <select
          id="customization-union"
          className="mt-1 w-full max-w-md rounded border border-opseu-gray/30 px-3 py-2 text-sm"
          value={selectedUnionId}
          onChange={(event) => setSelectedUnionId(event.target.value)}
          disabled={busy || unions.length === 0}
        >
          {unions.length === 0 ? <option value="">{t("noUnions")}</option> : null}
          {unions.map((union) => (
            <option key={union.id} value={union.id}>{union.name}</option>
          ))}
        </select>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded bg-opseu-blue px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            onClick={() => void ensureUnionScope()}
            disabled={busy || !selectedUnionId}
          >
            {t("createScope")}
          </button>
        </div>
        {scopes.length > 0 ? (
          <p className="mt-3 text-sm text-opseu-gray-dark" aria-live="polite">
            {t("scopeCount", { count: scopes.length })}
          </p>
        ) : null}
      </section>

      <section className="rounded-lg border border-opseu-gray/15 bg-white px-4 py-5 shadow-sm">
        <h2 className="text-lg font-semibold text-opseu-dark">{t("editorTitle")}</h2>
        <p className="mt-2 text-sm text-opseu-gray-dark">{t("editorBody")}</p>
        <fieldset className="mt-4">
          <legend className="text-sm font-medium text-opseu-dark">{t("kindLabel")}</legend>
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            {(["guide", "brand", "source"] as const).map((value) => (
              <label key={value} className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="customization-kind"
                  checked={kind === value}
                  onChange={() => setKind(value)}
                  disabled={busy}
                />
                {t(`kind.${value}`)}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-4 flex gap-2" role="tablist" aria-label={t("localeTabs")}>
          {(["en", "fr"] as const).map((locale) => (
            <button
              key={locale}
              type="button"
              role="tab"
              aria-selected={localeTab === locale}
              className={`rounded px-3 py-1.5 text-sm ${localeTab === locale ? "bg-opseu-blue text-white" : "border border-opseu-gray/30"}`}
              onClick={() => setLocaleTab(locale)}
            >
              {locale.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-opseu-dark">
            {t("titleEn")}
            <input
              className="mt-1 w-full rounded border border-opseu-gray/30 px-3 py-2 text-sm"
              value={titleEn}
              onChange={(event) => setTitleEn(event.target.value)}
              disabled={busy}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
            />
          </label>
          <label className="block text-sm font-medium text-opseu-dark">
            {t("titleFr")}
            <input
              className="mt-1 w-full rounded border border-opseu-gray/30 px-3 py-2 text-sm"
              value={titleFr}
              onChange={(event) => setTitleFr(event.target.value)}
              disabled={busy}
            />
          </label>
        </div>
        {kind !== "brand" ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-opseu-dark">
              {t("bodyEn")}
              <textarea
                className="mt-1 min-h-24 w-full rounded border border-opseu-gray/30 px-3 py-2 text-sm"
                value={bodyEn}
                onChange={(event) => setBodyEn(event.target.value)}
                disabled={busy}
              />
            </label>
            <label className="block text-sm font-medium text-opseu-dark">
              {t("bodyFr")}
              <textarea
                className="mt-1 min-h-24 w-full rounded border border-opseu-gray/30 px-3 py-2 text-sm"
                value={bodyFr}
                onChange={(event) => setBodyFr(event.target.value)}
                disabled={busy}
              />
            </label>
          </div>
        ) : (
          <label className="mt-4 block text-sm font-medium text-opseu-dark" htmlFor="customization-primary">
            {t("primaryColor")}
            <input
              id="customization-primary"
              type="text"
              className="mt-1 w-full max-w-xs rounded border border-opseu-gray/30 px-3 py-2 font-mono text-sm"
              value={primaryColor}
              onChange={(event) => setPrimaryColor(event.target.value)}
              disabled={busy}
            />
          </label>
        )}
        {kind === "source" ? (
          <label className="mt-4 block text-sm font-medium text-opseu-dark" htmlFor="customization-source-url">
            {t("sourceUrl")}
            <input
              id="customization-source-url"
              type="url"
              className="mt-1 w-full rounded border border-opseu-gray/30 px-3 py-2 text-sm"
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              disabled={busy}
            />
          </label>
        ) : null}
        <label className="mt-4 block text-sm font-medium text-opseu-dark" htmlFor="customization-reason">
          {t("reasonLabel")}
          <input
            id="customization-reason"
            className="mt-1 w-full rounded border border-opseu-gray/30 px-3 py-2 text-sm"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={busy}
            placeholder={t("reasonPlaceholder")}
          />
        </label>
        <label className="mt-4 block text-sm font-medium text-opseu-dark" htmlFor="customization-audience">
          {t("audienceLabel")}
          <select
            id="customization-audience"
            className="mt-1 w-full max-w-md rounded border border-opseu-gray/30 px-3 py-2 text-sm"
            value={audience}
            onChange={(event) => setAudience(event.target.value as typeof audience)}
            disabled={busy || !resourceId}
          >
            <option value="public">{t("audience.public")}</option>
            <option value="verified_member">{t("audience.verified_member")}</option>
            <option value="local_officer">{t("audience.local_officer")}</option>
          </select>
        </label>
        <p className="mt-1 text-xs text-opseu-gray-dark">{t("audienceHint")}</p>
        {audience === "public" ? (
          <label className="mt-3 inline-flex items-center gap-2 text-sm text-opseu-dark">
            <input
              type="checkbox"
              checked={publicListing}
              onChange={(event) => setPublicListing(event.target.checked)}
              disabled={busy || !resourceId}
            />
            {t("publicListing")}
          </label>
        ) : null}
        <p className="mt-3 text-xs text-opseu-gray-dark">{t("impactHint")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="rounded bg-opseu-blue px-3 py-2 text-sm font-medium text-white disabled:opacity-50" onClick={() => void createDraft()} disabled={busy || !selectedUnionId}>{busy ? t("working") : t("saveDraft")}</button>
          <button type="button" className="rounded border border-opseu-blue px-3 py-2 text-sm font-medium text-opseu-blue disabled:opacity-50" onClick={() => void previewDraft()} disabled={busy || !resourceId}>{t("preview")}</button>
          <button type="button" className="rounded border border-opseu-blue px-3 py-2 text-sm font-medium text-opseu-blue disabled:opacity-50" onClick={() => void publishDraft()} disabled={busy || !resourceId}>{t("publish")}</button>
          <button type="button" className="rounded border border-opseu-blue px-3 py-2 text-sm font-medium text-opseu-blue disabled:opacity-50" onClick={() => void setResourceAudience()} disabled={busy || !resourceId}>{t("setAudience")}</button>
          <button type="button" className="rounded border border-opseu-orange px-3 py-2 text-sm font-medium text-opseu-orange disabled:opacity-50" onClick={() => setConfirmAction("withdraw")} disabled={busy || !resourceId}>{t("withdraw")}</button>
          <button type="button" className="rounded border border-opseu-gray/40 px-3 py-2 text-sm font-medium disabled:opacity-50" onClick={() => setConfirmAction("rollback")} disabled={busy || !resourceId || !lastRevisionId}>{t("rollback")}</button>
          <button type="button" className="rounded border border-opseu-gray/40 px-3 py-2 text-sm font-medium disabled:opacity-50" onClick={() => setConfirmAction("inherit")} disabled={busy || !resourceId}>{t("inherit")}</button>
        </div>
        {confirmAction ? (
          <div className="mt-4 rounded border border-opseu-orange/40 bg-opseu-orange/5 p-3" role="alertdialog" aria-labelledby="customization-confirm-title">
            <p id="customization-confirm-title" className="text-sm font-semibold text-opseu-dark">
              {t(`confirm.${confirmAction}.title`)}
            </p>
            <p className="mt-1 text-sm text-opseu-gray-dark">{t(`confirm.${confirmAction}.body`)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded bg-opseu-orange px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                disabled={busy}
                onClick={() => {
                  if (confirmAction === "withdraw") void withdrawResource();
                  if (confirmAction === "rollback") void rollbackResource();
                  if (confirmAction === "inherit") void inheritResource();
                }}
              >
                {t("confirm.proceed")}
              </button>
              <button
                type="button"
                className="rounded border border-opseu-gray/40 px-3 py-2 text-sm"
                disabled={busy}
                onClick={() => setConfirmAction(null)}
              >
                {t("confirm.cancel")}
              </button>
            </div>
          </div>
        ) : null}
        {resourceId ? (
          <p className="mt-3 text-xs text-opseu-gray-dark">{t("resourceId", { id: resourceId, lockVersion, generation })}</p>
        ) : null}
        {publishedHref ? (
          <p className="mt-3 text-sm">
            <Link href={publishedHref} className="font-medium text-opseu-blue underline underline-offset-2">
              {t("openPublished")}
            </Link>
          </p>
        ) : null}
        {previewTitle ? (
          <div className="mt-4 rounded border border-dashed border-opseu-gray/30 p-3" aria-live="polite">
            <p className="text-xs font-semibold uppercase tracking-wide text-opseu-gray-dark">{t("previewLabel")}</p>
            <p className="mt-1 text-sm text-opseu-dark">{previewTitle}</p>
            <p className="mt-1 text-xs text-opseu-gray-dark">{t("previewPrivate")}</p>
          </div>
        ) : null}
      </section>

      {history ? (
        <section className="rounded-lg border border-opseu-gray/15 bg-white px-4 py-5 shadow-sm">
          <h2 className="text-lg font-semibold text-opseu-dark">{t("historyTitle")}</h2>
          <ul className="mt-3 space-y-2 text-sm text-opseu-gray-dark">
            {history.releases.map((release) => (
              <li key={release.id}>{t("historyRelease", { id: release.id, by: release.publishedBy })}</li>
            ))}
            {history.audits.map((entry) => (
              <li key={entry.id}>{t("historyAudit", { action: entry.action, reason: entry.reason })}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {status ? <p className="text-sm text-opseu-dark" role="status">{status}</p> : null}
      {error ? (
        <p
          id={errorId}
          ref={errorRef}
          tabIndex={-1}
          className="text-sm text-red-700 outline-none"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
