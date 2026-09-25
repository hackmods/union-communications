"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";

type UnionRow = {
  id: string;
  name: string;
  slug: string;
  commsPresetId: string | null;
  isDemo: boolean;
};

type PresetOption = { id: string; name: string };

export function BrandStylesAdminForm() {
  const t = useTranslations("hub.platformOperator");
  const [unions, setUnions] = useState<UnionRow[]>([]);
  const [presets, setPresets] = useState<PresetOption[]>([]);
  const [drafts, setDrafts] = useState<
    Record<string, { slug: string; commsPresetId: string }>
  >({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const applyPayload = (data: {
    unions: UnionRow[];
    presets: PresetOption[];
  }) => {
    setUnions(data.unions);
    setPresets(data.presets);
    const next: Record<string, { slug: string; commsPresetId: string }> = {};
    for (const row of data.unions) {
      next[row.id] = {
        slug: row.slug,
        commsPresetId: row.commsPresetId ?? "",
      };
    }
    setDrafts(next);
  };

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/site-admin/brand-styles")
      .then(async (res) => {
        if (!res.ok) throw new Error("load");
        const data = (await res.json()) as {
          unions: UnionRow[];
          presets: PresetOption[];
        };
        if (cancelled) return;
        applyPayload(data);
      })
      .catch(() => {
        if (!cancelled) setError(t("brandStylesLoadFailed"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const reload = async () => {
    setError(null);
    try {
      const res = await fetch("/api/site-admin/brand-styles");
      if (!res.ok) throw new Error("load");
      const data = (await res.json()) as {
        unions: UnionRow[];
        presets: PresetOption[];
      };
      applyPayload(data);
    } catch {
      setError(t("brandStylesLoadFailed"));
    }
  };

  const save = async (unionId: string) => {
    const draft = drafts[unionId];
    if (!draft) return;
    setSavingId(unionId);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/site-admin/brand-styles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unionId,
          slug: draft.slug.trim(),
          commsPresetId: draft.commsPresetId.trim()
            ? draft.commsPresetId.trim()
            : null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "save");
      }
      setSuccess(t("brandStylesSaved"));
      await reload();
    } catch (err) {
      setError(
        err instanceof Error && err.message !== "save"
          ? err.message
          : t("brandStylesSaveFailed"),
      );
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <p className="mt-6 text-sm text-opseu-gray-dark">{t("brandStylesLoading")}</p>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {error ? (
        <Callout tone="danger">
          <p>{error}</p>
          <p className="mt-1 text-sm">{t("brandStylesErrorRemedy")}</p>
        </Callout>
      ) : null}
      {success ? (
        <Callout tone="success">
          <p>{success}</p>
        </Callout>
      ) : null}

      {unions.length === 0 ? (
        <Callout tone="brand">
          <p>{t("brandStylesEmpty")}</p>
        </Callout>
      ) : (
        <div className="overflow-x-auto rounded-md border border-opseu-gray/15 bg-white">
          <table className="min-w-full divide-y divide-opseu-gray/15 text-sm">
            <thead className="bg-opseu-gray/5 text-left text-xs uppercase text-opseu-gray-dark">
              <tr>
                <th className="px-3 py-2">{t("brandStylesColUnion")}</th>
                <th className="px-3 py-2">{t("brandStylesColSlug")}</th>
                <th className="px-3 py-2">{t("brandStylesColPreset")}</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-opseu-gray/10">
              {unions.map((row) => {
                const draft = drafts[row.id] ?? {
                  slug: row.slug,
                  commsPresetId: row.commsPresetId ?? "",
                };
                return (
                  <tr key={row.id}>
                    <td className="px-3 py-3 align-top">
                      <p className="font-medium text-opseu-dark">{row.name}</p>
                      {row.isDemo ? (
                        <p className="text-xs text-opseu-gray-dark">
                          {t("brandStylesDemo")}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 align-top">
                      <label className="sr-only" htmlFor={`slug-${row.id}`}>
                        {t("brandStylesColSlug")}
                      </label>
                      <input
                        id={`slug-${row.id}`}
                        className="w-full min-w-[8rem] rounded border border-opseu-gray/25 px-2 py-1.5 text-opseu-dark"
                        value={draft.slug}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [row.id]: { ...draft, slug: e.target.value },
                          }))
                        }
                      />
                    </td>
                    <td className="px-3 py-3 align-top">
                      <label className="sr-only" htmlFor={`preset-${row.id}`}>
                        {t("brandStylesColPreset")}
                      </label>
                      <select
                        id={`preset-${row.id}`}
                        className="w-full min-w-[10rem] rounded border border-opseu-gray/25 px-2 py-1.5 text-opseu-dark"
                        value={draft.commsPresetId}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [row.id]: {
                              ...draft,
                              commsPresetId: e.target.value,
                            },
                          }))
                        }
                      >
                        <option value="">{t("brandStylesPresetNone")}</option>
                        {presets.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3 align-top text-right">
                      <Button
                        type="button"
                        size="sm"
                        disabled={savingId === row.id}
                        onClick={() => void save(row.id)}
                      >
                        {savingId === row.id
                          ? t("brandStylesSaving")
                          : t("brandStylesSave")}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
