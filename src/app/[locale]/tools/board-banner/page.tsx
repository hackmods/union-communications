"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useBrandStore } from "@/store/brand-store";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { exportNodeAsPng } from "@/lib/export/image-export";
import { nodeToPdf } from "@/lib/export/pdf-export";
import { formatFilename, resolveLocalNumber, cn } from "@/lib/utils";
import { isBrandThemeEstablished } from "@/lib/utils/brand-theme";
import {
  BOARD_BANNER_FORMATS,
  DEFAULT_BOARD_BANNER_FORMAT,
  boardBannerFormats,
  trimFilenameStem,
  type BoardBannerFormatId,
} from "@/lib/constants/board-banner-formats";
import {
  BANNER_LAYOUTS,
  DEFAULT_BANNER_LAYOUT,
  DEFAULT_BOARD_BANNER_MODE,
  DEFAULT_TRIM_PIECE,
  TRIM_PIECES,
  bannerLayoutUsesCallout,
  type BannerLayoutId,
  type BoardBannerMode,
  type TrimPieceId,
} from "@/lib/constants/board-banner-layouts";
import { BoardBannerCanvas } from "@/components/tools/board-banner/BoardBannerCanvas";
import { BoardTrimCanvas } from "@/components/tools/board-banner/BoardTrimCanvas";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ThemePicker } from "@/components/tools/ThemePicker";
import { UndoRedoBar } from "@/components/tools/UndoRedoBar";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { PageShell } from "@/components/layout/PageShell";

interface BoardBannerState {
  mode: BoardBannerMode;
  layout: BannerLayoutId;
  trimPiece: TrimPieceId;
  callout: string;
  includeLogo: boolean;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

export default function BoardBannerPage() {
  const t = useTranslations("boardBanner");
  const tc = useTranslations("common");
  const ts = useTranslations("sources");
  const brandKit = useBrandStore((s) => s.brandKit);
  const onboardingComplete = useBrandStore((s) => s.onboardingComplete);
  const hydrated = useBrandStore((s) => s.hydrated);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [formatId, setFormatId] = useState<BoardBannerFormatId>(
    DEFAULT_BOARD_BANNER_FORMAT,
  );
  const brandingDefaultApplied = useRef(false);

  const themeEstablished = isBrandThemeEstablished(brandKit, onboardingComplete);
  const format = BOARD_BANNER_FORMATS[formatId];

  const initial: BoardBannerState = {
    mode: DEFAULT_BOARD_BANNER_MODE,
    layout: DEFAULT_BANNER_LAYOUT,
    trimPiece: DEFAULT_TRIM_PIECE,
    callout: "Did you know?",
    includeLogo: false,
    primaryColor: brandKit.primaryColor,
    secondaryColor: brandKit.secondaryColor,
    accentColor: brandKit.accentColor,
  };

  const { state, setState, undo, redo, canUndo, canRedo, reset } =
    useUndoRedo<BoardBannerState>(initial);

  useEffect(() => {
    if (!hydrated || brandingDefaultApplied.current) return;
    brandingDefaultApplied.current = true;
    reset({
      ...initial,
      includeLogo: themeEstablished,
      primaryColor: brandKit.primaryColor,
      secondaryColor: brandKit.secondaryColor,
      accentColor: brandKit.accentColor,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot after hydrate
  }, [hydrated, themeEstablished]);

  const localNum = resolveLocalNumber(brandKit.local.localNumber);
  const localLabel = brandKit.local.subText
    ? `Local ${localNum} - ${brandKit.local.subText}`
    : `Local ${localNum}`;
  const usesCallout = bannerLayoutUsesCallout(state.layout);

  const exportBackground =
    state.mode === "banner" && state.layout === "slantCallout"
      ? "#FFFFFF"
      : state.primaryColor;

  const handleExportPng = async () => {
    if (!canvasRef.current) return;
    const stem =
      state.mode === "banner"
        ? format.filenameStem
        : trimFilenameStem(format, state.trimPiece);
    await exportNodeAsPng(
      canvasRef.current,
      formatFilename(stem, brandKit.local.localNumber, "png"),
      { pixelRatio: 2, backgroundColor: exportBackground },
    );
  };

  const handleExportPdf = async () => {
    if (!canvasRef.current) return;
    const stem =
      state.mode === "banner"
        ? format.filenameStem
        : trimFilenameStem(format, state.trimPiece);
    await nodeToPdf(
      canvasRef.current,
      formatFilename(stem, brandKit.local.localNumber, "pdf"),
      format.widthInches,
      format.heightInches,
      2,
      exportBackground,
    );
  };

  return (
    <PageShell className="py-12">
      <h1 className="text-3xl font-bold text-opseu-dark">{t("title")}</h1>
      <p className="mt-2 text-gray-600">{t("subtitle")}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Card className="space-y-4">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">{t("mode")}</legend>
            <div className="flex flex-wrap gap-2">
              {(["banner", "trim"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={state.mode === mode}
                  onClick={() => setState({ ...state, mode })}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                    state.mode === mode
                      ? "bg-opseu-blue text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                  )}
                >
                  {t(mode === "banner" ? "modeBanner" : "modeTrim")}
                </button>
              ))}
            </div>
          </fieldset>

          {state.mode === "banner" ? (
            <fieldset>
              <legend className="mb-2 text-sm font-medium">{t("layout")}</legend>
              <div className="flex flex-wrap gap-2">
                {BANNER_LAYOUTS.map((layout) => (
                  <button
                    key={layout.id}
                    type="button"
                    aria-pressed={state.layout === layout.id}
                    onClick={() =>
                      setState({ ...state, layout: layout.id })
                    }
                    className={cn(
                      "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                      state.layout === layout.id
                        ? "bg-opseu-blue text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                    )}
                  >
                    {t(layout.labelKey)}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : (
            <fieldset>
              <legend className="mb-2 text-sm font-medium">{t("trimPiece")}</legend>
              <div className="flex flex-wrap gap-2">
                {TRIM_PIECES.map((piece) => (
                  <button
                    key={piece.id}
                    type="button"
                    aria-pressed={state.trimPiece === piece.id}
                    onClick={() =>
                      setState({ ...state, trimPiece: piece.id })
                    }
                    className={cn(
                      "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                      state.trimPiece === piece.id
                        ? "bg-opseu-blue text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                    )}
                  >
                    {t(piece.labelKey)}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {state.mode === "banner" && usesCallout ? (
            <Input
              label={t("callout")}
              value={state.callout}
              onChange={(e) =>
                setState({ ...state, callout: e.target.value })
              }
            />
          ) : null}

          {state.mode === "banner" ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={state.includeLogo}
                onChange={(e) =>
                  setState({ ...state, includeLogo: e.target.checked })
                }
                className="rounded border-gray-300"
              />
              {t("includeLogo")}
            </label>
          ) : null}

          {!themeEstablished ? (
            <p className="text-sm text-gray-600">
              {t("setupBrandPrompt")}{" "}
              <Link href="/onboarding" className="text-opseu-blue underline">
                {t("setupBrandLink")}
              </Link>
            </p>
          ) : null}

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

          <div>
            <label
              htmlFor="banner-accent"
              className="mb-1 block text-sm font-medium"
            >
              {t("accentColor")}
            </label>
            <input
              id="banner-accent"
              type="color"
              value={state.accentColor}
              onChange={(e) =>
                setState({ ...state, accentColor: e.target.value })
              }
              className="h-10 w-full cursor-pointer rounded-md border border-gray-300"
            />
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">{t("format")}</legend>
            <div className="flex flex-wrap gap-2">
              {boardBannerFormats().map((f) => (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={formatId === f.id}
                  onClick={() => setFormatId(f.id)}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                    formatId === f.id
                      ? "bg-opseu-blue text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                  )}
                >
                  {t(f.labelKey)}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-600">{t("tileHint")}</p>
          </fieldset>

          <UndoRedoBar
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
            onReset={() =>
              reset({
                ...initial,
                includeLogo: themeEstablished,
                primaryColor: brandKit.primaryColor,
                secondaryColor: brandKit.secondaryColor,
                accentColor: brandKit.accentColor,
              })
            }
          />
          <div className="flex gap-3">
            <Button onClick={handleExportPng}>{tc("downloadPng")}</Button>
            <Button variant="outline" onClick={handleExportPdf}>
              {tc("downloadPdf")}
            </Button>
          </div>
        </Card>

        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">
            {t("preview")}
          </p>
          {/* Cut guide dash outside canvasRef — not captured */}
          <div
            className="rounded-md border border-dashed border-gray-300 p-2"
            title={t("cutGuideHint")}
          >
            <div className="shadow-lg">
              <div ref={canvasRef} className={cn("w-full", format.aspect)}>
                {state.mode === "banner" ? (
                  <BoardBannerCanvas
                    layout={state.layout}
                    callout={state.callout}
                    localLabel={localLabel}
                    localNumber={localNum}
                    includeLogo={state.includeLogo}
                    primaryColor={state.primaryColor}
                    secondaryColor={state.secondaryColor}
                    accentColor={state.accentColor}
                  />
                ) : (
                  <BoardTrimCanvas
                    piece={state.trimPiece}
                    primaryColor={state.primaryColor}
                    secondaryColor={state.secondaryColor}
                    accentColor={state.accentColor}
                    localNumber={localNum}
                  />
                )}
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500">{t("cutGuideHint")}</p>
        </div>
      </div>

      <SourcesBlock pageId="boardBanner" title={ts("title")} intro={ts("intro")} />
    </PageShell>
  );
}
