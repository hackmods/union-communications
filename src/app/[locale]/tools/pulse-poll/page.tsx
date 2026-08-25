"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useBrandStore } from "@/store/brand-store";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { useExportHandler } from "@/hooks/use-export-handler";
import { useOneShotBrandSeed } from "@/hooks/use-one-shot-brand-seed";
import { exportNodeAsPng } from "@/lib/export/image-export";
import { nodeToPdf } from "@/lib/export/pdf-export";
import { qrDataUrl } from "@/lib/export/qr";
import { formatFilename, resolveLocalNumber, cn } from "@/lib/utils";
import { isBrandThemeEstablished } from "@/lib/utils/brand-theme";
import { BrandSetupPrompt } from "@/components/tools/BrandSetupPrompt";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { UndoRedoBar } from "@/components/tools/UndoRedoBar";
import { ToolEditorLayout } from "@/components/tools/ToolEditorLayout";
import { ToolRelatedFooter } from "@/components/tools/ToolRelatedFooter";
import { ToolFormDetails } from "@/components/tools/ToolFormDetails";
import { ToolColourSection } from "@/components/tools/ToolColourSection";
import { ToolExportActions } from "@/components/tools/ToolExportActions";
import { Callout } from "@/components/ui/Callout";
import { Link } from "@/i18n/navigation";
import { pickContrastingInk } from "@/lib/utils/ink";
import {
  resolveCanvasTokens,
  typeScaleFactor,
  textAlignFromBias,
  walletBodyFontSizePx,
  walletContentPaddingPx,
  walletMetaFontSizePx,
  walletTitleFontSizePx,
} from "@/lib/utils/canvas-tokens";
import { canvasSurfaceStyle } from "@/lib/utils/canvas-surface";
import {
  CanvasGrainOverlay,
  CanvasQrPlate,
} from "@/components/tools/canvas";
import {
  createEmptyPulsePollDraft,
  draftQuestionsToApi,
  loadPulsePollDraft,
  savePulsePollDraft,
  sanitizePollSlug,
  type PulsePollDraft,
} from "@/lib/comms/pulse-poll";

export default function PulsePollPage() {
  const t = useTranslations("pulsePoll");
  const tc = useTranslations("common");
  const locale = useLocale();
  const brandKit = useBrandStore((s) => s.brandKit);
  const onboardingComplete = useBrandStore((s) => s.onboardingComplete);
  const hydrated = useBrandStore((s) => s.hydrated);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [publishMsg, setPublishMsg] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const themeEstablished = isBrandThemeEstablished(brandKit, onboardingComplete);
  const tokens = resolveCanvasTokens(brandKit);

  const initial = createEmptyPulsePollDraft({
    primaryColor: brandKit.primaryColor,
    secondaryColor: brandKit.secondaryColor,
  });

  const { state, setState, undo, redo, canUndo, canRedo, reset } =
    useUndoRedo<PulsePollDraft>(initial);
  const { exportError, exportSuccess, exporting, runExport } = useExportHandler();

  useOneShotBrandSeed(hydrated, () => {
    const saved = loadPulsePollDraft();
    if (saved) {
      reset({
        ...saved,
        includeBranding: themeEstablished ? saved.includeBranding : false,
        primaryColor: saved.primaryColor || brandKit.primaryColor,
        secondaryColor: saved.secondaryColor || brandKit.secondaryColor,
      });
    } else {
      reset({
        ...createEmptyPulsePollDraft({
          primaryColor: brandKit.primaryColor,
          secondaryColor: brandKit.secondaryColor,
        }),
        includeBranding: themeEstablished,
        title: t("demoTitle"),
        intro: t("demoIntro"),
        questions: [
          { id: "q-demo-1", text: t("demoQuestion1") },
          { id: "q-demo-2", text: t("demoQuestion2") },
        ],
      });
    }
  });

  const slug = sanitizePollSlug(state.slug) || "member-pulse";
  const sharePath = `/${locale}/poll/${slug}`;
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${sharePath}`
      : sharePath;

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void qrDataUrl(shareUrl, { width: 280 }).then((url) => {
        if (!cancelled) setQrSrc(url);
      });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [shareUrl]);

  function persist() {
    const ok = savePulsePollDraft({ ...state, slug });
    setSaveMsg(ok ? t("saved") : t("saveError"));
  }

  async function publish() {
    setPublishMsg(null);
    const questions = draftQuestionsToApi(state.questions);
    if (!state.title.trim() || questions.length === 0) {
      setPublishMsg(t("minQuestions"));
      return;
    }
    setPublishing(true);
    try {
      const res = await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          title: state.title.trim(),
          intro: state.intro.trim() || undefined,
          questions,
          consentRequired: true,
          status: "open",
        }),
      });
      if (res.status === 401 || res.status === 403) {
        setPublishMsg(t("publishAuthRequired"));
        return;
      }
      if (res.status === 409) {
        setPublishMsg(t("publishSlugTaken"));
        return;
      }
      if (!res.ok) {
        setPublishMsg(t("publishError"));
        return;
      }
      persist();
      setPublishMsg(t("published"));
    } catch {
      setPublishMsg(t("publishError"));
    } finally {
      setPublishing(false);
    }
  }

  function updateQuestion(id: string, text: string) {
    setState({
      ...state,
      questions: state.questions.map((q) =>
        q.id === id ? { ...q, text } : q,
      ),
    });
  }

  function addQuestion() {
    setState({
      ...state,
      questions: [
        ...state.questions,
        { id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text: "" },
      ],
    });
  }

  function removeQuestion(id: string) {
    if (state.questions.length <= 1) return;
    setState({
      ...state,
      questions: state.questions.filter((q) => q.id !== id),
    });
  }

  function moveQuestion(id: string, dir: -1 | 1) {
    const idx = state.questions.findIndex((q) => q.id === id);
    const next = idx + dir;
    if (idx < 0 || next < 0 || next >= state.questions.length) return;
    const questions = [...state.questions];
    const [item] = questions.splice(idx, 1);
    questions.splice(next, 0, item);
    setState({ ...state, questions });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const ink = pickContrastingInk(state.primaryColor);
  const pollPreviewWidthPx = 448; // max-w-md (28rem)
  const titleFontPx = walletTitleFontSizePx(tokens, pollPreviewWidthPx);
  const bodyFontPx = walletBodyFontSizePx(tokens, pollPreviewWidthPx);
  const metaFontPx = walletMetaFontSizePx(tokens);
  const contentPadPx = walletContentPaddingPx(tokens, pollPreviewWidthPx);
  const textAlign = textAlignFromBias(tokens.alignmentBias);
  const previewStyle: CSSProperties = {
    ...canvasSurfaceStyle(tokens, {
      primary: state.primaryColor,
      secondary: state.secondaryColor,
      accent: state.secondaryColor,
    }),
    color: ink,
    padding: contentPadPx,
    gap: Math.max(8, Math.round(tokens.gapPx * typeScaleFactor(tokens))),
    textAlign,
  };

  const editor = (
    <div className="space-y-5">
      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
        {t("privacyNotice")}
      </p>

      <Input
        label={t("pollTitle")}
        value={state.title}
        onChange={(e) => setState({ ...state, title: e.target.value })}
      />
      <Textarea
        label={t("intro")}
        value={state.intro}
        onChange={(e) => setState({ ...state, intro: e.target.value })}
      />

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-gray-800">
          {t("questions")}
        </legend>
        {state.questions.map((q, i) => (
          <div key={q.id} className="space-y-2 rounded-md border border-gray-200 p-3">
            <Input
              label={t("questionLabel", { n: i + 1 })}
              placeholder={t("questionPlaceholder")}
              value={q.text}
              onChange={(e) => updateQuestion(q.id, e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => moveQuestion(q.id, -1)}
                disabled={i === 0}
              >
                {t("moveUp")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => moveQuestion(q.id, 1)}
                disabled={i === state.questions.length - 1}
              >
                {t("moveDown")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeQuestion(q.id)}
                disabled={state.questions.length <= 1}
              >
                {t("removeQuestion")}
              </Button>
            </div>
          </div>
        ))}
        <Button type="button" variant="secondary" size="sm" onClick={addQuestion}>
          {t("addQuestion")}
        </Button>
      </fieldset>

      <Input
        label={t("shareSlug")}
        value={state.slug}
        onChange={(e) => setState({ ...state, slug: e.target.value })}
      />
      <p className="text-sm leading-snug text-gray-600">{t("shareSlugHint")}</p>

      <ToolFormDetails title={tc("sectionOptions")}>
        <label className="flex min-h-11 items-center gap-2.5 text-sm text-opseu-dark">
          <input
            type="checkbox"
            checked={state.includeBranding}
            onChange={(e) =>
              setState({ ...state, includeBranding: e.target.checked })
            }
            className="size-4"
          />
          {t("includeBranding")}
        </label>
      </ToolFormDetails>

      <ToolColourSection
        primaryColor={state.primaryColor}
        secondaryColor={state.secondaryColor}
        onPrimaryChange={(primaryColor) =>
          setState({ ...state, primaryColor })
        }
        onSecondaryChange={(secondaryColor) =>
          setState({ ...state, secondaryColor })
        }
      />

      <UndoRedoBar
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        onReset={() =>
          reset({
            ...createEmptyPulsePollDraft({
              primaryColor: brandKit.primaryColor,
              secondaryColor: brandKit.secondaryColor,
            }),
            includeBranding: themeEstablished,
            title: t("demoTitle"),
            intro: t("demoIntro"),
            questions: [
              { id: `q-${Date.now()}-1`, text: t("demoQuestion1") },
              { id: `q-${Date.now()}-2`, text: t("demoQuestion2") },
            ],
          })
        }
      />
    </div>
  );

  const preview = (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">{t("previewHeading")}</p>
      <div
        ref={canvasRef}
                  data-export-root=""
        className="relative mx-auto flex w-full max-w-md flex-col rounded-lg shadow-sm"
        style={previewStyle}
      >
        <CanvasGrainOverlay opacity={tokens.grainOpacity} />
        {state.includeBranding && themeEstablished && (
          <div className="relative z-[2] flex items-center gap-2">
            <BrandLogo className="h-10 w-auto" />
            <span
              className="font-semibold"
              style={{ fontSize: bodyFontPx, fontFamily: tokens.bodyFontFamily }}
            >
              Local {resolveLocalNumber(brandKit.local.localNumber)}
            </span>
          </div>
        )}
        <h2
          className="relative z-[2] font-bold leading-tight"
          style={{
            fontSize: titleFontPx,
            fontWeight: tokens.titleFontWeight,
            letterSpacing: tokens.titleLetterSpacing,
            textTransform: tokens.titleTextTransform,
            fontFamily: tokens.headlineFontFamily,
          }}
        >
          {state.title.trim() || t("title")}
        </h2>
        {state.intro.trim() && (
          <p
            className="relative z-[2] opacity-90"
            style={{ fontSize: bodyFontPx }}
          >
            {state.intro}
          </p>
        )}
        <ol
          className="relative z-[2] list-decimal space-y-1 pl-5"
          style={{ fontSize: bodyFontPx }}
        >
          {state.questions
            .filter((q) => q.text.trim())
            .map((q) => (
              <li key={q.id}>{q.text}</li>
            ))}
        </ol>
        <div className="relative z-[2] mt-2 flex flex-col items-center gap-2">
          <CanvasQrPlate
            tokens={tokens}
            qrSrc={qrSrc}
            alt={t("qrAlt")}
            widthPercent={55}
            accentColor={state.secondaryColor}
          />
          <p className={cn("text-center")} style={{ fontSize: metaFontPx }}>
            {t("qrHint")}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <ToolEditorLayout
      title={t("title")}
      description={t("subtitle")}
      purposeHint={t("whenToUse")}
      previewAccessibleName={t("previewAccessibleName")}
      toolbar={
        <div className="space-y-3">
          {!themeEstablished ? (
            <BrandSetupPrompt themeEstablished={themeEstablished} />
          ) : null}
          <Callout tone="brand">
            <p className="font-semibold text-opseu-dark">{t("hubSignInTitle")}</p>
            <p className="mt-1">{t("hubSignInBody")}</p>
            <p className="mt-2">
              <Link
                href="/app/login"
                className="font-semibold text-opseu-blue underline underline-offset-2"
              >
                {t("hubSignInLink")}
              </Link>
            </p>
          </Callout>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={persist}>
              {tc("save")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={publishing}
              onClick={() => void publish()}
            >
              {publishing ? t("publishing") : t("publish")}
            </Button>
            <Button type="button" variant="outline" onClick={() => void copyLink()}>
              {copied ? t("linkCopied") : t("copyLink")}
            </Button>
          </div>
          {saveMsg ? (
            <p className="text-sm text-gray-600" role="status">
              {saveMsg}
            </p>
          ) : null}
          {publishMsg ? (
            <p className="text-sm text-gray-600" role="status">
              {publishMsg}
            </p>
          ) : null}
          <p className="break-all text-xs text-gray-500">
            {t("shareUrl")}: {shareUrl}
          </p>
        </div>
      }
      form={editor}
      preview={preview}
      exportError={exportError}
      exportSuccess={exportSuccess}
      previewActions={
        <ToolExportActions
          exporting={exporting}
          pngLabel={t("exportPng")}
          pdfLabel={t("exportPdf")}
          onPng={() =>
            void runExport(async () => {
              if (!canvasRef.current) return;
              await exportNodeAsPng(
                canvasRef.current,
                formatFilename(
                  "pulse-poll",
                  brandKit.local.localNumber,
                  "png",
                ),
              );
            })
          }
          onPdf={() =>
            void runExport(async () => {
              if (!canvasRef.current) return;
              await nodeToPdf(
                canvasRef.current,
                formatFilename(
                  "pulse-poll",
                  brandKit.local.localNumber,
                  "pdf",
                ),
              );
            })
          }
        />
      }
      footer={<ToolRelatedFooter toolSlug="pulse-poll" />}
    />
  );
}
