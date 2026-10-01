"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { BrandLookbook } from "@/components/brand/BrandLookbook";
import { brandKitFromTheme, type LookbookColourSource } from "@/lib/brand/lookbook-kit";
import type { UnionBrandTheme } from "@/lib/brand/union-brand-theme";
import { getUnionPreset } from "@/lib/constants/unionPresets";
import type { CanvasFontId } from "@/lib/comms/canvas-fonts";

type BrandPayload = {
  union: { name: string; commsPresetId: string | null; brandTheme: UnionBrandTheme | null };
  presets: Array<{ id: string; name: string }>;
  fonts: { headline: string[]; body: string[] };
};

const HEX = /^#[0-9A-Fa-f]{6}$/;
const EMPTY_THEME: UnionBrandTheme = {
  primaryColor: "#C2410C",
  secondaryColor: "#FFFFFF",
  accentColor: "#9A3412",
  headlineFontId: "montserrat",
  bodyFontId: "sourceSans",
};

function resolveLookbookTheme(
  themeEnabled: boolean,
  theme: UnionBrandTheme,
  presetId: string,
): UnionBrandTheme | LookbookColourSource {
  if (themeEnabled && HEX.test(theme.primaryColor) && HEX.test(theme.secondaryColor) && HEX.test(theme.accentColor)) {
    return theme;
  }
  const preset = getUnionPreset(presetId);
  if (preset) {
    return {
      primaryColor: preset.primaryColor.toUpperCase(),
      secondaryColor: preset.secondaryColor.toUpperCase(),
      accentColor: (preset.accentColor ?? preset.primaryColor).toUpperCase(),
      headlineFontId: preset.canvasFontDefaults?.headline ?? "montserrat",
      bodyFontId: preset.canvasFontDefaults?.body ?? "sourceSans",
    };
  }
  return EMPTY_THEME;
}

export function UnionBrandForm() {
  const t = useTranslations("hub.unionAdmin");
  const tFonts = useTranslations("brandKit.canvas.fonts");
  const [data, setData] = useState<BrandPayload | null>(null);
  const [presetId, setPresetId] = useState("");
  const [themeEnabled, setThemeEnabled] = useState(false);
  const [theme, setTheme] = useState<UnionBrandTheme>(EMPTY_THEME);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/union-brand", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("load");
        return response.json() as Promise<BrandPayload>;
      })
      .then((payload) => {
        if (cancelled) return;
        setData(payload);
        setPresetId(payload.union.commsPresetId ?? "");
        setThemeEnabled(Boolean(payload.union.brandTheme));
        setTheme(payload.union.brandTheme ?? EMPTY_THEME);
      })
      .catch(() => { if (!cancelled) setError(t("loadFailed")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [t]);

  const updateTheme = (key: keyof UnionBrandTheme, value: string) => {
    setTheme((current) => ({ ...current, [key]: value }));
    setMessage("");
  };

  const lookbookKit = useMemo(
    () => brandKitFromTheme(resolveLookbookTheme(themeEnabled, theme, presetId)),
    [themeEnabled, theme, presetId],
  );

  const save = async () => {
    if (themeEnabled && [theme.primaryColor, theme.secondaryColor, theme.accentColor].some((value) => !HEX.test(value))) {
      setError(t("invalidColor"));
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/union-brand", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commsPresetId: presetId || null,
          brandTheme: themeEnabled ? {
            ...theme,
            primaryColor: theme.primaryColor.toUpperCase(),
            secondaryColor: theme.secondaryColor.toUpperCase(),
            accentColor: theme.accentColor.toUpperCase(),
          } : null,
        }),
      });
      if (!response.ok) throw new Error("save");
      const payload = await response.json() as { union: BrandPayload["union"] };
      setData((current) => current ? { ...current, union: payload.union } : current);
      setMessage(t("saved"));
    } catch {
      setError(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p role="status">{t("directoryLoading")}</p>;
  if (!data) return <p role="alert" className="text-red-700">{error || t("loadFailed")}</p>;

  return (
    <>
      <section className="mt-8 space-y-6 rounded-xl border border-gray-200 bg-white p-4 sm:p-6" aria-label={data.union.name}>
        <p className="text-lg font-semibold text-opseu-dark">{data.union.name}</p>
        <label className="block space-y-1 text-sm font-medium text-opseu-dark">
          <span>{t("presetLabel")}</span>
          <select
            value={presetId}
            onChange={(event) => {
              const next = event.target.value;
              setPresetId(next);
              setMessage("");
              const preset = getUnionPreset(next);
              if (preset && !themeEnabled) {
                setTheme({
                  primaryColor: preset.primaryColor.toUpperCase(),
                  secondaryColor: preset.secondaryColor.toUpperCase(),
                  accentColor: (preset.accentColor ?? preset.primaryColor).toUpperCase(),
                  headlineFontId: preset.canvasFontDefaults?.headline ?? "montserrat",
                  bodyFontId: preset.canvasFontDefaults?.body ?? "sourceSans",
                });
              }
            }}
            className="mt-1 min-h-11 w-full rounded-md border border-gray-300 bg-white px-3"
          >
            <option value="">{t("presetNone")}</option>
            {data.presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
          </select>
        </label>
        <div>
          <h2 className="text-lg font-semibold text-opseu-dark">{t("themeHeading")}</h2>
          <p className="mt-1 text-sm text-gray-600">{t("themeHint")}</p>
          <label className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={themeEnabled} onChange={(event) => setThemeEnabled(event.target.checked)} />
            {t("themeEnabled")}
          </label>
        </div>
        {themeEnabled ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {(["primaryColor", "secondaryColor", "accentColor"] as const).map((key) => (
              <label key={key} className="block text-sm font-medium text-opseu-dark">
                <span>{t(key)}</span>
                <span className="mt-1 flex items-center gap-2">
                  <span className="h-8 w-8 shrink-0 rounded border border-gray-300" style={{ backgroundColor: HEX.test(theme[key]) ? theme[key] : "#FFFFFF" }} aria-hidden="true" />
                  <input value={theme[key]} onChange={(event) => updateTheme(key, event.target.value)} maxLength={7} className="min-h-11 min-w-0 flex-1 rounded-md border border-gray-300 px-3" />
                </span>
              </label>
            ))}
            {(["headlineFontId", "bodyFontId"] as const).map((key) => (
              <label key={key} className="block text-sm font-medium text-opseu-dark">
                <span>{t(key === "headlineFontId" ? "headlineFont" : "bodyFont")}</span>
                <select value={theme[key] ?? ""} onChange={(event) => updateTheme(key, event.target.value)} className="mt-1 min-h-11 w-full rounded-md border border-gray-300 bg-white px-3">
                  {data.fonts[key === "headlineFontId" ? "headline" : "body"].map((font) => (
                    <option key={font} value={font}>{tFonts(font as CanvasFontId)}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        ) : null}
        {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
        {message ? <p role="status" className="text-sm text-green-700">{message}</p> : null}
        <button type="button" disabled={saving} onClick={() => void save()} className="min-h-11 rounded-md bg-opseu-blue px-5 py-2 font-semibold text-white disabled:opacity-60">
          {saving ? t("saving") : t("save")}
        </button>
      </section>

      <section id="lookbook" className="mt-8 scroll-mt-28 space-y-3">
        <h2 className="text-xl font-bold text-opseu-dark">{t("lookbookHeading")}</h2>
        <p className="text-sm text-gray-600">{t("lookbookIntro")}</p>
        <BrandLookbook
          brandKit={lookbookKit}
          hydrated
          mode="full"
          idPrefix="union-brand-lookbook"
          showCommsStyleLink
        />
      </section>
    </>
  );
}
