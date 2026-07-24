"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useBrandStore } from "@/store/brand-store";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { useExportHandler } from "@/hooks/use-export-handler";
import { exportNodeAsPng } from "@/lib/export/image-export";
import { nodeToPdf } from "@/lib/export/pdf-export";
import { qrDataUrl } from "@/lib/export/qr";
import { formatFilename, resolveLocalNumber, cn } from "@/lib/utils";
import { isBrandThemeEstablished } from "@/lib/utils/brand-theme";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { ThemePicker } from "@/components/tools/ThemePicker";
import { UndoRedoBar } from "@/components/tools/UndoRedoBar";
import { ToolEditorLayout } from "@/components/tools/ToolEditorLayout";
import { pickContrastingInk } from "@/lib/utils/ink";
import {
  createEmptyPulsePollDraft,
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
  const seeded = useRef(false);

  const themeEstablished = isBrandThemeEstablished(brandKit, onboardingComplete);

  const initial = createEmptyPulsePollDraft({
    primaryColor: brandKit.primaryColor,
    secondaryColor: brandKit.secondaryColor,
  });

  const { state, setState, undo, redo, canUndo, canRedo, reset } =
    useUndoRedo<PulsePollDraft>(initial);
  const { exportError, exporting, runExport } = useExportHandler();

  useEffect(() => {
    if (!hydrated || seeded.current) return;
    seeded.current = true;
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
        title: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot hydrate
  }, [hydrated, themeEstablished]);

  const slug = sanitizePollSlug(state.slug) || "member-pulse";
  const sharePath = `/${locale}/poll/${slug}`;
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${sharePath}`
      : sharePath;

  useEffect(() => {
    let cancelled = false;
    void qrDataUrl(shareUrl, { width: 280 }).then((url) => {
      if (!cancelled) setQrSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [shareUrl]);

  function persist() {
    const ok = savePulsePollDraft({ ...state, slug });
    setSaveMsg(ok ? t("saved") : t("saveError"));
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
  const previewStyle: CSSProperties = {
    background: `linear-gradient(160deg, ${state.primaryColor}, ${state.secondaryColor})`,
    color: ink,
  };

  const editor = (
    <div className="space-y-4">
      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
        {t("privacyNotice")}
      </p>

      {!themeEstablished && (
        <p className="text-sm text-gray-600">
          {t("setupBrandPrompt")}{" "}
          <Link href="/onboarding" className="text-opseu-blue underline">
            {t("setupBrandLink")}
          </Link>
        </p>
      )}

      <ThemePicker
        primaryColor={state.primaryColor}
        secondaryColor={state.secondaryColor}
        onPrimaryChange={(primaryColor) =>
          setState({ ...state, primaryColor })
        }
        onSecondaryChange={(secondaryColor) =>
          setState({ ...state, secondaryColor })
        }
      />

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
      <p className="text-xs text-gray-500">{t("shareSlugHint")}</p>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={state.includeBranding}
          onChange={(e) =>
            setState({ ...state, includeBranding: e.target.checked })
          }
        />
        {t("includeBranding")}
      </label>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={persist}>
          {tc("save")}
        </Button>
        <Button type="button" variant="outline" onClick={() => void copyLink()}>
          {copied ? t("linkCopied") : t("copyLink")}
        </Button>
      </div>
      {saveMsg && (
        <p className="text-sm text-gray-600" role="status">
          {saveMsg}
        </p>
      )}
      <p className="break-all text-xs text-gray-500">
        {t("shareUrl")}: {shareUrl}
      </p>

      <UndoRedoBar
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        onReset={() =>
          reset(
            createEmptyPulsePollDraft({
              primaryColor: brandKit.primaryColor,
              secondaryColor: brandKit.secondaryColor,
            }),
          )
        }
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={exporting}
          onClick={() =>
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
        >
          {t("exportPng")}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={exporting}
          onClick={() =>
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
        >
          {t("exportPdf")}
        </Button>
      </div>
      {exportError && (
        <p className="text-sm text-red-700" role="alert">
          {exportError}
        </p>
      )}
    </div>
  );

  const preview = (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">{t("previewHeading")}</p>
      <div
        ref={canvasRef}
        className="mx-auto flex w-full max-w-sm flex-col gap-4 rounded-lg p-6 shadow-sm"
        style={previewStyle}
      >
        {state.includeBranding && themeEstablished && (
          <div className="flex items-center gap-2">
            <BrandLogo className="h-10 w-auto" />
            <span className="text-sm font-semibold">
              Local {resolveLocalNumber(brandKit.local.localNumber)}
            </span>
          </div>
        )}
        <h2 className="text-xl font-bold leading-tight">
          {state.title.trim() || t("title")}
        </h2>
        {state.intro.trim() && (
          <p className="text-sm opacity-90">{state.intro}</p>
        )}
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {state.questions
            .filter((q) => q.text.trim())
            .map((q) => (
              <li key={q.id}>{q.text}</li>
            ))}
        </ol>
        <div className="mt-2 flex flex-col items-center gap-2 rounded-md bg-white/90 p-3 text-gray-900">
          {qrSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL QR
            <img src={qrSrc} alt="" width={160} height={160} />
          ) : (
            <div className="flex h-40 w-40 items-center justify-center bg-gray-100 text-xs text-gray-500">
              QR
            </div>
          )}
          <p className={cn("text-center text-xs")}>{t("qrHint")}</p>
        </div>
      </div>
    </div>
  );

  return (
    <ToolEditorLayout
      title={t("title")}
      description={t("subtitle")}
      form={editor}
      preview={preview}
      exportError={exportError}
    />
  );
}
