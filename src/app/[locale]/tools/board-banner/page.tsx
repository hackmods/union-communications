"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useBrandStore } from "@/store/brand-store";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { downloadZip, exportNodeAsPng } from "@/lib/export/image-export";
import { nodesToPdf } from "@/lib/export/pdf-export";
import { formatFilename, resolveLocalNumber, cn } from "@/lib/utils";
import { isBrandThemeEstablished } from "@/lib/utils/brand-theme";
import {
  BOARD_SHEET_FORMATS,
  DEFAULT_BOARD_SHEET,
  DEFAULT_EDGE_WIDTH,
  DEFAULT_STRIP_HEIGHT,
  EDGE_WIDTH_PRESETS,
  STRIP_HEIGHT_PRESETS,
  boardSheetFormats,
  edgeWidthPresets,
  packCountForMode,
  sheetFilenameStem,
  stripHeightPresets,
  type BoardSheetId,
  type EdgeWidthId,
  type StripHeightId,
} from "@/lib/constants/board-banner-formats";
import {
  BANNER_LAYOUTS,
  DEFAULT_BANNER_LAYOUT,
  DEFAULT_BOARD_BANNER_MODE,
  DEFAULT_TRIM_KIT,
  bannerLayoutById,
  bannerLayoutUsesCallout,
  resolveTrimFocus,
  selectedTrimPieces,
  toggleTrimPiece,
  trimPieceById,
  type BannerLayoutId,
  type BoardBannerMode,
  type TrimKit,
  type TrimPieceId,
} from "@/lib/constants/board-banner-layouts";
import { type BoardLogoMode } from "@/lib/constants/board-banner-ornaments";
import { BoardBannerCanvas } from "@/components/tools/board-banner/BoardBannerCanvas";
import { BoardTrimCanvas } from "@/components/tools/board-banner/BoardTrimCanvas";
import { BoardBannerSheet } from "@/components/tools/board-banner/BoardBannerSheet";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ThemePicker } from "@/components/tools/ThemePicker";
import { UndoRedoBar } from "@/components/tools/UndoRedoBar";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { ToolEditorLayout } from "@/components/tools/ToolEditorLayout";
import { SegControl } from "@/components/tools/SegControl";

interface BoardBannerState {
  mode: BoardBannerMode;
  layout: BannerLayoutId;
  trimKit: TrimKit;
  /** Which kit piece is shown in the design / print preview */
  trimFocus: TrimPieceId;
  callout: string;
  showLocal: boolean;
  logoMode: BoardLogoMode;
  showByline: boolean;
  byline: string;
  stripHeightId: StripHeightId;
  edgeWidthId: EdgeWidthId;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}

/** Multi-select pill (kit toggles) — SegControl is single-select only. */
function TogglePill({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40",
        pressed
          ? "bg-opseu-blue text-white"
          : "border border-gray-300 bg-white text-opseu-dark hover:bg-gray-50",
      )}
    >
      {children}
    </button>
  );
}

export default function BoardBannerPage() {
  const t = useTranslations("boardBanner");
  const tc = useTranslations("common");
  const ts = useTranslations("sources");
  const brandKit = useBrandStore((s) => s.brandKit);
  const onboardingComplete = useBrandStore((s) => s.onboardingComplete);
  const hydrated = useBrandStore((s) => s.hydrated);
  const canvasRef = useRef<HTMLDivElement>(null);
  const exportHostRef = useRef<HTMLDivElement>(null);
  const [sheetId, setSheetId] = useState<BoardSheetId>(DEFAULT_BOARD_SHEET);
  const [exporting, setExporting] = useState(false);
  const brandingDefaultApplied = useRef(false);

  const themeEstablished = isBrandThemeEstablished(brandKit, onboardingComplete);
  const sheet = BOARD_SHEET_FORMATS[sheetId];

  const initial: BoardBannerState = {
    mode: DEFAULT_BOARD_BANNER_MODE,
    layout: DEFAULT_BANNER_LAYOUT,
    trimKit: DEFAULT_TRIM_KIT,
    trimFocus: "top",
    callout: "Did you know?",
    showLocal: true,
    logoMode: "none",
    showByline: false,
    byline: "",
    stripHeightId: DEFAULT_STRIP_HEIGHT,
    edgeWidthId: DEFAULT_EDGE_WIDTH,
    primaryColor: brandKit.primaryColor,
    secondaryColor: brandKit.secondaryColor,
    accentColor: brandKit.accentColor,
  };

  const { state, setState, undo, redo, canUndo, canRedo, reset } =
    useUndoRedo<BoardBannerState>(initial);

  useEffect(() => {
    if (!hydrated || brandingDefaultApplied.current) return;
    brandingDefaultApplied.current = true;
    const sub = brandKit.local.subText?.trim() ?? "";
    reset({
      ...initial,
      logoMode: themeEstablished ? "lockup" : "none",
      byline: sub,
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
  const stripHeightInches =
    STRIP_HEIGHT_PRESETS[state.stripHeightId].heightInches;
  const edgeWidthInches = EDGE_WIDTH_PRESETS[state.edgeWidthId].widthInches;

  const kitPieces = selectedTrimPieces(state.trimKit);
  const trimFocus = resolveTrimFocus(state.trimKit, state.trimFocus);

  const packCount =
    state.mode === "banner"
      ? packCountForMode({
          mode: "banner",
          trimPiece: "side",
          sheet,
          stripHeightInches,
          edgeWidthInches,
        })
      : kitPieces.reduce(
          (sum, piece) =>
            sum +
            packCountForMode({
              mode: "trim",
              trimPiece: piece,
              sheet,
              stripHeightInches,
              edgeWidthInches,
            }),
          0,
        );

  const activeHint =
    state.mode === "banner"
      ? t(bannerLayoutById(state.layout).hintKey)
      : t(trimPieceById(trimFocus).hintKey);

  const ornamentProps = {
    showLocal: state.showLocal,
    logoMode: state.logoMode,
    showByline: state.showByline,
    byline: state.byline,
  };

  const renderBannerPiece = () => (
    <BoardBannerCanvas
      layout={state.layout}
      callout={state.callout}
      localLabel={localLabel}
      localNumber={localNum}
      primaryColor={state.primaryColor}
      secondaryColor={state.secondaryColor}
      accentColor={state.accentColor}
      {...ornamentProps}
    />
  );

  const renderTrimPiece = (piece: TrimPieceId) =>
    piece === "top" ? (
      renderBannerPiece()
    ) : (
      <BoardTrimCanvas
        piece={piece}
        primaryColor={state.primaryColor}
        secondaryColor={state.secondaryColor}
        accentColor={state.accentColor}
        localNumber={localNum}
        edgeWidthInches={edgeWidthInches}
        {...ornamentProps}
      />
    );

  const showBannerArt =
    state.mode === "banner" ||
    (state.mode === "trim" && trimFocus === "top");

  const renderFocusedPiece = () =>
    showBannerArt ? renderBannerPiece() : renderTrimPiece(trimFocus);

  const designPreviewStyle: CSSProperties =
    state.mode === "trim" && trimFocus === "side"
      ? {
          aspectRatio: `${edgeWidthInches} / ${sheet.heightInches - sheet.marginInches * 2}`,
          maxWidth: "5.5rem",
          marginLeft: "auto",
          marginRight: "auto",
        }
      : state.mode === "trim" && trimFocus === "corner"
        ? {
            aspectRatio: "1 / 1",
            maxWidth: "9rem",
            marginLeft: "auto",
            marginRight: "auto",
          }
        : {
            aspectRatio: `${sheet.widthInches - sheet.marginInches * 2} / ${stripHeightInches}`,
          };

  const collectExportNodes = (): HTMLElement[] => {
    if (state.mode === "banner") {
      return canvasRef.current ? [canvasRef.current] : [];
    }
    const host = exportHostRef.current;
    if (!host) return canvasRef.current ? [canvasRef.current] : [];
    return Array.from(
      host.querySelectorAll<HTMLElement>("[data-export-sheet]"),
    );
  };

  const handleExportPng = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      if (state.mode === "banner") {
        if (!canvasRef.current) return;
        await exportNodeAsPng(
          canvasRef.current,
          formatFilename(
            sheetFilenameStem(sheet, "banner"),
            brandKit.local.localNumber,
            "png",
          ),
          { pixelRatio: 2, backgroundColor: "#FFFFFF" },
        );
        return;
      }

      const nodes = collectExportNodes();
      if (nodes.length === 0) return;
      if (nodes.length === 1) {
        const piece = kitPieces[0];
        await exportNodeAsPng(
          nodes[0],
          formatFilename(
            sheetFilenameStem(sheet, "trim", piece),
            brandKit.local.localNumber,
            "png",
          ),
          { pixelRatio: 2, backgroundColor: "#FFFFFF" },
        );
        return;
      }

      const { toBlob } = await import("html-to-image");
      const files: { name: string; blob: Blob }[] = [];
      for (let i = 0; i < nodes.length; i++) {
        const piece = kitPieces[i];
        const blob = await toBlob(nodes[i], {
          pixelRatio: 2,
          cacheBust: true,
          backgroundColor: "#FFFFFF",
          width: Math.max(1, Math.round(nodes[i].offsetWidth)),
          height: Math.max(1, Math.round(nodes[i].offsetHeight)),
        });
        if (!blob) continue;
        files.push({
          name: formatFilename(
            sheetFilenameStem(sheet, "trim", piece),
            brandKit.local.localNumber,
            "png",
          ),
          blob,
        });
      }
      if (files.length === 1) {
        const { downloadBlob } = await import("@/lib/export/image-export");
        downloadBlob(files[0].blob, files[0].name);
      } else if (files.length > 1) {
        await downloadZip(
          files,
          formatFilename(
            `board-frame-kit-${sheet.id}`,
            brandKit.local.localNumber,
            "zip",
          ),
        );
      }
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const nodes = collectExportNodes();
      if (nodes.length === 0) return;
      const stem =
        state.mode === "banner"
          ? sheetFilenameStem(sheet, "banner")
          : `board-frame-kit-${sheet.id}`;
      await nodesToPdf(
        nodes,
        formatFilename(stem, brandKit.local.localNumber, "pdf"),
        sheet.widthInches,
        sheet.heightInches,
        2,
        "#FFFFFF",
      );
    } finally {
      setExporting(false);
    }
  };

  const resetState = () => {
    const sub = brandKit.local.subText?.trim() ?? "";
    reset({
      ...initial,
      logoMode: themeEstablished ? "lockup" : "none",
      byline: sub,
      primaryColor: brandKit.primaryColor,
      secondaryColor: brandKit.secondaryColor,
      accentColor: brandKit.accentColor,
    });
  };

  const onKitPieceClick = (piece: TrimPieceId) => {
    const nextKit = toggleTrimPiece(state.trimKit, piece);
    const turningOn = !state.trimKit[piece] && nextKit[piece];
    setState({
      ...state,
      trimKit: nextKit,
      trimFocus: turningOn
        ? piece
        : resolveTrimFocus(nextKit, state.trimFocus),
    });
  };

  const kitSummary =
    state.mode === "trim"
      ? t("kitSummary", {
          pieces: kitPieces
            .map((piece) => t(trimPieceById(piece).labelKey))
            .join(" · "),
        })
      : null;

  return (
    <>
      <ToolEditorLayout
        title={t("title")}
        description={t("subtitle")}
        form={
          <Card density="compact" className="space-y-3">
            <div>
              <SegControl
                label={t("mode")}
                value={state.mode}
                options={(
                  [
                    ["banner", "modeBanner"],
                    ["trim", "modeTrim"],
                  ] as const
                ).map(([value, key]) => ({
                  value,
                  label: t(key),
                }))}
                onChange={(mode) => setState({ ...state, mode })}
              />
              {state.mode === "trim" ? (
                <p className="mt-2 text-xs text-gray-500">{t("trimModeHint")}</p>
              ) : null}
            </div>

            {state.mode === "trim" ? (
              <div>
                <p className="mb-1.5 text-sm font-medium text-gray-700" id="trim-label">
                  {t("frameKit")}
                </p>
                <div
                  className="flex flex-wrap gap-2"
                  role="group"
                  aria-labelledby="trim-label"
                >
                  {(
                    ["top", "side", "bottom", "corner"] as const
                  ).map((piece) => (
                    <TogglePill
                      key={piece}
                      pressed={state.trimKit[piece]}
                      onClick={() => onKitPieceClick(piece)}
                    >
                      {t(trimPieceById(piece).labelKey)}
                    </TogglePill>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500">{t("frameKitHint")}</p>

                <div className="mt-4">
                  <SegControl
                    label={t("previewPiece")}
                    value={trimFocus}
                    options={kitPieces.map((piece) => ({
                      value: piece,
                      label: t(trimPieceById(piece).labelKey),
                    }))}
                    onChange={(piece) =>
                      setState({ ...state, trimFocus: piece })
                    }
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">{activeHint}</p>
                {kitSummary ? (
                  <p className="mt-1 text-xs font-medium text-opseu-dark">
                    {kitSummary}
                  </p>
                ) : null}
              </div>
            ) : null}

            {showBannerArt ? (
              <div>
                <SegControl
                  label={t("layout")}
                  value={state.layout}
                  options={BANNER_LAYOUTS.map((layout) => ({
                    value: layout.id,
                    label: t(layout.labelKey),
                  }))}
                  onChange={(layout) => setState({ ...state, layout })}
                />
                {state.mode === "banner" ? (
                  <p className="mt-2 text-xs text-gray-500">{activeHint}</p>
                ) : null}
              </div>
            ) : null}

            {showBannerArt && usesCallout ? (
              <Input
                label={t("callout")}
                value={state.callout}
                onChange={(e) =>
                  setState({ ...state, callout: e.target.value })
                }
              />
            ) : null}

            <fieldset className="space-y-3 border-t border-gray-100 pt-4">
              <legend className="text-sm font-medium text-opseu-dark">
                {t("ornaments")}
              </legend>
              <p className="text-xs text-gray-500">{t("ornamentsHint")}</p>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={state.showLocal}
                  onChange={(e) =>
                    setState({ ...state, showLocal: e.target.checked })
                  }
                />
                {t("showLocal")}
              </label>

              <SegControl
                label={t("logoMode")}
                value={state.logoMode}
                options={(
                  [
                    ["none", "logoNone"],
                    ["lockup", "logoLockup"],
                    ["mark", "logoMark"],
                  ] as const
                ).map(([value, key]) => ({
                  value,
                  label: t(key),
                }))}
                onChange={(logoMode) => setState({ ...state, logoMode })}
              />

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={state.showByline}
                  onChange={(e) =>
                    setState({ ...state, showByline: e.target.checked })
                  }
                />
                {t("showByline")}
              </label>
              {state.showByline ? (
                <Input
                  label={t("byline")}
                  value={state.byline}
                  onChange={(e) =>
                    setState({ ...state, byline: e.target.value })
                  }
                  placeholder={t("bylinePlaceholder")}
                />
              ) : null}
            </fieldset>

            {!themeEstablished ? (
              <p className="text-sm text-gray-600">
                {t("setupBrandPrompt")}{" "}
                <Link href="/onboarding" className="text-opseu-blue underline">
                  {t("setupBrandLink")}
                </Link>
              </p>
            ) : null}

            {(state.mode === "banner" ||
              state.trimKit.top ||
              state.trimKit.bottom) && (
              <SegControl
                label={t("stripHeight")}
                value={state.stripHeightId}
                options={stripHeightPresets().map((p) => ({
                  value: p.id,
                  label: t(p.labelKey),
                }))}
                onChange={(stripHeightId) =>
                  setState({ ...state, stripHeightId })
                }
              />
            )}

            {state.mode === "trim" &&
              (state.trimKit.side || state.trimKit.corner) && (
                <SegControl
                  label={t("edgeWidth")}
                  value={state.edgeWidthId}
                  options={edgeWidthPresets().map((p) => ({
                    value: p.id,
                    label: t(p.labelKey),
                  }))}
                  onChange={(edgeWidthId) =>
                    setState({ ...state, edgeWidthId })
                  }
                />
              )}

            <div>
              <SegControl
                label={t("sheetSize")}
                value={sheetId}
                options={boardSheetFormats().map((f) => ({
                  value: f.id,
                  label: t(f.labelKey),
                }))}
                onChange={setSheetId}
              />
              <p className="mt-2 text-xs text-gray-500">{t("packHint")}</p>
            </div>

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
                className="mb-1 block text-sm font-medium text-gray-700"
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

            <UndoRedoBar
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={undo}
              onRedo={redo}
              onReset={resetState}
            />
            <div className="flex gap-3">
              <Button onClick={handleExportPng} disabled={exporting}>
                {state.mode === "trim" && kitPieces.length > 1
                  ? tc("downloadZip")
                  : tc("downloadPng")}
              </Button>
              <Button
                variant="outline"
                onClick={handleExportPdf}
                disabled={exporting}
              >
                {tc("downloadPdf")}
              </Button>
            </div>
          </Card>
        }
        previewActions={
          <>
            <Button onClick={handleExportPng} disabled={exporting}>
              {state.mode === "trim" && kitPieces.length > 1
                ? tc("downloadZip")
                : tc("downloadPng")}
            </Button>
            <Button
              variant="outline"
              onClick={handleExportPdf}
              disabled={exporting}
            >
              {tc("downloadPdf")}
            </Button>
          </>
        }
        preview={
          <div>
            <p className="mb-1 text-sm font-medium text-gray-700">
              {t("designPreview")}
            </p>
            <p className="mb-2 text-xs text-gray-500">
              {state.mode === "trim" && trimFocus === "top"
                ? t("topDesignHint")
                : state.mode === "trim" && trimFocus === "side"
                  ? t("sideDesignHint")
                  : state.mode === "trim" && trimFocus === "bottom"
                    ? t("bottomDesignHint")
                    : state.mode === "trim" && trimFocus === "corner"
                      ? t("cornerDesignHint")
                      : t("designPreviewHint")}
            </p>
            <div className="shadow-lg">
              <div
                className="w-full overflow-hidden bg-white"
                style={designPreviewStyle}
              >
                {renderFocusedPiece()}
              </div>
            </div>
          </div>
        }
        previewSecondary={
          <div>
            <p className="mb-1 text-sm font-medium text-gray-700">
              {t("printSheet")}
            </p>
            <p className="mb-2 text-xs text-gray-500">
              {state.mode === "trim" && kitPieces.length > 1
                ? t("kitPackSummary", {
                    count: packCount,
                    sheets: kitPieces.length,
                  })
                : t("packSummary", { count: packCount })}
            </p>
            <div className="shadow-lg">
              <div
                ref={canvasRef}
                className={cn("w-full", sheet.aspect)}
                style={{ backgroundColor: "#FFFFFF" }}
              >
                <BoardBannerSheet
                  sheet={sheet}
                  mode={state.mode === "banner" ? "banner" : "trim"}
                  trimPiece={
                    state.mode === "banner" ? "side" : trimFocus
                  }
                  stripHeightInches={stripHeightInches}
                  edgeWidthInches={edgeWidthInches}
                  renderPiece={renderFocusedPiece}
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-500">{t("cutGuideHint")}</p>
          </div>
        }
        footer={
          <SourcesBlock
            pageId="boardBanner"
            title={ts("title")}
            intro={ts("intro")}
          />
        }
      />

      {/* Off-screen pack sheets for multi-piece kit export */}
      {state.mode === "trim" ? (
        <div
          ref={exportHostRef}
          aria-hidden
          className="pointer-events-none fixed left-[-10000px] top-0 w-[420px]"
        >
          {kitPieces.map((piece) => (
            <div
              key={piece}
              data-export-sheet={piece}
              className={cn("w-full", sheet.aspect)}
              style={{ backgroundColor: "#FFFFFF" }}
            >
              <BoardBannerSheet
                sheet={sheet}
                mode="trim"
                trimPiece={piece}
                stripHeightInches={stripHeightInches}
                edgeWidthInches={edgeWidthInches}
                renderPiece={() => renderTrimPiece(piece)}
              />
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}
