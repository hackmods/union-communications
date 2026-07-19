"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { UndoRedoBar } from "@/components/tools/UndoRedoBar";
import {
  OfficeExampleTile,
  OfficePresetMock,
} from "@/components/tools/OfficePresetMock";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { useBrandStore } from "@/store/brand-store";
import {
  OFFICE_PRESETS,
  brandPalette,
  defaultFieldsForPreset,
  getPreset,
  type OfficePresetId,
} from "@/lib/constants/office-templates";
import {
  exportDocxFromPreset,
  exportEventRsvpXlsx,
  exportOfficeBundle,
  exportPptx,
  renderDocxFromPreset,
  renderEventRsvpXlsx,
  renderPptx,
} from "@/lib/export/office-export";
import { renderEventIcsBlob } from "@/lib/calendar/event-ics";
import {
  buildEventInviteEmail,
  buildMailto,
} from "@/lib/comms/event-email";
import { downloadBlob } from "@/lib/export/image-export";
import { resolveBrandLogoBytes } from "@/lib/export/brand-logo-bytes";
import { isBrandThemeEstablished } from "@/lib/utils/brand-theme";
import { copyToClipboard, formatFilename, resolveLocalNumber } from "@/lib/utils";
import type { BrandLogoBytes } from "@/lib/export/brand-logo-bytes";

export interface GeneratorState {
  presetId: OfficePresetId;
  includeDocx: boolean;
  includeXlsx: boolean;
  includePptx: boolean;
  includeIcs: boolean;
  includeLogo: boolean;
  fields: Record<string, string>;
}

function initialState(
  presetId: OfficePresetId = "simple-letter",
  includeLogo = false,
): GeneratorState {
  const preset = getPreset(presetId);
  return {
    presetId,
    includeDocx: true,
    includeXlsx: preset.outputs.xlsx,
    includePptx: true,
    includeIcs: Boolean(preset.outputs.ics),
    includeLogo,
    fields: defaultFieldsForPreset(preset),
  };
}

export default function DocumentGeneratorPage() {
  const t = useTranslations("documentGenerator");
  const tc = useTranslations("common");
  const locale = useLocale() as "en" | "fr";
  const brandKit = useBrandStore((s) => s.brandKit);
  const hydrated = useBrandStore((s) => s.hydrated);
  const onboardingComplete = useBrandStore((s) => s.onboardingComplete);
  const themeEstablished = isBrandThemeEstablished(
    brandKit,
    onboardingComplete,
  );
  const logoDefaultApplied = useRef(false);

  const { state, setState, undo, redo, canUndo, canRedo, reset } =
    useUndoRedo<GeneratorState>(initialState());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoPreviewSrc, setLogoPreviewSrc] = useState<string | null>(null);
  const [copied, setCopied] = useState<"subject" | "body" | null>(null);

  useEffect(() => {
    if (!hydrated || logoDefaultApplied.current) return;
    logoDefaultApplied.current = true;
    if (themeEstablished) {
      setState((prev) => ({ ...prev, includeLogo: true }));
    }
  }, [hydrated, themeEstablished, setState]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!state.includeLogo) {
        setLogoPreviewSrc(null);
        return;
      }
      const logo = await resolveBrandLogoBytes(brandKit, { includeLogo: true });
      if (!cancelled) setLogoPreviewSrc(logo?.src ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [brandKit, state.includeLogo]);

  const preset = getPreset(state.presetId);
  const palette = brandPalette(brandKit);
  const localNumber = brandKit.local.localNumber;
  const localLabel = `Local ${resolveLocalNumber(localNumber)}`;

  const fields: Record<string, string> = {
    ...state.fields,
    contactName: state.fields.contactName ?? "",
  };

  const inviteEmail = preset.outputs.email
    ? buildEventInviteEmail(fields, {
        locale,
        localNumber: resolveLocalNumber(localNumber),
      })
    : null;

  async function copyEmailPart(part: "subject" | "body") {
    if (!inviteEmail) return;
    const ok = await copyToClipboard(
      part === "subject" ? inviteEmail.subject : inviteEmail.body,
    );
    if (ok) {
      setCopied(part);
      window.setTimeout(() => setCopied(null), 1500);
    }
  }

  function applyPreset(id: OfficePresetId) {
    const next = getPreset(id);
    setState({
      ...state,
      presetId: id,
      includeDocx: next.outputs.docx,
      includeXlsx: next.outputs.xlsx,
      includePptx: true,
      includeIcs: Boolean(next.outputs.ics),
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

  async function resolveLogo(): Promise<BrandLogoBytes | null> {
    if (!state.includeLogo) return null;
    const logo = await resolveBrandLogoBytes(brandKit, { includeLogo: true });
    if (!logo) {
      throw new Error(t("logoResolveFailed"));
    }
    return logo;
  }

  function pptOpts(logo: BrandLogoBytes | null) {
    return {
      presetId: state.presetId,
      title: fields.title ?? "",
      subtitle: fields.subtitle,
      body: fields.body,
      localLabel,
      palette,
      fields,
      logo,
    };
  }

  function handleDownloadDocx() {
    void run(async () => {
      const logo = await resolveLogo().catch((e) => {
        if (state.includeLogo) throw e;
        return null;
      });
      await exportDocxFromPreset({
        presetId: state.presetId,
        palette,
        localLabel,
        fields,
        logo,
        filename: formatFilename(preset.fileStem, localNumber, "docx"),
      });
    });
  }

  function handleDownloadXlsx() {
    if (!preset.outputs.xlsx) return;
    void run(() =>
      exportEventRsvpXlsx({
        palette,
        localNumber: resolveLocalNumber(localNumber),
        fields,
        filename: formatFilename(preset.fileStem, localNumber, "xlsx"),
      }),
    );
  }

  function handleDownloadPptx() {
    void run(async () => {
      const logo = state.includeLogo
        ? await resolveBrandLogoBytes(brandKit, { includeLogo: true })
        : null;
      await exportPptx({
        ...pptOpts(logo),
        filename: formatFilename(preset.fileStem, localNumber, "pptx"),
      });
    });
  }

  function handleDownloadIcs() {
    if (!preset.outputs.ics) return;
    void run(async () => {
      const blob = renderEventIcsBlob(fields, {
        localNumber: resolveLocalNumber(localNumber),
      });
      if (!blob) throw new Error(t("icsNeedsCalendar"));
      downloadBlob(
        blob,
        formatFilename(preset.fileStem, localNumber, "ics"),
      );
    });
  }

  function handleDownloadZip() {
    void run(async () => {
      let logo: BrandLogoBytes | null = null;
      if (state.includeLogo) {
        logo = await resolveBrandLogoBytes(brandKit, { includeLogo: true });
        if (!logo) throw new Error(t("logoResolveFailed"));
      }

      const files: { name: string; blob: Promise<Blob> | Blob }[] = [];
      if (state.includeDocx) {
        files.push({
          name: formatFilename(preset.fileStem, localNumber, "docx"),
          blob: renderDocxFromPreset({
            presetId: state.presetId,
            palette,
            localLabel,
            fields,
            logo,
          }),
        });
      }
      if (state.includeXlsx && preset.outputs.xlsx) {
        files.push({
          name: formatFilename(preset.fileStem, localNumber, "xlsx"),
          blob: renderEventRsvpXlsx({
            palette,
            localNumber: resolveLocalNumber(localNumber),
            fields,
          }),
        });
      }
      if (state.includeIcs && preset.outputs.ics) {
        const icsBlob = renderEventIcsBlob(fields, {
          localNumber: resolveLocalNumber(localNumber),
        });
        if (!icsBlob) throw new Error(t("icsNeedsCalendar"));
        files.push({
          name: formatFilename(preset.fileStem, localNumber, "ics"),
          blob: icsBlob,
        });
      }
      if (state.includePptx) {
        files.push({
          name: formatFilename(preset.fileStem, localNumber, "pptx"),
          blob: renderPptx(pptOpts(logo)),
        });
      }
      if (files.length === 0) throw new Error(t("selectOutput"));

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
    <PageShell className="py-6 md:py-8 lg:py-10">
      <div className="mb-4 max-w-prose">
        <h1 className="text-2xl font-bold text-opseu-dark md:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-1 text-gray-600">{t("subtitle")}</p>
      </div>

      <div
        className="mb-4 grid gap-3 sm:grid-cols-3"
        role="listbox"
        aria-label={t("examples")}
      >
        {OFFICE_PRESETS.map((p) => (
          <OfficeExampleTile
            key={p.id}
            presetId={p.id}
            title={t(p.titleKey)}
            selected={state.presetId === p.id}
            palette={palette}
            onSelect={() => applyPreset(p.id)}
          />
        ))}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2 lg:gap-6">
        <Card density="compact" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">{t("settings")}</CardTitle>
            <UndoRedoBar
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={undo}
              onRedo={redo}
              onReset={() =>
                reset(initialState(state.presetId, state.includeLogo))
              }
            />
          </div>

          <p className="text-sm text-gray-600">{t(preset.blurbKey)}</p>

          {/* Mobile a11y preset select */}
          <div className="sm:hidden">
            <label
              htmlFor="design-preset"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              {t("designPreset")}
            </label>
            <select
              id="design-preset"
              className="min-h-11 w-full rounded-lg border border-gray-300 px-3 py-2 text-base"
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

          <div className="space-y-2">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={state.includeLogo}
                onChange={(e) =>
                  setState({ ...state, includeLogo: e.target.checked })
                }
              />
              {t("includeLogo")}
            </label>
            {!themeEstablished ? (
              <p className="text-xs text-gray-500">
                {t("setupBrandPrompt")}{" "}
                <Link
                  href="/brand-kit"
                  className="font-medium text-opseu-blue underline"
                >
                  {t("setupBrandLink")}
                </Link>
              </p>
            ) : null}
          </div>

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-gray-700">
              {t("outputs")}
            </legend>
            <div className="flex flex-col gap-1.5">
              <label className="inline-flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={state.includeDocx}
                  onChange={(e) =>
                    setState({ ...state, includeDocx: e.target.checked })
                  }
                />
                {t("outputDocx")}
              </label>
              {preset.outputs.xlsx ? (
                <label className="inline-flex min-h-11 items-center gap-2 text-sm">
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
              {preset.outputs.ics ? (
                <label className="inline-flex min-h-11 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={state.includeIcs}
                    onChange={(e) =>
                      setState({ ...state, includeIcs: e.target.checked })
                    }
                  />
                  {t("outputIcs")}
                </label>
              ) : null}
              <label className="inline-flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={state.includePptx}
                  onChange={(e) =>
                    setState({ ...state, includePptx: e.target.checked })
                  }
                />
                {t("outputPptx")}
              </label>
            </div>
          </fieldset>

          <div className="space-y-3 border-t border-gray-100 pt-3">
            <p className="text-sm font-medium text-gray-700">
              {t("fieldsHeading")}
            </p>
            {preset.fields.map((field) =>
              field.multiline ? (
                <Textarea
                  key={field.key}
                  label={t(field.labelKey)}
                  rows={3}
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

          <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-3">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={handleDownloadDocx}
            >
              {tc("downloadDocx")}
            </Button>
            {preset.outputs.xlsx ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={handleDownloadXlsx}
              >
                {tc("downloadXlsx")}
              </Button>
            ) : null}
            {preset.outputs.ics ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={handleDownloadIcs}
              >
                {t("downloadIcs")}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={handleDownloadPptx}
            >
              {tc("downloadPptx")}
            </Button>
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

        <div className="space-y-3 lg:sticky lg:top-4">
          <h2 className="text-base font-semibold text-opseu-dark">
            {t("preview")}
          </h2>
          <p className="text-sm text-gray-600">{t("previewHint")}</p>
          <OfficePresetMock
            presetId={state.presetId}
            palette={palette}
            localLabel={localLabel}
            fields={fields}
            logoSrc={state.includeLogo ? logoPreviewSrc : null}
            includeDocx={state.includeDocx}
            includeXlsx={state.includeXlsx && preset.outputs.xlsx}
            includePptx={state.includePptx}
          />
          <ul className="list-disc space-y-1 pl-5 text-xs text-gray-500">
            {preset.structureKeys.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
        </div>
      </div>

      {inviteEmail ? (
        <Card density="compact" className="mt-4 space-y-3">
          <div>
            <CardTitle className="text-base">{t("inviteEmail.title")}</CardTitle>
            <p className="mt-1 text-sm text-gray-600">
              {t("inviteEmail.hint")}
            </p>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="invite-subject"
              className="text-sm font-medium text-gray-700"
            >
              {t("inviteEmail.subjectLabel")}
            </label>
            <Input
              id="invite-subject"
              readOnly
              value={inviteEmail.subject}
              onFocus={(e) => e.currentTarget.select()}
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="invite-body"
              className="text-sm font-medium text-gray-700"
            >
              {t("inviteEmail.bodyLabel")}
            </label>
            <Textarea
              id="invite-body"
              readOnly
              rows={12}
              value={inviteEmail.body}
              onFocus={(e) => e.currentTarget.select()}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void copyEmailPart("subject")}
            >
              {copied === "subject"
                ? tc("copied")
                : t("inviteEmail.copySubject")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void copyEmailPart("body")}
            >
              {copied === "body" ? tc("copied") : t("inviteEmail.copyBody")}
            </Button>
            <a
              href={buildMailto(inviteEmail)}
              className="inline-flex items-center justify-center rounded-lg border-2 border-opseu-blue px-4 py-2 text-base font-semibold text-opseu-blue transition-colors hover:bg-opseu-blue/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40"
            >
              {t("inviteEmail.openMail")}
            </a>
          </div>

          <p className="text-xs text-gray-500">{t("inviteEmail.privacy")}</p>
        </Card>
      ) : null}
    </PageShell>
  );
}
