"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { UndoRedoBar } from "@/components/tools/UndoRedoBar";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { useBrandStore } from "@/store/brand-store";
import {
  defaultFieldsForPreset,
  getPreset,
  OFFICE_COLOR_KEYS,
  OFFICE_PRESETS,
  paletteForColorKey,
  resolveOfficeTemplateUrls,
  type OfficeColorKey,
  type OfficePresetId,
} from "@/lib/constants/office-templates";
import {
  exportDocx,
  exportOfficeBundle,
  exportPptx,
  exportXlsx,
  renderDocx,
  renderPptx,
  renderXlsx,
} from "@/lib/export/office-export";
import { fillForPreset } from "@/lib/export/office-fills";
import { cn, formatFilename, resolveLocalNumber } from "@/lib/utils";

export interface GeneratorState {
  presetId: OfficePresetId;
  colorKey: OfficeColorKey;
  includeDocx: boolean;
  includeXlsx: boolean;
  includePptx: boolean;
  fields: Record<string, string>;
}

function initialState(
  presetId: OfficePresetId = "quick-event",
): GeneratorState {
  const preset = getPreset(presetId);
  return {
    presetId,
    colorKey: "brand",
    includeDocx: true,
    includeXlsx: preset.outputs.xlsx,
    includePptx: true,
    fields: defaultFieldsForPreset(preset),
  };
}

export default function DocumentGeneratorPage() {
  const t = useTranslations("documentGenerator");
  const tc = useTranslations("common");
  const brandKit = useBrandStore((s) => s.brandKit);
  const { state, setState, undo, redo, canUndo, canRedo, reset } =
    useUndoRedo<GeneratorState>(initialState());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preset = getPreset(state.presetId);
  const urls = resolveOfficeTemplateUrls(preset, state.colorKey);
  const palette = paletteForColorKey(state.colorKey, {
    primary: brandKit.primaryColor,
    secondary: brandKit.secondaryColor,
    accent: brandKit.accentColor,
  });
  const localNumber = brandKit.local.localNumber;
  const localLabel = `Local ${resolveLocalNumber(localNumber)}`;

  const tagData: Record<string, string> = {
    localNumber: resolveLocalNumber(localNumber),
    ...state.fields,
  };

  function applyPreset(id: OfficePresetId) {
    const next = getPreset(id);
    setState({
      ...state,
      presetId: id,
      includeDocx: next.outputs.docx,
      includeXlsx: next.outputs.xlsx,
      includePptx: next.outputs.pptx,
      fields: defaultFieldsForPreset(next),
    });
  }

  function setField(key: string, value: string) {
    setState({
      ...state,
      fields: { ...state.fields, [key]: value },
    });
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : tc("exportFailed"));
    } finally {
      setBusy(false);
    }
  }

  const pptxOpts = {
    title: state.fields.title ?? "",
    subtitle: state.fields.subtitle ?? state.fields.headline,
    body: state.fields.body,
    localLabel,
    palette,
    fields: tagData,
  };

  function handleDownloadDocx() {
    if (!urls.docx) return;
    void run(() =>
      exportDocx({
        templateUrl: urls.docx!,
        data: tagData,
        filename: formatFilename(preset.fileStem, localNumber, "docx"),
      }),
    );
  }

  function handleDownloadXlsx() {
    if (!urls.xlsx) return;
    void run(() =>
      exportXlsx({
        templateUrl: urls.xlsx!,
        filename: formatFilename(preset.fileStem, localNumber, "xlsx"),
        fill: fillForPreset(preset.id, tagData),
      }),
    );
  }

  function handleDownloadPptx() {
    void run(() =>
      exportPptx({
        ...pptxOpts,
        filename: formatFilename(preset.fileStem, localNumber, "pptx"),
      }),
    );
  }

  function handleDownloadZip() {
    void run(async () => {
      const files: { name: string; blob: Promise<Blob> | Blob }[] = [];
      if (state.includeDocx && urls.docx) {
        files.push({
          name: formatFilename(preset.fileStem, localNumber, "docx"),
          blob: renderDocx({ templateUrl: urls.docx, data: tagData }),
        });
      }
      if (state.includeXlsx && urls.xlsx) {
        files.push({
          name: formatFilename(preset.fileStem, localNumber, "xlsx"),
          blob: renderXlsx({
            templateUrl: urls.xlsx,
            fill: fillForPreset(preset.id, tagData),
          }),
        });
      }
      if (state.includePptx) {
        files.push({
          name: formatFilename(preset.fileStem, localNumber, "pptx"),
          blob: renderPptx(pptxOpts),
        });
      }
      if (files.length === 0) {
        throw new Error(t("selectOutput"));
      }
      await exportOfficeBundle({
        zipFilename: formatFilename(
          `${preset.fileStem}-pack`,
          localNumber,
          "zip",
        ),
        files,
      });
    });
  }

  return (
    <PageShell className="py-8 md:py-12">
      <div className="mb-8 max-w-prose">
        <h1 className="text-3xl font-bold text-opseu-dark md:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-gray-600">{t("subtitle")}</p>
      </div>

      <section className="mb-8" aria-labelledby="recommended-heading">
        <h2
          id="recommended-heading"
          className="mb-3 text-lg font-semibold text-opseu-dark"
        >
          {t("recommended")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {OFFICE_PRESETS.map((p) => {
            const selected = state.presetId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className={cn(
                  "rounded-xl border p-4 text-left transition-colors",
                  selected
                    ? "border-opseu-blue bg-opseu-blue/5 ring-2 ring-opseu-blue/30"
                    : "border-gray-200 bg-white hover:border-opseu-blue/40",
                )}
                aria-pressed={selected}
              >
                <p className="font-semibold text-opseu-dark">
                  {t(p.titleKey)}
                </p>
                <p className="mt-1 text-sm text-gray-600">{t(p.blurbKey)}</p>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>{t("settings")}</CardTitle>
            <UndoRedoBar
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={undo}
              onRedo={redo}
              onReset={() => reset(initialState(state.presetId))}
            />
          </div>

          <div>
            <label
              htmlFor="design-preset"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              {t("designPreset")}
            </label>
            <select
              id="design-preset"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-opseu-blue focus:ring-2 focus:ring-opseu-blue/20"
              value={state.presetId}
              onChange={(e) => applyPreset(e.target.value as OfficePresetId)}
            >
              {OFFICE_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {t(p.titleKey)}
                </option>
              ))}
            </select>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-gray-700">
              {t("colorTheme")}
            </legend>
            <p className="mb-2 text-xs text-gray-500">{t("colorHint")}</p>
            <div className="flex flex-wrap gap-2">
              {OFFICE_COLOR_KEYS.map((key) => {
                const swatch = paletteForColorKey(key, {
                  primary: brandKit.primaryColor,
                  secondary: brandKit.secondaryColor,
                  accent: brandKit.accentColor,
                });
                const selected = state.colorKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setState({ ...state, colorKey: key })}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium",
                      selected
                        ? "border-opseu-blue ring-2 ring-opseu-blue/30"
                        : "border-gray-200",
                    )}
                    aria-pressed={selected}
                  >
                    <span
                      className="h-4 w-4 rounded-full border border-black/10"
                      style={{ backgroundColor: swatch.primary }}
                      aria-hidden
                    />
                    {t(`colors.${key}`)}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-gray-700">
              {t("outputs")}
            </legend>
            <div className="flex flex-col gap-2">
              {preset.outputs.docx ? (
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={state.includeDocx}
                    onChange={(e) =>
                      setState({ ...state, includeDocx: e.target.checked })
                    }
                  />
                  {t("outputDocx")}
                </label>
              ) : null}
              {preset.outputs.xlsx ? (
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={state.includeXlsx}
                    onChange={(e) =>
                      setState({ ...state, includeXlsx: e.target.checked })
                    }
                  />
                  {t("outputXlsx")}
                </label>
              ) : null}
              {preset.outputs.pptx ? (
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={state.includePptx}
                    onChange={(e) =>
                      setState({ ...state, includePptx: e.target.checked })
                    }
                  />
                  {t("outputPptx")}
                </label>
              ) : null}
            </div>
          </fieldset>

          <div className="space-y-3 border-t border-gray-100 pt-4">
            <p className="text-sm font-medium text-gray-700">{t("fieldsHeading")}</p>
            {preset.fields.map((field) =>
              field.multiline ? (
                <Textarea
                  key={field.key}
                  label={t(field.labelKey)}
                  rows={4}
                  value={state.fields[field.key] ?? ""}
                  onChange={(e) => setField(field.key, e.target.value)}
                />
              ) : (
                <Input
                  key={field.key}
                  label={t(field.labelKey)}
                  value={state.fields[field.key] ?? ""}
                  onChange={(e) => setField(field.key, e.target.value)}
                />
              ),
            )}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
            {preset.outputs.docx ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy || !urls.docx}
                onClick={handleDownloadDocx}
              >
                {tc("downloadDocx")}
              </Button>
            ) : null}
            {preset.outputs.xlsx ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy || !urls.xlsx}
                onClick={handleDownloadXlsx}
              >
                {tc("downloadXlsx")}
              </Button>
            ) : null}
            {preset.outputs.pptx ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={handleDownloadPptx}
              >
                {tc("downloadPptx")}
              </Button>
            ) : null}
            <Button
              type="button"
              disabled={busy}
              onClick={handleDownloadZip}
              aria-busy={busy}
            >
              {busy ? tc("exporting") : t("downloadZip")}
            </Button>
          </div>
          {error ? (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
        </Card>

        <Card className="space-y-4">
          <CardTitle>{t("preview")}</CardTitle>
          <p className="text-sm text-gray-600">{t("previewHint")}</p>

          <div
            className="overflow-hidden rounded-lg border border-gray-200"
            style={{ backgroundColor: palette.primary }}
          >
            <div
              className="px-4 py-3 text-sm font-semibold text-white"
              style={{ backgroundColor: palette.secondary }}
            >
              {localLabel}
            </div>
            <div className="space-y-2 p-5 text-white">
              <p className="text-xs uppercase tracking-wide opacity-90">
                {t(preset.titleKey)}
              </p>
              <p className="text-2xl font-bold leading-tight">
                {state.fields.title || t("previewEmptyTitle")}
              </p>
              {(state.fields.subtitle || state.fields.headline) && (
                <p className="text-lg opacity-95">
                  {state.fields.subtitle || state.fields.headline}
                </p>
              )}
              {state.fields.body ? (
                <p className="text-sm opacity-90 whitespace-pre-wrap">
                  {state.fields.body}
                </p>
              ) : null}
              <div
                className="mt-4 h-1.5 w-16 rounded"
                style={{ backgroundColor: palette.accent }}
              />
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-gray-500">{t("previewColor")}</dt>
              <dd className="font-medium text-opseu-dark">
                {t(`colors.${state.colorKey}`)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">{t("previewFiles")}</dt>
              <dd className="font-medium text-opseu-dark">
                {[
                  state.includeDocx && preset.outputs.docx && "DOCX",
                  state.includeXlsx && preset.outputs.xlsx && "XLSX",
                  state.includePptx && preset.outputs.pptx && "PPTX",
                ]
                  .filter(Boolean)
                  .join(", ") || t("previewNone")}
              </dd>
            </div>
          </dl>
          {urls.docx ? (
            <p className="break-all font-mono text-xs text-gray-500">
              {urls.docx}
            </p>
          ) : null}
        </Card>
      </div>
    </PageShell>
  );
}
