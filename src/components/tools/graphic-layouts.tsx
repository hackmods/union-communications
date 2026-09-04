"use client";

import type { ComponentProps, CSSProperties } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import type { BoardLogoMode } from "@/lib/constants/board-banner-ornaments";
import {
  resolveLogoVariant,
  showCanvasLogo,
} from "@/lib/comms/canvas-logo-mode";
import {
  CanvasDuotonePhoto,
  CanvasGrainOverlay,
} from "@/components/tools/canvas";
import { cn } from "@/lib/utils";
import {
  graphicAspectClass,
  type ExampleAspect,
  type ExampleLayout,
} from "@/lib/constants/examples";
import { hexToRgba } from "@/lib/utils/contrast";
import {
  inkWithAlpha,
  mutedInkOnBackground,
  pickContrastingInk,
  pickFieldInk,
} from "@/lib/utils/ink";
import type { QuoteLayoutId } from "@/lib/comms/quote-layouts";
import { graphicLayoutChrome } from "@/lib/comms/graphic-layout-chrome";
import type { CanvasTokens } from "@/lib/utils/canvas-tokens";
import {
  brandFieldBottomLiftStyle,
  brandFieldEndColor,
  brandFieldFillStyle,
  canvasSurfaceStyle,
  softGradientEndColor,
} from "@/lib/utils/canvas-surface";
import { JointActionCard } from "@/components/comms/campaign/JointActionCard";

export type GraphicLayoutId = Exclude<ExampleLayout, "quote">;

export const GRAPHIC_LAYOUT_ORDER: readonly GraphicLayoutId[] = [
  "solidarity",
  "thanks",
  "spotlight",
  "notice",
  "results",
  "jointAction",
] as const;

export interface GraphicLayoutCopy {
  headline: string;
  body: string;
  detail?: string;
  initials?: string;
}

export interface GraphicLayoutColors {
  primary: string;
  accent: string;
  secondary: string;
}

export interface GraphicLayoutCanvasProps {
  layout: ExampleLayout;
  aspect: ExampleAspect;
  copy: GraphicLayoutCopy;
  colors: GraphicLayoutColors;
  localNumber: string;
  subText: string;
  /** Optional photo for solidarity / spotlight / thanks */
  photoUrl?: string;
  photoScale?: number;
  /** Larger padding/type for export canvases */
  size?: "preview" | "export";
  className?: string;
  style?: CSSProperties;
  /** Brand Kit canvas tokens — omit for legacy look via caller */
  tokens?: CanvasTokens;
  logoMode?: BoardLogoMode;
  showLocalNumber?: boolean;
  /** Optional coalition badge from Brand Kit campaign badge */
  coalitionBadge?: string;
}

/**
 * Effective canvas under bottom-anchored copy on solidarity / spotlight /
 * thanks. Those layouts always paint a dark lift scrim; ink must sample the
 * scrim, not primary — gold/coral plates otherwise keep black type on brown.
 */
const BOTTOM_SCRIM_INK_BG = "#1A1A1A";

/** Inline hex/rgba only — Tailwind v4 oklch utilities wash out html-to-image PNGs */
function inkPalette(background: string, fieldStops?: readonly string[]) {
  const stops = fieldStops?.filter(Boolean) ?? [];
  const ink =
    stops.length > 1
      ? pickFieldInk(stops)
      : pickContrastingInk(stops[0] ?? background);
  // Field ink is a compromise across stops — keep muted tones on that same
  // ink. Solid backgrounds still bump alpha via mutedInkOnBackground for AA.
  const mute = (alpha: number) =>
    stops.length > 1
      ? inkWithAlpha(ink, alpha)
      : mutedInkOnBackground(stops[0] ?? background, alpha);
  return {
    ink,
    full: ink,
    a90: mute(0.9),
    a80: mute(0.8),
    a70: mute(0.7),
    a60: inkWithAlpha(ink, 0.6),
    a30: inkWithAlpha(ink, 0.3),
    a12: inkWithAlpha(ink, 0.12),
  };
}

/** Foreground palette from an explicit text colour (any hex). */
function textPalette(color: string) {
  return {
    full: color,
    a90: hexToRgba(color, 0.9) ?? color,
    a80: hexToRgba(color, 0.8) ?? color,
    a70: hexToRgba(color, 0.7) ?? color,
    a60: hexToRgba(color, 0.6) ?? color,
    a30: hexToRgba(color, 0.3) ?? color,
  };
}

function LocalFooter({
  localNumber,
  subText,
  size,
  color,
  show = true,
}: {
  localNumber: string;
  subText: string;
  size: "preview" | "export";
  color: string;
  show?: boolean;
}) {
  if (!show) return null;
  return (
    <p
      className={cn(
        size === "export" ? "mt-3 text-sm" : "mt-2 text-[10px] sm:text-xs",
      )}
      style={{ color }}
    >
      Local {localNumber}
      {subText ? ` - ${subText}` : ""}
    </p>
  );
}

function PhotoLayer({
  photoUrl,
  photoScale,
  primary,
  accent,
  duotone,
  highlightOpacity,
}: {
  photoUrl?: string;
  photoScale: number;
  primary: string;
  accent: string;
  duotone?: boolean;
  highlightOpacity?: number;
}) {
  if (!photoUrl) return null;
  if (duotone) {
    return (
      <CanvasDuotonePhoto
        photoUrl={photoUrl}
        shadowColor={primary}
        highlightColor={accent}
        highlightOpacity={highlightOpacity}
        photoScale={photoScale}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- blob/data URL; next/image adds no benefit
    <img
      src={photoUrl}
      alt=""
      aria-hidden
      className="absolute inset-0 h-full w-full object-cover"
      style={{ transform: `scale(${photoScale})`, opacity: 0.35 }}
    />
  );
}

function LayoutBrandLogo({
  logoMode = "lockup",
  ...props
}: ComponentProps<typeof BrandLogo> & { logoMode?: BoardLogoMode }) {
  if (!showCanvasLogo(logoMode)) return null;
  return (
    <BrandLogo {...props} variantOverride={resolveLogoVariant(logoMode)} />
  );
}

export function GraphicLayoutCanvas({
  layout,
  aspect,
  copy,
  colors,
  localNumber,
  subText,
  photoUrl,
  photoScale = 1,
  size = "preview",
  className,
  style,
  tokens,
  logoMode = "lockup",
  showLocalNumber = true,
  coalitionBadge,
}: GraphicLayoutCanvasProps) {
  const { primary, accent, secondary } = colors;
  const surface = tokens
    ? canvasSurfaceStyle(tokens, { primary, secondary, accent })
    : { backgroundColor: primary };
  const photoDuotone = Boolean(photoUrl && tokens?.surface === "duotone");

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden",
        graphicAspectClass(aspect),
        className,
      )}
      style={{ ...surface, ...style }}
    >
      {tokens ? <CanvasGrainOverlay opacity={tokens.grainOpacity} /> : null}
      {layout === "spotlight" && (
        <SpotlightLayout
          primary={primary}
          accent={accent}
          secondary={secondary}
          copy={copy}
          localNumber={localNumber}
          subText={subText}
          photoUrl={photoUrl}
          photoScale={photoScale}
          size={size}
          photoDuotone={photoDuotone}
          highlightOpacity={tokens?.duotoneHighlightOpacity}
          tokens={tokens}
          logoMode={logoMode}
          showLocalNumber={showLocalNumber}
        />
      )}
      {layout === "quote" && (
        <QuoteLayout
          primary={primary}
          accent={accent}
          secondary={secondary}
          copy={copy}
          localNumber={localNumber}
          subText={subText}
          size={size}
          aspect={aspect}
          tokens={tokens}
          logoMode={logoMode}
          showLocalNumber={showLocalNumber}
        />
      )}
      {layout === "results" && (
        <ResultsLayout
          primary={primary}
          accent={accent}
          copy={copy}
          localNumber={localNumber}
          subText={subText}
          size={size}
          tokens={tokens}
          logoMode={logoMode}
          showLocalNumber={showLocalNumber}
        />
      )}
      {layout === "notice" && (
        <NoticeLayout
          primary={primary}
          accent={accent}
          secondary={secondary}
          copy={copy}
          localNumber={localNumber}
          subText={subText}
          size={size}
          tokens={tokens}
          logoMode={logoMode}
          showLocalNumber={showLocalNumber}
        />
      )}
      {(layout === "solidarity" || layout === "thanks") && (
        <SolidarityLayout
          primary={primary}
          accent={accent}
          secondary={secondary}
          copy={copy}
          localNumber={localNumber}
          subText={subText}
          thanks={layout === "thanks"}
          photoUrl={photoUrl}
          photoScale={photoScale}
          size={size}
          photoDuotone={photoDuotone}
          highlightOpacity={tokens?.duotoneHighlightOpacity}
          tokens={tokens}
          logoMode={logoMode}
          showLocalNumber={showLocalNumber}
        />
      )}
      {layout === "jointAction" && (
        <JointActionLayout
          primary={primary}
          accent={accent}
          copy={copy}
          localNumber={localNumber}
          subText={subText}
          size={size}
          coalitionBadge={coalitionBadge}
          showLocalNumber={showLocalNumber}
        />
      )}
    </div>
  );
}

function JointActionLayout({
  primary,
  accent,
  copy,
  localNumber,
  subText,
  size,
  coalitionBadge,
  showLocalNumber,
}: {
  primary: string;
  accent: string;
  copy: GraphicLayoutCopy;
  localNumber: string;
  subText: string;
  size: "preview" | "export";
  coalitionBadge?: string;
  showLocalNumber: boolean;
}) {
  const chrome = graphicLayoutChrome(undefined, size === "export");
  const actionLabel = copy.detail?.trim() || "Show up — details to follow";

  return (
    <div
      className="flex h-full flex-col justify-center"
      style={{ padding: chrome.pad, backgroundColor: primary }}
    >
      <JointActionCard
        primaryColor={primary}
        accentColor={accent}
        title={copy.headline}
        body={copy.body}
        actionLabel={actionLabel}
        coalitionBadge={coalitionBadge}
        className={size === "export" ? "text-base" : "text-sm"}
      />
      <LocalFooter
        localNumber={localNumber}
        subText={subText}
        size={size}
        color={pickContrastingInk(primary)}
        show={showLocalNumber}
      />
    </div>
  );
}

function SolidarityLayout({
  primary,
  accent,
  copy,
  localNumber,
  subText,
  photoUrl,
  photoScale,
  size,
  photoDuotone,
  highlightOpacity,
  tokens,
  logoMode = "lockup",
  showLocalNumber = true,
}: {
  primary: string;
  accent: string;
  secondary: string;
  copy: GraphicLayoutCopy;
  localNumber: string;
  subText: string;
  thanks: boolean;
  photoUrl?: string;
  photoScale: number;
  size: "preview" | "export";
  photoDuotone?: boolean;
  highlightOpacity?: number;
  tokens?: CanvasTokens;
  logoMode?: BoardLogoMode;
  showLocalNumber?: boolean;
}) {
  const exportMode = size === "export";
  // Bottom copy always sits on the dark lift scrim (with or without a photo).
  const footerBg = BOTTOM_SCRIM_INK_BG;
  const ink = inkPalette(footerBg);
  const chrome = graphicLayoutChrome(tokens, exportMode);
  return (
    <>
      <div className="absolute inset-0" style={brandFieldFillStyle(primary)} />
      <PhotoLayer
        photoUrl={photoUrl}
        photoScale={photoScale}
        primary={primary}
        accent={accent}
        duotone={photoDuotone}
        highlightOpacity={highlightOpacity}
      />
      <div
        className="absolute inset-0"
        style={brandFieldBottomLiftStyle("solidarity")}
      />
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          padding: chrome.pad,
          textAlign: chrome.textAlign,
        }}
      >
        <LayoutBrandLogo
          logoMode={logoMode}
          size={exportMode ? "md" : "sm"}
          backgroundColor={footerBg}
          className="mb-2"
        />
        <h3
          className={cn(
            "font-bold leading-tight",
            !chrome.titlePx && (exportMode ? "text-3xl" : "text-base sm:text-lg"),
          )}
          style={{
            color: ink.full,
            fontSize: chrome.titlePx,
            fontWeight: chrome.titleWeight,
            letterSpacing: chrome.titleTracking,
            textTransform: chrome.titleTransform,
            fontFamily: chrome.headlineFontFamily,
          }}
        >
          {copy.headline}
        </h3>
        <p
          className={cn(
            "mt-1",
            !chrome.bodyPx && (exportMode ? "text-lg" : "text-xs sm:text-sm"),
          )}
          style={{ color: ink.a90, fontSize: chrome.bodyPx, fontFamily: chrome.bodyFontFamily,
            fontWeight: chrome.bodyFontWeight,
            lineHeight: chrome.bodyLineHeight }}
        >
          {copy.body}
        </p>
        {copy.detail ? (
          <p
            className={cn(
              "mt-2 font-semibold uppercase tracking-wide",
              !chrome.metaPx && (exportMode ? "text-sm" : "text-[10px]"),
            )}
            style={{ color: ink.a80, fontSize: chrome.metaPx, fontFamily: chrome.bodyFontFamily,
            fontWeight: chrome.bodyFontWeight,
            lineHeight: chrome.bodyLineHeight }}
          >
            {copy.detail}
          </p>
        ) : null}
        <LocalFooter
          localNumber={localNumber}
          subText={subText}
          size={size}
          color={ink.a70}
          show={showLocalNumber}
        />
      </div>
    </>
  );
}

function SpotlightLayout({
  primary,
  accent,
  copy,
  localNumber,
  subText,
  photoUrl,
  photoScale,
  size,
  photoDuotone,
  highlightOpacity,
  tokens,
  logoMode = "lockup",
  showLocalNumber = true,
}: {
  primary: string;
  accent: string;
  secondary: string;
  copy: GraphicLayoutCopy;
  localNumber: string;
  subText: string;
  photoUrl?: string;
  photoScale: number;
  size: "preview" | "export";
  photoDuotone?: boolean;
  highlightOpacity?: number;
  tokens?: CanvasTokens;
  logoMode?: BoardLogoMode;
  showLocalNumber?: boolean;
}) {
  const initials = copy.initials ?? "M";
  const exportMode = size === "export";
  const footerBg = BOTTOM_SCRIM_INK_BG;
  const ink = inkPalette(footerBg);
  const badgeInk = pickContrastingInk(accent);
  const chrome = graphicLayoutChrome(tokens, exportMode);
  return (
    <>
      <div className="absolute inset-0" style={brandFieldFillStyle(primary)} />
      <PhotoLayer
        photoUrl={photoUrl}
        photoScale={photoScale}
        primary={primary}
        accent={accent}
        duotone={photoDuotone}
        highlightOpacity={highlightOpacity}
      />
      {!photoUrl ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={cn(
              "flex items-center justify-center rounded-full font-bold",
              exportMode
                ? "h-36 w-36 text-5xl"
                : "h-24 w-24 text-3xl sm:h-28 sm:w-28 sm:text-4xl",
            )}
            style={{ backgroundColor: accent, color: badgeInk }}
            aria-hidden
          >
            {initials}
          </div>
        </div>
      ) : null}
      <div
        className="absolute inset-0"
        style={brandFieldBottomLiftStyle("spotlight")}
      />
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          padding: chrome.pad,
          textAlign: chrome.textAlign,
        }}
      >
        <LayoutBrandLogo
          logoMode={logoMode}
          size={exportMode ? "md" : "sm"}
          backgroundColor={footerBg}
          className="mb-2"
        />
        <h3
          className={cn(
            "font-bold",
            !chrome.titlePx && (exportMode ? "text-3xl" : "text-base sm:text-lg"),
          )}
          style={{
            color: ink.full,
            fontSize: chrome.titlePx,
            fontWeight: chrome.titleWeight,
            letterSpacing: chrome.titleTracking,
            textTransform: chrome.titleTransform,
            fontFamily: chrome.headlineFontFamily,
          }}
        >
          {copy.headline}
        </h3>
        <p
          className={cn(
            "mt-1 italic",
            !chrome.bodyPx && (exportMode ? "text-lg" : "text-xs sm:text-sm"),
          )}
          style={{ color: ink.a90, fontSize: chrome.bodyPx, fontFamily: chrome.bodyFontFamily,
            fontWeight: chrome.bodyFontWeight,
            lineHeight: chrome.bodyLineHeight }}
        >
          &ldquo;{copy.body}&rdquo;
        </p>
        <LocalFooter
          localNumber={localNumber}
          subText={subText}
          size={size}
          color={ink.a70}
          show={showLocalNumber}
        />
      </div>
    </>
  );
}

function NoticeLayout({
  primary,
  accent,
  secondary,
  copy,
  localNumber,
  subText,
  size,
  tokens,
  logoMode = "lockup",
  showLocalNumber = true,
}: {
  primary: string;
  accent: string;
  secondary: string;
  copy: GraphicLayoutCopy;
  localNumber: string;
  subText: string;
  size: "preview" | "export";
  tokens?: CanvasTokens;
  logoMode?: BoardLogoMode;
  showLocalNumber?: boolean;
}) {
  const exportMode = size === "export";
  const fieldEnd = softGradientEndColor(primary, secondary);
  const ink =
    tokens?.surface === "soft-gradient"
      ? inkPalette(primary, [primary, fieldEnd])
      : inkPalette(primary);
  const badgeInk = pickContrastingInk(accent);
  const surface = tokens
    ? canvasSurfaceStyle(tokens, {
        primary,
        secondary,
        accent,
      })
    : { backgroundColor: primary };
  const chrome = graphicLayoutChrome(tokens, exportMode);
  const brandJustify =
    tokens?.alignmentBias === "center"
      ? "center"
      : tokens?.alignmentBias === "asymmetric"
        ? "flex-end"
        : "space-between";
  const textAlign = chrome.textAlign ?? "left";
  const titlePx = chrome.titlePx
    ? Math.round(chrome.titlePx * (exportMode ? 1.1 : 1))
    : undefined;
  const bodyPx = chrome.bodyPx;
  const metaPx = chrome.metaPx;
  return (
    <>
      <div className="absolute inset-0" style={surface} />
      {tokens ? <CanvasGrainOverlay opacity={tokens.grainOpacity} /> : null}
      <div
        className={cn(
          "absolute left-0 top-0 z-[2] w-full",
          exportMode ? "h-2" : "h-1.5",
        )}
        style={{ backgroundColor: accent }}
      />
      <div
        className="absolute inset-0 z-[2] flex flex-col justify-between"
        style={{ padding: chrome.pad, textAlign }}
      >
        <div
          className="flex items-start gap-2"
          style={{ justifyContent: brandJustify }}
        >
          <LayoutBrandLogo
            logoMode={logoMode}
            size={exportMode ? "md" : "sm"}
            backgroundColor={primary}
          />
          <span
            className={cn(
              "rounded font-bold uppercase tracking-wide",
              exportMode ? "px-3 py-1" : "px-2 py-0.5",
            )}
            style={{
              backgroundColor: accent,
              color: badgeInk,
              fontSize: metaPx ?? (exportMode ? 12 : 10),
              fontFamily: chrome.bodyFontFamily,
            fontWeight: chrome.bodyFontWeight,
            lineHeight: chrome.bodyLineHeight,
            }}
          >
            {copy.detail ?? "Notice"}
          </span>
        </div>
        <div>
          <h3
            className={cn("font-bold", !titlePx && (exportMode ? "text-4xl" : "text-base sm:text-xl"))}
            style={{
              color: ink.full,
              fontSize: titlePx,
              fontWeight: chrome.titleWeight,
              letterSpacing: chrome.titleTracking,
              textTransform: chrome.titleTransform,
              fontFamily: chrome.headlineFontFamily,
            }}
          >
            {copy.headline}
          </h3>
          <p
            className={cn(
              "mt-2",
              !bodyPx && (exportMode ? "text-lg" : "text-xs sm:text-sm"),
            )}
            style={{
              color: ink.a90,
              fontSize: bodyPx,
              fontFamily: chrome.bodyFontFamily,
            fontWeight: chrome.bodyFontWeight,
            lineHeight: chrome.bodyLineHeight,
            }}
          >
            {copy.body}
          </p>
          <LocalFooter
            localNumber={localNumber}
            subText={subText}
            size={size}
            color={ink.a70}
            show={showLocalNumber}
          />
        </div>
        <div
          className={cn(
            "absolute bottom-0 right-0",
            exportMode ? "h-24 w-24" : "h-16 w-16",
          )}
          style={{
            background: `radial-gradient(circle at bottom right, ${secondary}33, transparent 70%)`,
          }}
          aria-hidden
        />
      </div>
    </>
  );
}

export function QuoteLayout({
  primary,
  accent,
  secondary,
  textColor,
  copy,
  localNumber,
  subText,
  size = "preview",
  aspect = "square",
  layout = "stripe",
  tokens,
  logoMode = "lockup",
  showLocalNumber = true,
}: {
  primary: string;
  accent: string;
  /** Soft-gradient stop. Defaults to primary when omitted. */
  secondary?: string;
  /** Attribution, role, and footer ink. Defaults to auto-contrast on primary. */
  textColor?: string;
  copy: GraphicLayoutCopy;
  localNumber: string;
  subText: string;
  size?: "preview" | "export";
  aspect?: ExampleAspect;
  layout?: QuoteLayoutId;
  tokens?: CanvasTokens;
  logoMode?: BoardLogoMode;
  showLocalNumber?: boolean;
}) {
  const exportMode = size === "export";
  const landscape = aspect === "landscape";
  const centered = layout === "centered";
  const mark = layout === "mark";
  const fieldSecondary = secondary ?? primary;
  const fieldEnd = softGradientEndColor(primary, fieldSecondary);
  const quoteInk =
    tokens?.surface === "soft-gradient"
      ? inkPalette(primary, [primary, fieldEnd])
      : inkPalette(primary);
  const accentInk = textColor ? textPalette(textColor) : quoteInk;
  const surface = tokens
    ? canvasSurfaceStyle(tokens, {
        primary,
        secondary: secondary ?? primary,
        accent,
      })
    : { backgroundColor: primary };
  const chrome = graphicLayoutChrome(tokens, exportMode);
  const padScale = landscape
    ? exportMode
      ? 0.9
      : 0.8
    : exportMode
      ? 1.15
      : 1;
  const bodyScale = landscape ? 0.95 : 1.15;
  const textAlign = centered ? "center" : (chrome.textAlign ?? "left");
  const alignItems = centered ? "center" : (chrome.alignItems ?? "flex-start");
  return (
    <>
      <div className="absolute inset-0" style={surface} />
      {tokens ? <CanvasGrainOverlay opacity={tokens.grainOpacity} /> : null}
      {layout === "stripe" ? (
        <div
          className={cn(
            "absolute left-0 top-0 z-[2] h-full",
            exportMode ? "w-2" : "w-1.5",
          )}
          style={{ backgroundColor: accent }}
        />
      ) : null}
      {centered ? (
        <div
          className="absolute left-0 right-0 top-0 z-[2]"
          style={{
            height: exportMode ? 10 : 6,
            backgroundColor: accent,
          }}
        />
      ) : null}
      {mark ? (
        <p
          className={cn(
            "pointer-events-none absolute z-[2] font-bold leading-none",
            landscape
              ? exportMode
                ? "left-4 top-0 text-[5.5rem]"
                : "left-2 top-0 text-5xl"
              : exportMode
                ? "left-4 top-[-0.15em] text-[10rem]"
                : "left-2 top-[-0.1em] text-7xl",
          )}
          style={{ color: quoteInk.a12 }}
          aria-hidden
        >
          &ldquo;
        </p>
      ) : null}
      <div
        className="absolute inset-0 z-[2] flex flex-col justify-center"
        style={{
          padding: chrome.pad * padScale,
          textAlign,
          alignItems,
        }}
      >
        {mark ? null : (
          <p
            className={cn(
              "font-bold leading-none",
              landscape
                ? exportMode
                  ? "text-4xl"
                  : "text-2xl"
                : exportMode
                  ? "text-6xl"
                  : "text-3xl",
            )}
            style={{ color: quoteInk.a30 }}
            aria-hidden
          >
            &ldquo;
          </p>
        )}
        <p
          className={cn(
            "font-medium leading-snug",
            !chrome.bodyPx &&
              (landscape
                ? exportMode
                  ? "text-lg"
                  : "text-sm"
                : exportMode
                  ? "text-xl"
                  : "text-sm sm:text-base"),
          )}
          style={{
            color: quoteInk.full,
            fontSize: chrome.bodyPx
              ? Math.round(chrome.bodyPx * bodyScale)
              : undefined,
            fontFamily: chrome.bodyFontFamily,
            fontWeight: chrome.bodyFontWeight,
            lineHeight: chrome.bodyLineHeight,
          }}
        >
          {copy.body}
        </p>
        <p
          data-canvas-headline=""
          className={cn(
            "mt-3 font-semibold",
            !chrome.titlePx && (exportMode ? "text-base" : "text-xs"),
          )}
          style={{
            color: accentInk.full,
            fontSize: chrome.metaPx
              ? Math.round(chrome.metaPx * (landscape ? 1 : 1.15))
              : undefined,
            fontWeight: chrome.titleWeight,
            letterSpacing: chrome.titleTracking,
            fontFamily: chrome.headlineFontFamily,
          }}
        >
          {copy.headline}
        </p>
        {copy.detail ? (
          <p
            className={cn(
              "uppercase tracking-wide",
              !chrome.metaPx && (exportMode ? "text-xs" : "text-[10px]"),
            )}
            style={{
              color: accentInk.a80,
              fontSize: chrome.metaPx,
              fontFamily: chrome.bodyFontFamily,
              fontWeight: chrome.bodyFontWeight,
              lineHeight: chrome.bodyLineHeight,
            }}
          >
            {copy.detail}
          </p>
        ) : null}
        <div className={exportMode ? (landscape ? "mt-4" : "mt-6") : "mt-4"}>
          <LayoutBrandLogo
            logoMode={logoMode}
            size={exportMode ? "md" : "sm"}
            backgroundColor={primary}
          />
          <LocalFooter
            localNumber={localNumber}
            subText={subText}
            size={size}
            color={quoteInk.a90}
            show={showLocalNumber}
          />
        </div>
      </div>
    </>
  );
}

function ResultsLayout({
  primary,
  copy,
  localNumber,
  subText,
  size,
  tokens,
  logoMode = "lockup",
  showLocalNumber = true,
}: {
  primary: string;
  accent: string;
  copy: GraphicLayoutCopy;
  localNumber: string;
  subText: string;
  size: "preview" | "export";
  tokens?: CanvasTokens;
  logoMode?: BoardLogoMode;
  showLocalNumber?: boolean;
}) {
  const exportMode = size === "export";
  const fieldEnd = brandFieldEndColor(primary, 0.22);
  const ink = inkPalette(primary, [primary, fieldEnd]);
  const chrome = graphicLayoutChrome(tokens, exportMode);
  const alignItems = chrome.alignItems ?? "center";
  const textAlign = chrome.textAlign ?? "center";
  return (
    <>
      <div
        className="absolute inset-0"
        style={brandFieldFillStyle(primary, 0.22)}
      />
      <div
        className="absolute inset-0 flex flex-col justify-center"
        style={{
          alignItems,
          textAlign,
          padding: chrome.pad,
        }}
      >
        <LayoutBrandLogo
          logoMode={logoMode}
          size={exportMode ? "md" : "sm"}
          backgroundColor={primary}
          className={exportMode ? "mb-4" : "mb-3"}
        />
        <p
          className={cn(
            "font-semibold uppercase tracking-widest",
            !chrome.metaPx && (exportMode ? "text-sm" : "text-[10px]"),
          )}
          style={{ color: ink.a80, fontSize: chrome.metaPx, fontFamily: chrome.bodyFontFamily,
            fontWeight: chrome.bodyFontWeight,
            lineHeight: chrome.bodyLineHeight }}
        >
          {copy.detail}
        </p>
        <p
          className={cn(
            "font-black",
            !chrome.titlePx &&
              (exportMode ? "mt-2 text-6xl" : "mt-1 text-4xl sm:text-5xl"),
          )}
          style={{
            color: ink.full,
            fontSize: chrome.titlePx
              ? Math.round(chrome.titlePx * (exportMode ? 1.8 : 1.55))
              : undefined,
            fontWeight: chrome.titleWeight ?? 900,
            letterSpacing: chrome.titleTracking,
            marginTop: exportMode ? 8 : 4,
            fontFamily: chrome.headlineFontFamily,
          }}
        >
          {copy.headline}
        </p>
        <p
          className={cn(
            "max-w-[14rem]",
            !chrome.bodyPx &&
              (exportMode ? "mt-3 max-w-md text-lg" : "mt-2 text-xs sm:text-sm"),
          )}
          style={{
            color: ink.a90,
            fontSize: chrome.bodyPx,
            marginTop: exportMode ? 12 : 8,
            maxWidth: exportMode ? "28rem" : "14rem",
            fontFamily: chrome.bodyFontFamily,
            fontWeight: chrome.bodyFontWeight,
            lineHeight: chrome.bodyLineHeight,
          }}
        >
          {copy.body}
        </p>
        <LocalFooter
          localNumber={localNumber}
          subText={subText}
          size={size}
          color={ink.a70}
          show={showLocalNumber}
        />
      </div>
    </>
  );
}
