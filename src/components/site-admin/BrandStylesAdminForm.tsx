"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { canvasFontFamily, type CanvasFontId } from "@/lib/comms/canvas-fonts";
import { getUnionPreset } from "@/lib/constants/unionPresets";
import type { UnionBrandTheme } from "@/lib/brand/union-brand-theme";

type UnionRow = {
  id: string;
  name: string;
  slug: string;
  commsPresetId: string | null;
  brandTheme: UnionBrandTheme | null;
  isDemo: boolean;
};

type PresetOption = { id: string; name: string };

type Draft = {
  slug: string;
  commsPresetId: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  headlineFontId: string;
  bodyFontId: string;
  themeEnabled: boolean;
};

type Fonts = { headline: string[]; body: string[] };

const HEX = /^#[0-9A-Fa-f]{6}$/;

function draftFromRow(row: UnionRow): Draft {
  const theme = row.brandTheme;
  return {
    slug: row.slug,
    commsPresetId: row.commsPresetId ?? "",
    primaryColor: theme?.primaryColor ?? "#C2410C",
    secondaryColor: theme?.secondaryColor ?? "#FFFFFF",
    accentColor: theme?.accentColor ?? "#9A3412",
    headlineFontId: theme?.headlineFontId ?? "montserrat",
    bodyFontId: theme?.bodyFontId ?? "sourceSans",
    themeEnabled: Boolean(theme),
  };
}

function safeHex(value: string, fallback: string): string {
  return HEX.test(value) ? value.toUpperCase() : fallback;
}

function themeValid(draft: Draft): boolean {
  if (!draft.themeEnabled) return true;
  return (
    HEX.test(draft.primaryColor.trim()) &&
    HEX.test(draft.secondaryColor.trim()) &&
    HEX.test(draft.accentColor.trim())
  );
}

function isDirty(row: UnionRow, draft: Draft): boolean {
  const base = draftFromRow(row);
  return (
    draft.slug.trim() !== base.slug ||
    draft.commsPresetId !== base.commsPresetId ||
    draft.themeEnabled !== base.themeEnabled ||
    (draft.themeEnabled &&
      (draft.primaryColor.toUpperCase() !== base.primaryColor ||
        draft.secondaryColor.toUpperCase() !== base.secondaryColor ||
        draft.accentColor.toUpperCase() !== base.accentColor ||
        draft.headlineFontId !== base.headlineFontId ||
        draft.bodyFontId !== base.bodyFontId))
  );
}

function ColourChips({
  primary,
  secondary,
  accent,
  label,
}: {
  primary: string;
  secondary: string;
  accent: string;
  label: string;
}) {
  return (
    <div
      className="mt-2 flex items-center gap-1.5"
      role="img"
      aria-label={label}
    >
      {[
        safeHex(primary, "#C2410C"),
        safeHex(secondary, "#FFFFFF"),
        safeHex(accent, "#9A3412"),
      ].map((c, i) => (
        <span
          key={`${c}-${i}`}
          className="inline-block h-4 w-4 rounded-sm border border-opseu-gray/30"
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

function seedThemeFromPreset(presetId: string): Partial<Draft> | null {
  const preset = getUnionPreset(presetId);
  if (!preset) return null;
  return {
    primaryColor: preset.primaryColor.toUpperCase(),
    secondaryColor: preset.secondaryColor.toUpperCase(),
    accentColor: (
      preset.accentColor ?? preset.primaryColor
    ).toUpperCase(),
    ...(preset.canvasFontDefaults
      ? {
          headlineFontId: preset.canvasFontDefaults.headline,
          bodyFontId: preset.canvasFontDefaults.body,
        }
      : {}),
  };
}

export function BrandStylesAdminForm() {
  const t = useTranslations("hub.platformOperator");
  const tFonts = useTranslations("brandKit.canvas.fonts");
  const statusId = useId();
  const [unions, setUnions] = useState<UnionRow[]>([]);
  const [presets, setPresets] = useState<PresetOption[]>([]);
  const [fonts, setFonts] = useState<Fonts>({
    headline: ["montserrat"],
    body: ["sourceSans"],
  });
  const [customizationAvailable, setCustomizationAvailable] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [baselineBusyId, setBaselineBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const applyPayload = (data: {
    unions: UnionRow[];
    presets: PresetOption[];
    fonts?: Fonts;
    customizationAvailable?: boolean;
  }) => {
    setUnions(data.unions);
    setPresets(data.presets);
    if (data.fonts) setFonts(data.fonts);
    setCustomizationAvailable(Boolean(data.customizationAvailable));
    const next: Record<string, Draft> = {};
    for (const row of data.unions) {
      next[row.id] = draftFromRow(row);
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
          fonts?: Fonts;
          customizationAvailable?: boolean;
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
        fonts?: Fonts;
        customizationAvailable?: boolean;
      };
      applyPayload(data);
    } catch {
      setError(t("brandStylesLoadFailed"));
    }
  };

  const themePayload = (draft: Draft): UnionBrandTheme | null => {
    if (!draft.themeEnabled) return null;
    return {
      primaryColor: draft.primaryColor.trim().toUpperCase(),
      secondaryColor: draft.secondaryColor.trim().toUpperCase(),
      accentColor: draft.accentColor.trim().toUpperCase(),
      headlineFontId: draft.headlineFontId,
      bodyFontId: draft.bodyFontId,
    };
  };

  const fontLabel = (id: string) => {
    try {
      return tFonts(id as CanvasFontId);
    } catch {
      return id;
    }
  };

  const presetName = (id: string) =>
    presets.find((p) => p.id === id)?.name ?? id;

  const save = async (unionId: string): Promise<boolean> => {
    const draft = drafts[unionId];
    if (!draft) return false;
    if (!themeValid(draft)) {
      setError(t("brandStylesInvalidHex"));
      setSuccess(null);
      return false;
    }
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
          brandTheme: themePayload(draft),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "save");
      }
      setSuccess(t("brandStylesSaved"));
      await reload();
      return true;
    } catch (err) {
      setError(
        err instanceof Error && err.message !== "save"
          ? err.message
          : t("brandStylesSaveFailed"),
      );
      return false;
    } finally {
      setSavingId(null);
    }
  };

  const publishBaseline = async (unionId: string, publish: boolean) => {
    const draft = drafts[unionId];
    if (!draft?.themeEnabled) return;
    if (!themeValid(draft)) {
      setError(t("brandStylesInvalidHex"));
      return;
    }
    const theme = themePayload(draft);
    if (!theme) return;
    setBaselineBusyId(unionId);
    setError(null);
    setSuccess(null);
    try {
      const saved = await save(unionId);
      if (!saved) return;
      const res = await fetch("/api/site-admin/brand-styles/baseline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unionId,
          brandTheme: theme,
          publish,
          reason: publish
            ? "Publish brand:baseline from Brand Styles"
            : "Draft brand:baseline from Brand Styles",
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "baseline");
      }
      setSuccess(
        publish
          ? t("brandStylesBaselinePublished")
          : t("brandStylesBaselineDrafted"),
      );
    } catch (err) {
      setError(
        err instanceof Error && err.message !== "baseline"
          ? err.message
          : t("brandStylesBaselineFailed"),
      );
    } finally {
      setBaselineBusyId(null);
    }
  };

  if (loading) {
    return (
      <p className="mt-6 text-sm text-opseu-gray-dark" aria-live="polite">
        {t("brandStylesLoading")}
      </p>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <div id={statusId} aria-live="polite">
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
      </div>

      {unions.length === 0 ? (
        <Callout tone="brand">
          <p>{t("brandStylesEmpty")}</p>
          <p className="mt-2 text-sm">
            <Link
              href="/app/site-admin/locals"
              className="text-opseu-blue underline-offset-2 hover:underline"
            >
              {t("brandStylesEmptyLocalsLink")}
            </Link>
          </p>
        </Callout>
      ) : (
        <ul className="space-y-4">
          {unions.map((row) => {
            const draft = drafts[row.id] ?? draftFromRow(row);
            const open = expandedId === row.id;
            const dirty = isDirty(row, draft);
            const valid = themeValid(draft);
            return (
              <li
                key={row.id}
                className="rounded-md border border-opseu-gray/15 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-opseu-dark">{row.name}</p>
                    {row.isDemo ? (
                      <p className="text-xs text-opseu-gray-dark">
                        {t("brandStylesDemo")}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-opseu-gray-dark">
                      {draft.commsPresetId
                        ? presetName(draft.commsPresetId)
                        : t("brandStylesPresetNone")}
                      {draft.themeEnabled
                        ? ` · ${t("brandStylesThemeOn")}`
                        : ""}
                      {dirty ? ` · ${t("brandStylesUnsaved")}` : ""}
                    </p>
                    {draft.themeEnabled ? (
                      <ColourChips
                        primary={draft.primaryColor}
                        secondary={draft.secondaryColor}
                        accent={draft.accentColor}
                        label={t("brandStylesColourPreview", {
                          union: row.name,
                        })}
                      />
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    aria-expanded={open}
                    aria-controls={`brand-style-panel-${row.id}`}
                    onClick={() =>
                      setExpandedId((id) => (id === row.id ? null : row.id))
                    }
                  >
                    {open
                      ? t("brandStylesCollapse")
                      : t("brandStylesEditTheme")}
                  </Button>
                </div>

                {open ? (
                  <div
                    id={`brand-style-panel-${row.id}`}
                    className="mt-4 space-y-4 border-t border-opseu-gray/10 pt-4"
                  >
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label
                          className="block text-xs font-medium text-opseu-gray-dark"
                          htmlFor={`slug-${row.id}`}
                        >
                          {t("brandStylesColSlug")}
                        </label>
                        <input
                          id={`slug-${row.id}`}
                          className="mt-1 w-full rounded border border-opseu-gray/25 px-2 py-1.5 text-opseu-dark"
                          value={draft.slug}
                          autoComplete="off"
                          spellCheck={false}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [row.id]: { ...draft, slug: e.target.value },
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label
                          className="block text-xs font-medium text-opseu-gray-dark"
                          htmlFor={`preset-${row.id}`}
                        >
                          {t("brandStylesColPreset")}
                        </label>
                        <select
                          id={`preset-${row.id}`}
                          className="mt-1 w-full rounded border border-opseu-gray/25 px-2 py-1.5 text-opseu-dark"
                          value={draft.commsPresetId}
                          onChange={(e) => {
                            const nextPreset = e.target.value;
                            const seeded =
                              draft.themeEnabled && nextPreset
                                ? seedThemeFromPreset(nextPreset)
                                : null;
                            setDrafts((prev) => ({
                              ...prev,
                              [row.id]: {
                                ...draft,
                                commsPresetId: nextPreset,
                                ...(seeded ?? {}),
                              },
                            }));
                          }}
                        >
                          <option value="">{t("brandStylesPresetNone")}</option>
                          {presets.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="rounded border border-opseu-gray/10 bg-opseu-gray/5 p-3">
                      <label className="flex items-center gap-2 text-sm text-opseu-dark">
                        <input
                          type="checkbox"
                          checked={draft.themeEnabled}
                          onChange={(e) => {
                            const enabled = e.target.checked;
                            const seeded =
                              enabled && draft.commsPresetId
                                ? seedThemeFromPreset(draft.commsPresetId)
                                : null;
                            setDrafts((prev) => ({
                              ...prev,
                              [row.id]: {
                                ...draft,
                                themeEnabled: enabled,
                                ...(seeded ?? {}),
                              },
                            }));
                          }}
                        />
                        {t("brandStylesThemeEnable")}
                      </label>
                      <p className="mt-1 text-xs text-opseu-gray-dark">
                        {t("brandStylesThemeHint")}
                      </p>

                      {draft.themeEnabled ? (
                        <>
                          <div
                            className="mt-3 overflow-hidden rounded border border-opseu-gray/15"
                            aria-hidden
                          >
                            <div
                              className="flex h-10"
                              style={{
                                background: `linear-gradient(90deg, ${safeHex(draft.primaryColor, "#C2410C")} 0 34%, ${safeHex(draft.secondaryColor, "#FFFFFF")} 34% 67%, ${safeHex(draft.accentColor, "#9A3412")} 67% 100%)`,
                              }}
                            />
                            <p
                              className="bg-white px-3 py-2 text-sm font-semibold text-opseu-dark"
                              style={{
                                fontFamily: canvasFontFamily(
                                  (draft.headlineFontId as CanvasFontId) ||
                                    "montserrat",
                                ),
                              }}
                            >
                              {t("brandStylesPreviewSample")}
                            </p>
                          </div>
                          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            {(
                              [
                                ["primaryColor", "brandStylesColorPrimary"],
                                [
                                  "secondaryColor",
                                  "brandStylesColorSecondary",
                                ],
                                ["accentColor", "brandStylesColorAccent"],
                              ] as const
                            ).map(([key, labelKey]) => {
                              const invalid = !HEX.test(draft[key].trim());
                              return (
                                <div key={key}>
                                  <label
                                    className="block text-xs font-medium text-opseu-gray-dark"
                                    htmlFor={`${key}-${row.id}`}
                                  >
                                    {t(labelKey)}
                                  </label>
                                  <div className="mt-1 flex items-center gap-2">
                                    <input
                                      type="color"
                                      id={`${key}-${row.id}`}
                                      className="h-9 w-12 cursor-pointer rounded border border-opseu-gray/25 bg-white"
                                      value={safeHex(draft[key], "#C2410C")}
                                      onChange={(e) =>
                                        setDrafts((prev) => ({
                                          ...prev,
                                          [row.id]: {
                                            ...draft,
                                            [key]: e.target.value.toUpperCase(),
                                          },
                                        }))
                                      }
                                    />
                                    <input
                                      className={`w-full rounded border px-2 py-1.5 font-mono text-sm text-opseu-dark ${
                                        invalid
                                          ? "border-red-500"
                                          : "border-opseu-gray/25"
                                      }`}
                                      value={draft[key]}
                                      spellCheck={false}
                                      aria-invalid={invalid}
                                      onChange={(e) =>
                                        setDrafts((prev) => ({
                                          ...prev,
                                          [row.id]: {
                                            ...draft,
                                            [key]: e.target.value,
                                          },
                                        }))
                                      }
                                    />
                                  </div>
                                </div>
                              );
                            })}
                            <div>
                              <label
                                className="block text-xs font-medium text-opseu-gray-dark"
                                htmlFor={`headline-${row.id}`}
                              >
                                {t("brandStylesFontHeadline")}
                              </label>
                              <select
                                id={`headline-${row.id}`}
                                className="mt-1 w-full rounded border border-opseu-gray/25 px-2 py-1.5 text-opseu-dark"
                                value={draft.headlineFontId}
                                style={{
                                  fontFamily: canvasFontFamily(
                                    draft.headlineFontId as CanvasFontId,
                                  ),
                                }}
                                onChange={(e) =>
                                  setDrafts((prev) => ({
                                    ...prev,
                                    [row.id]: {
                                      ...draft,
                                      headlineFontId: e.target.value,
                                    },
                                  }))
                                }
                              >
                                {fonts.headline.map((id) => (
                                  <option
                                    key={id}
                                    value={id}
                                    style={{
                                      fontFamily: canvasFontFamily(
                                        id as CanvasFontId,
                                      ),
                                    }}
                                  >
                                    {fontLabel(id)}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label
                                className="block text-xs font-medium text-opseu-gray-dark"
                                htmlFor={`body-${row.id}`}
                              >
                                {t("brandStylesFontBody")}
                              </label>
                              <select
                                id={`body-${row.id}`}
                                className="mt-1 w-full rounded border border-opseu-gray/25 px-2 py-1.5 text-opseu-dark"
                                value={draft.bodyFontId}
                                style={{
                                  fontFamily: canvasFontFamily(
                                    draft.bodyFontId as CanvasFontId,
                                  ),
                                }}
                                onChange={(e) =>
                                  setDrafts((prev) => ({
                                    ...prev,
                                    [row.id]: {
                                      ...draft,
                                      bodyFontId: e.target.value,
                                    },
                                  }))
                                }
                              >
                                {fonts.body.map((id) => (
                                  <option
                                    key={id}
                                    value={id}
                                    style={{
                                      fontFamily: canvasFontFamily(
                                        id as CanvasFontId,
                                      ),
                                    }}
                                  >
                                    {fontLabel(id)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          {!valid ? (
                            <p className="mt-2 text-xs text-red-800">
                              {t("brandStylesInvalidHex")}
                            </p>
                          ) : null}
                        </>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={
                          savingId === row.id ||
                          !dirty ||
                          (draft.themeEnabled && !valid)
                        }
                        onClick={() => void save(row.id)}
                      >
                        {savingId === row.id
                          ? t("brandStylesSaving")
                          : t("brandStylesSave")}
                      </Button>
                      {customizationAvailable && draft.themeEnabled ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={
                              baselineBusyId === row.id ||
                              !valid ||
                              savingId === row.id
                            }
                            onClick={() =>
                              void publishBaseline(row.id, false)
                            }
                          >
                            {baselineBusyId === row.id
                              ? t("brandStylesBaselineBusy")
                              : t("brandStylesBaselineDraft")}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={
                              baselineBusyId === row.id ||
                              !valid ||
                              savingId === row.id
                            }
                            onClick={() => void publishBaseline(row.id, true)}
                          >
                            {baselineBusyId === row.id
                              ? t("brandStylesBaselineBusy")
                              : t("brandStylesBaselinePublish")}
                          </Button>
                        </>
                      ) : null}
                    </div>
                    {!customizationAvailable ? (
                      <p className="text-xs text-opseu-gray-dark">
                        {t("brandStylesBaselineUnavailable")}{" "}
                        <Link
                          href="/app/site-admin/customization"
                          className="text-opseu-blue underline-offset-2 hover:underline"
                        >
                          {t("customizationCard")}
                        </Link>
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
