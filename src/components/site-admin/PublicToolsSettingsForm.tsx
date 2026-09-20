"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { GATEABLE_PUBLIC_TOOL_SLUGS } from "@/lib/public-tools/visibility";

const NAV_KEY_BY_SLUG: Record<string, string> = {
  "flyer-maker": "flyerMaker",
  "graphic-maker": "graphicMaker",
  "logo-builder": "logoBuilder",
  "quote-card": "quoteCard",
  resizer: "resizer",
  "alt-text": "altText",
  "board-notice": "boardNotice",
  "board-banner": "boardBanner",
  "solidarity-poster": "solidarityPoster",
  "qr-board": "qrBoard",
  "qr-card": "qrCard",
  "action-card": "actionCard",
  "meeting-background": "meetingBackground",
  "website-template": "websiteTemplate",
  "document-generator": "documentGenerator",
  "org-chart": "orgChart",
  "rtw-accommodation": "rtwAccommodation",
  "pre-disciplinary-log": "preDisciplinaryLog",
  "complaint-vs-grievance": "complaintVsGrievance",
  "bylaw-builder": "bylawBuilder",
  "proposal-tracker": "proposalTracker",
  "rules-of-order": "rulesOfOrder",
};

type Scope = "platform" | "union" | "local";

export function PublicToolsSettingsForm() {
  const t = useTranslations("hub.platformOperator");
  const nav = useTranslations("nav");
  const [disabled, setDisabled] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [unionId, setUnionId] = useState("");
  const [localId, setLocalId] = useState("");
  const [scope, setScope] = useState<Scope>("platform");

  const load = async (nextScope: Scope = scope) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (unionId) params.set("unionId", unionId);
      if (localId) params.set("localId", localId);
      const res = await fetch(`/api/site-admin/public-tools?${params}`);
      if (!res.ok) throw new Error(t("publicToolsLoadFailed"));
      const data = (await res.json()) as {
        platform: { disabledToolSlugs: string[] };
        union: { disabledToolSlugs: string[] } | null;
        local: { disabledToolSlugs: string[] } | null;
      };
      const list =
        nextScope === "platform"
          ? data.platform.disabledToolSlugs
          : nextScope === "union"
            ? (data.union?.disabledToolSlugs ?? [])
            : (data.local?.disabledToolSlugs ?? []);
      setDisabled(new Set(list));
    } catch {
      setError(t("publicToolsLoadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    // Initial fetch uses thenable callbacks only — no synchronous setState in
    // the effect body (react-hooks/set-state-in-effect).
    void fetch("/api/site-admin/public-tools")
      .then(async (res) => {
        if (!res.ok) throw new Error("fail");
        const data = (await res.json()) as {
          platform: { disabledToolSlugs: string[] };
          union: { disabledToolSlugs: string[] } | null;
          local: { disabledToolSlugs: string[] } | null;
        };
        if (cancelled) return;
        setDisabled(new Set(data.platform.disabledToolSlugs));
      })
      .catch(() => {
        if (!cancelled) setError(t("publicToolsLoadFailed"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const toggle = (slug: string) => {
    setDisabled((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (scope === "union" && !unionId.trim()) {
        throw new Error(t("publicToolsUnionRequired"));
      }
      if (scope === "local" && (!unionId.trim() || !localId.trim())) {
        throw new Error(t("publicToolsLocalRequired"));
      }
      const res = await fetch("/api/site-admin/public-tools", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          unionId: unionId.trim() || undefined,
          localId: localId.trim() || undefined,
          disabledToolSlugs: [...disabled],
        }),
      });
      if (!res.ok) throw new Error(t("publicToolsSaveFailed"));
      setSuccess(t("publicToolsSaved"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("publicToolsSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {(["platform", "union", "local"] as const).map((s) => (
          <Button
            key={s}
            type="button"
            size="sm"
            variant={scope === s ? "primary" : "outline"}
            onClick={() => {
              setScope(s);
              void load(s);
            }}
          >
            {t(`publicToolsScope.${s}`)}
          </Button>
        ))}
      </div>

      {scope !== "platform" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-opseu-dark">
              {t("publicToolsUnionId")}
            </span>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
              value={unionId}
              onChange={(e) => setUnionId(e.target.value)}
              onBlur={() => void load(scope)}
            />
          </label>
          {scope === "local" && (
            <label className="block text-sm">
              <span className="font-medium text-opseu-dark">
                {t("publicToolsLocalId")}
              </span>
              <input
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
                value={localId}
                onChange={(e) => setLocalId(e.target.value)}
                onBlur={() => void load(scope)}
              />
            </label>
          )}
        </div>
      )}

      <p className="text-sm text-opseu-gray-dark">{t("publicToolsHint")}</p>

      {error && (
        <Callout tone="warning">
          <p>{error}</p>
        </Callout>
      )}
      {success && (
        <Callout>
          <p>{success}</p>
        </Callout>
      )}

      {loading ? (
        <p className="text-sm text-gray-600">{t("publicToolsLoading")}</p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {GATEABLE_PUBLIC_TOOL_SLUGS.map((slug) => {
            const enabled = !disabled.has(slug);
            return (
              <li
                key={slug}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-opseu-dark">
                    {NAV_KEY_BY_SLUG[slug]
                      ? nav(NAV_KEY_BY_SLUG[slug] as Parameters<typeof nav>[0])
                      : slug}
                  </p>
                  <p className="text-xs text-gray-500">/tools/{slug}</p>
                </div>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => toggle(slug)}
                  />
                  {enabled
                    ? t("publicToolsEnabled")
                    : t("publicToolsDisabled")}
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <Button type="button" onClick={() => void save()} disabled={saving}>
        {saving ? t("publicToolsSaving") : t("publicToolsSave")}
      </Button>
    </div>
  );
}
