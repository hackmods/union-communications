"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { CustomizationScope } from "@/lib/customization/types";

type Props = {
  unions: Array<{ id: string; name: string }>;
  enabled: boolean;
  configurationError: string | null;
};

const systemTarget: CustomizationScope = { id: "system", kind: "system", archived: false };

export function CustomizationAdminPanel({ unions, enabled, configurationError }: Props) {
  const t = useTranslations("hub.platformOperator.customization");
  const [scopes, setScopes] = useState<CustomizationScope[]>([]);
  const [selectedUnionId, setSelectedUnionId] = useState(unions[0]?.id ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resourceId, setResourceId] = useState<string | null>(null);
  const [lockVersion, setLockVersion] = useState(0);
  const [generation, setGeneration] = useState(1);
  const [titleEn, setTitleEn] = useState("");
  const [titleFr, setTitleFr] = useState("");

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
      const unionTarget: CustomizationScope = {
        id: `union-${selectedUnionId}`,
        kind: "union",
        unionId: selectedUnionId,
        parentScopeId: "system",
        archived: false,
      };
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

  async function createGuideDraft() {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      if (!selectedUnionId) throw new Error(t("pickUnion"));
      const target: CustomizationScope = {
        id: `union-${selectedUnionId}`,
        kind: "union",
        unionId: selectedUnionId,
        parentScopeId: "system",
        archived: false,
      };
      const created = await postJson("/api/site-admin/customization/resources", {
        target,
        key: "guide:custom-meeting",
        kind: "guide",
        slug: "custom-meeting",
      });
      const payload = {
        schemaVersion: 1,
        key: "guide:custom-meeting",
        scopeId: target.id,
        revisionId: "draft-1",
        mode: "define",
        resource: {
          schemaVersion: 1,
          key: "guide:custom-meeting",
          policy: { audience: "public", enabled: true, editableFields: ["title", "blocks", "sources"] },
          payload: {
            kind: "guide",
            title: { en: titleEn.trim() || "Custom meeting guide", fr: titleFr.trim() || "Guide de réunion personnalisé" },
            blocks: [{
              id: "prepare",
              type: "paragraph",
              audience: "public",
              sourceIds: [],
              content: {
                en: [{ type: "text", text: "Prepare with your local." }],
                fr: [{ type: "text", text: "Préparez-vous avec votre section locale." }],
              },
            }],
            sources: [],
          },
        },
      };
      const hashRes = await fetch("/api/site-admin/customization/resources/" + encodeURIComponent(created.resourceId) + "/draft", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "If-Match": "0" },
        body: JSON.stringify({
          target,
          resourceId: created.resourceId,
          expectedLockVersion: 0,
          payload,
          reason: "Root empty-state draft",
          markReviewed: true,
        }),
      });
      const draft = await hashRes.json();
      if (!hashRes.ok) throw new Error(typeof draft.error === "string" ? draft.error : t("requestFailed"));
      setResourceId(created.resourceId);
      setLockVersion(draft.lockVersion ?? 1);
      setGeneration(1);
      setStatus(t("draftSaved"));
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
      const target: CustomizationScope = {
        id: `union-${selectedUnionId}`,
        kind: "union",
        unionId: selectedUnionId,
        parentScopeId: "system",
        archived: false,
      };
      const result = await postJson(`/api/site-admin/customization/resources/${encodeURIComponent(resourceId)}/publish`, {
        target,
        resourceId,
        reason: "Root publish from empty state",
        idempotencyKey: `ui-publish-${resourceId}-${generation}`,
        expectedDraftLockVersion: lockVersion,
        expectedGeneration: generation,
        scopes: [systemTarget, target],
      });
      setGeneration(result.generation ?? generation + 1);
      setStatus(t("published", { releaseId: result.releaseId }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("requestFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (!enabled) {
    return (
      <div className="rounded-lg border border-opseu-orange/30 bg-white px-4 py-5" role="status">
        <h2 className="text-lg font-semibold text-opseu-dark">{t("disabledTitle")}</h2>
        <p className="mt-2 text-sm text-opseu-gray-dark">
          {configurationError ?? t("disabledBody")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-opseu-dark">
            {t("titleEn")}
            <input
              className="mt-1 w-full rounded border border-opseu-gray/30 px-3 py-2 text-sm"
              value={titleEn}
              onChange={(event) => setTitleEn(event.target.value)}
              disabled={busy}
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
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded bg-opseu-blue px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            onClick={() => void createGuideDraft()}
            disabled={busy || !selectedUnionId}
          >
            {t("saveDraft")}
          </button>
          <button
            type="button"
            className="rounded border border-opseu-blue px-3 py-2 text-sm font-medium text-opseu-blue disabled:opacity-50"
            onClick={() => void publishDraft()}
            disabled={busy || !resourceId}
          >
            {t("publish")}
          </button>
        </div>
        {resourceId ? (
          <p className="mt-3 text-xs text-opseu-gray-dark">{t("resourceId", { id: resourceId, lockVersion, generation })}</p>
        ) : null}
      </section>

      {status ? <p className="text-sm text-opseu-dark" role="status">{status}</p> : null}
      {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
    </div>
  );
}
