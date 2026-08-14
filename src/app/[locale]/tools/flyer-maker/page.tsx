"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useBrandStore } from "@/store/brand-store";
import { isBrandThemeEstablished } from "@/lib/utils/brand-theme";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { useExportHandler } from "@/hooks/use-export-handler";
import { useOneShotBrandSeed } from "@/hooks/use-one-shot-brand-seed";
import { useExamplePostSeed } from "@/hooks/use-example-post-seed";
import { exportNodeAsPng } from "@/lib/export/image-export";
import { nodeToPdf } from "@/lib/export/pdf-export";
import { qrDataUrl } from "@/lib/export/qr";
import { formatFilename, resolveLocalNumber } from "@/lib/utils";
import { getExamplePost } from "@/lib/constants/examples";
import { coloursFromBrandKit } from "@/lib/utils/brand-theme";
import {
  DEFAULT_FLYER_FORMAT,
  FLYER_FORMAT_ORDER,
  FLYER_FORMATS,
  type FlyerFormatId,
} from "@/lib/comms/flyer-formats";
import {
  DEFAULT_FLYER_FONT,
  FLYER_FONT_ORDER,
  flyerFontFamily,
  type FlyerFontStackId,
} from "@/lib/comms/flyer-fonts";
import {
  DEFAULT_FLYER_LAYOUT,
  FLYER_LAYOUT_ORDER,
  flyerLayoutSupportsPhoto,
  type FlyerLayoutId,
} from "@/lib/comms/flyer-layouts";
import {
  FLYER_PRESET_ORDER,
  FLYER_PRESETS,
  type FlyerPresetKey,
} from "@/lib/comms/flyer-presets";
import {
  FLYER_TYPE_SCALE_ORDER,
  resolveFlyerTokens,
  type FlyerHeadlineCase,
  type FlyerTypeScaleOverride,
} from "@/lib/comms/flyer-tokens";
import { fieldsFromFlyer } from "@/lib/comms/event-email-from-flyer";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { UndoRedoBar } from "@/components/tools/UndoRedoBar";
import { BrandSwatchPicker } from "@/components/tools/BrandSwatchPicker";
import { ContrastChecker } from "@/components/tools/ContrastChecker";
import { pickContrastingInk } from "@/lib/utils/ink";
import { PageShell } from "@/components/layout/PageShell";
import { ToolEditorLayout } from "@/components/tools/ToolEditorLayout";
import { BrandSetupPrompt } from "@/components/tools/BrandSetupPrompt";
import { ToolRelatedFooter } from "@/components/tools/ToolRelatedFooter";
import { ToolFormDetails } from "@/components/tools/ToolFormDetails";
import { SegControl } from "@/components/tools/SegControl";
import { FlyerLayoutCanvas } from "@/components/tools/flyer-layouts";
import { InviteEmailPanel } from "@/components/tools/InviteEmailPanel";
import { ImageUpload } from "@/components/tools/ImageUpload";
import { ConsentModal } from "@/components/tools/ConsentModal";

interface FlyerState {
  message: string;
  body: string;
  date: string;
  time: string;
  location: string;
  contact: string;
  layout: FlyerLayoutId;
  format: FlyerFormatId;
  fontStack: FlyerFontStackId;
  headlineCase: FlyerHeadlineCase;
  typeScaleOverride: FlyerTypeScaleOverride;
  showQr: boolean;
  qrUrl: string;
  photoUrl?: string;
  photoScale: number;
  primaryColor: string;
  accentColor: string;
  secondaryColor: string;
}

function FlyerMakerPageContent() {
  const t = useTranslations("common");
  const tf = useTranslations("flyerMaker");
  const te = useTranslations("examples");
  const brandKit = useBrandStore((s) => s.brandKit);
  const onboardingComplete = useBrandStore((s) => s.onboardingComplete);
  const themeEstablished = isBrandThemeEstablished(brandKit, onboardingComplete);
  const hydrated = useBrandStore((s) => s.hydrated);
  const canvasRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const [consentOpen, setConsentOpen] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);

  const brandColors = coloursFromBrandKit(brandKit);

  const initial: FlyerState = {
    message: "PICKET LINE - ALL MEMBERS WELCOME",
    body: "",
    date: "Monday, March 15",
    time: "7:00 AM - 4:00 PM",
    location: "123 Main Street, Toronto",
    contact: "",
    layout: DEFAULT_FLYER_LAYOUT,
    format: DEFAULT_FLYER_FORMAT,
    fontStack: DEFAULT_FLYER_FONT,
    headlineCase: "uppercase",
    typeScaleOverride: "inherit",
    showQr: false,
    qrUrl: "",
    photoScale: 1,
    primaryColor: brandColors.primary,
    accentColor: brandColors.accent,
    secondaryColor: brandColors.secondary,
  };

  const { state, setState, undo, redo, canUndo, canRedo, reset } =
    useUndoRedo<FlyerState>(initial);

  const tokens = resolveFlyerTokens(brandKit, {
    typeScaleOverride: state.typeScaleOverride,
    headlineCase: state.headlineCase,
    format: state.format,
  });
  const format = FLYER_FORMATS[state.format];
  const showPhoto = flyerLayoutSupportsPhoto(state.layout);
  const { exportError, exportSuccess, exporting, runExport } =
    useExportHandler();

  const qrTarget = state.qrUrl.trim();

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      const task = state.showQr
        ? qrDataUrl(qrTarget || "https://unionops.org", { width: 140 })
        : Promise.resolve(null);
      void task.then((url) => {
        if (!cancelled) setQrSrc(url);
      });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [state.showQr, qrTarget]);

  useExamplePostSeed((exampleId) => {
    const post = getExamplePost(exampleId);
    if (!post || post.primaryTool !== "flyer-maker") return false;
    const colours = coloursFromBrandKit(brandKit);
    const detail = te.has(`posts.${post.id}.mockup.detail`)
      ? te(`posts.${post.id}.mockup.detail`)
      : "";
    reset({
      ...initial,
      message: te(`posts.${post.id}.mockup.headline`).toUpperCase(),
      location: te(`posts.${post.id}.mockup.body`),
      date: detail || initial.date,
      layout: "stack",
      format: "letter",
      fontStack: "impact",
      headlineCase: "uppercase",
      primaryColor: colours.primary,
      accentColor: colours.accent,
      secondaryColor: colours.secondary,
    });
    return true;
  }, "example", hydrated);

  useOneShotBrandSeed(hydrated, () => {
    const exampleId = searchParams.get("example");
    if (exampleId) {
      const post = getExamplePost(exampleId);
      if (post?.primaryTool === "flyer-maker") return;
    }
    const colours = coloursFromBrandKit(brandKit);
    reset({
      ...initial,
      primaryColor: colours.primary,
      accentColor: colours.accent,
      secondaryColor: colours.secondary,
    });
  });

  const applyPreset = (key: FlyerPresetKey) => {
    const preset = FLYER_PRESETS[key];
    const colours = coloursFromBrandKit(brandKit);
    setState({
      ...state,
      message: preset.message,
      body: preset.body,
      date: preset.date,
      time: preset.time,
      location: preset.location,
      contact: preset.contact,
      layout: preset.layout,
      format: preset.format,
      fontStack: preset.fontStack,
      headlineCase: preset.headlineCase,
      typeScaleOverride: preset.typeScaleOverride,
      showQr: preset.showQr,
      photoUrl: flyerLayoutSupportsPhoto(preset.layout)
        ? state.photoUrl
        : undefined,
      primaryColor: colours.primary,
      accentColor: colours.accent,
      secondaryColor: colours.secondary,
    });
  };

  const handlePhotoUpload = (url: string) => {
    setPendingPhoto(url);
    setConsentOpen(true);
  };

  const handleConsent = () => {
    if (pendingPhoto) {
      setState({ ...state, photoUrl: pendingPhoto });
    }
    setPendingPhoto(null);
    setConsentOpen(false);
  };

  const handleExportPng = async () => {
    if (!canvasRef.current) return;
    await runExport(async () => {
      await exportNodeAsPng(
        canvasRef.current!,
        formatFilename("flyer", brandKit.local.localNumber, "png"),
        { pixelRatio: 2, backgroundColor: state.primaryColor },
      );
    });
  };

  const handleExportPdf = async () => {
    if (!canvasRef.current) return;
    await runExport(async () => {
      await nodeToPdf(
        canvasRef.current!,
        formatFilename("flyer", brandKit.local.localNumber, "pdf"),
        format.widthInches,
        format.heightInches,
        2,
        state.primaryColor,
      );
    });
  };

  const inviteFields = fieldsFromFlyer({
    message: state.message,
    date: state.date,
    time: state.time,
    location: state.location,
    contact: state.contact,
    body: state.body,
  });

  const previewName = tf("previewAccessibleName", {
    headline: state.message.trim() || tf("title"),
    format: tf(`formats.${state.format}`),
  });

  return (
    <>
      <ToolEditorLayout
        title={tf("title")}
        description={tf("subtitle")}
        purposeHint={tf("whenToUse")}
        previewAccessibleName={previewName}
        toolbar={
          <div className="space-y-3">
            {!themeEstablished ? (
              <BrandSetupPrompt themeEstablished={themeEstablished} />
            ) : null}
            <div className="flex flex-wrap gap-2">
              {FLYER_PRESET_ORDER.map((key) => (
                <Button
                  key={key}
                  size="sm"
                  variant="outline"
                  onClick={() => applyPreset(key)}
                >
                  {tf(`presets.${key}.label`)}
                </Button>
              ))}
            </div>
          </div>
        }
        exportError={exportError}
        exportSuccess={exportSuccess}
        footer={<ToolRelatedFooter toolSlug="flyer-maker" />}
        form={
          <div className="space-y-5">
            <Card density="compact" className="space-y-5">
              <section className="space-y-3">
                <SegControl
                  label={tf("layout")}
                  value={state.layout}
                  options={FLYER_LAYOUT_ORDER.map((id) => ({
                    value: id,
                    label: tf(`layouts.${id}`),
                  }))}
                  onChange={(id) =>
                    setState({
                      ...state,
                      layout: id,
                      photoUrl: flyerLayoutSupportsPhoto(id)
                        ? state.photoUrl
                        : undefined,
                    })
                  }
                />
                <SegControl
                  label={tf("format")}
                  value={state.format}
                  options={FLYER_FORMAT_ORDER.map((id) => ({
                    value: id,
                    label: tf(`formats.${id}`),
                  }))}
                  onChange={(id) => setState({ ...state, format: id })}
                />
                <Textarea
                  label={tf("message")}
                  value={state.message}
                  onChange={(e) =>
                    setState({ ...state, message: e.target.value })
                  }
                  rows={2}
                />
                <Textarea
                  label={tf("body")}
                  value={state.body}
                  onChange={(e) => setState({ ...state, body: e.target.value })}
                  rows={3}
                />
                <Input
                  label={tf("date")}
                  value={state.date}
                  onChange={(e) => setState({ ...state, date: e.target.value })}
                />
                <Input
                  label={tf("time")}
                  value={state.time}
                  onChange={(e) => setState({ ...state, time: e.target.value })}
                />
                <Input
                  label={tf("location")}
                  value={state.location}
                  onChange={(e) =>
                    setState({ ...state, location: e.target.value })
                  }
                />
                <Input
                  label={tf("contact")}
                  value={state.contact}
                  onChange={(e) =>
                    setState({ ...state, contact: e.target.value })
                  }
                />
              </section>

              <ToolFormDetails title={tf("sectionTypography")}>
                <SegControl
                  label={tf("fontStack")}
                  value={state.fontStack}
                  options={FLYER_FONT_ORDER.map((id) => ({
                    value: id,
                    label: tf(`fonts.${id}`),
                  }))}
                  onChange={(id) => setState({ ...state, fontStack: id })}
                />
                <SegControl
                  label={tf("headlineCase")}
                  value={state.headlineCase}
                  options={(
                    [
                      { value: "uppercase" as const, label: tf("caseUpper") },
                      { value: "asTyped" as const, label: tf("caseAsTyped") },
                    ] as const
                  ).map((o) => o)}
                  onChange={(id) =>
                    setState({ ...state, headlineCase: id })
                  }
                />
                <SegControl
                  label={tf("typeScale")}
                  value={state.typeScaleOverride}
                  options={FLYER_TYPE_SCALE_ORDER.map((id) => ({
                    value: id,
                    label: tf(`typeScales.${id}`),
                  }))}
                  onChange={(id) =>
                    setState({ ...state, typeScaleOverride: id })
                  }
                />
              </ToolFormDetails>

              <ToolFormDetails title={tf("sectionQrPhoto")}>
                <label className="flex min-h-11 items-center gap-2 text-sm text-gray-800">
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={state.showQr}
                    onChange={(e) =>
                      setState({ ...state, showQr: e.target.checked })
                    }
                  />
                  {tf("showQr")}
                </label>
                {state.showQr ? (
                  <Input
                    label={tf("qrUrl")}
                    value={state.qrUrl}
                    onChange={(e) =>
                      setState({ ...state, qrUrl: e.target.value })
                    }
                    placeholder={tf("qrUrlPlaceholder")}
                  />
                ) : null}
                {showPhoto ? (
                  <>
                    <ImageUpload
                      label={tf("photo")}
                      preview={state.photoUrl}
                      onUpload={handlePhotoUpload}
                      onClear={() =>
                        setState({ ...state, photoUrl: undefined })
                      }
                    />
                    <p className="text-sm leading-snug text-gray-600">
                      <Link
                        href="/guide/photo-consent"
                        className="text-opseu-blue underline"
                      >
                        {tf("photoConsentLink")}
                      </Link>
                    </p>
                    <Input
                      label={tf("photoZoom")}
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={state.photoScale}
                      onChange={(e) =>
                        setState({
                          ...state,
                          photoScale: parseFloat(e.target.value),
                        })
                      }
                    />
                  </>
                ) : null}
              </ToolFormDetails>

              <ToolFormDetails title={t("sectionColours")}>
                <BrandSwatchPicker
                  label={tf("primaryColor")}
                  value={state.primaryColor}
                  onChange={(c) => setState({ ...state, primaryColor: c })}
                  colors={brandColors}
                />
                <BrandSwatchPicker
                  label={tf("accentColor")}
                  value={state.accentColor}
                  onChange={(c) => setState({ ...state, accentColor: c })}
                  colors={brandColors}
                />
                <BrandSwatchPicker
                  label={tf("secondaryColor")}
                  value={state.secondaryColor}
                  onChange={(c) => setState({ ...state, secondaryColor: c })}
                  colors={brandColors}
                />
                <ContrastChecker
                  foreground={pickContrastingInk(state.primaryColor)}
                  background={state.primaryColor}
                />
              </ToolFormDetails>

              <div className="space-y-3 border-t border-gray-200 pt-5">
                <UndoRedoBar
                  canUndo={canUndo}
                  canRedo={canRedo}
                  onUndo={undo}
                  onRedo={redo}
                  onReset={() => {
                    const colours = coloursFromBrandKit(brandKit);
                    reset({
                      ...initial,
                      primaryColor: colours.primary,
                      accentColor: colours.accent,
                      secondaryColor: colours.secondary,
                    });
                  }}
                />
                <div className="flex flex-wrap gap-3">
                  <Button onClick={handleExportPng} disabled={exporting}>
                    {exporting ? t("exporting") : t("downloadPng")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleExportPdf}
                    disabled={exporting}
                  >
                    {t("downloadPdf")}
                  </Button>
                </div>
              </div>
            </Card>

            <InviteEmailPanel
              fields={inviteFields}
              localNumber={resolveLocalNumber(brandKit.local.localNumber)}
              messagesNamespace="flyerMaker"
            />
          </div>
        }
        previewActions={
          <>
            <Button onClick={handleExportPng} disabled={exporting}>
              {exporting ? t("exporting") : t("downloadPng")}
            </Button>
            <Button
              variant="outline"
              onClick={handleExportPdf}
              disabled={exporting}
            >
              {t("downloadPdf")}
            </Button>
          </>
        }
        preview={
          /* Shadow stays outside canvasRef — box-shadow oklch from Tailwind breaks PNG capture */
          <div className="shadow-lg">
            <FlyerLayoutCanvas
              canvasRef={canvasRef}
              layout={state.layout}
              tokens={tokens}
              colours={{
                primary: state.primaryColor,
                accent: state.accentColor,
                secondary: state.secondaryColor,
              }}
              copy={{
                message: state.message,
                body: state.body,
                date: state.date,
                time: state.time,
                location: state.location,
                contact: state.contact,
                dateLabel: tf("date"),
                timeLabel: tf("time"),
                locationLabel: tf("location"),
              }}
              localNumber={brandKit.local.localNumber}
              subText={brandKit.local.subText}
              fontFamily={flyerFontFamily(state.fontStack)}
              aspectClass={format.aspectClass}
              photoUrl={showPhoto ? state.photoUrl : undefined}
              photoScale={state.photoScale}
              showQr={state.showQr}
              qrSrc={qrSrc}
            />
          </div>
        }
      />
      <ConsentModal
        open={consentOpen}
        onConfirm={handleConsent}
        onCancel={() => {
          setPendingPhoto(null);
          setConsentOpen(false);
        }}
      />
    </>
  );
}

function FlyerMakerSuspenseFallback() {
  const t = useTranslations("common");
  return (
    <PageShell className="py-6 md:py-8 lg:py-10">
      <p className="text-gray-600" aria-busy="true">
        {t("loading")}
      </p>
    </PageShell>
  );
}

export default function FlyerMakerPage() {
  return (
    <Suspense fallback={<FlyerMakerSuspenseFallback />}>
      <FlyerMakerPageContent />
    </Suspense>
  );
}
