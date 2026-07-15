"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { cn } from "@/lib/utils";
import type { ExampleAspect, ExampleLayout } from "@/lib/constants/examples";

export type GraphicLayoutId = Exclude<ExampleLayout, "quote">;

export const GRAPHIC_LAYOUT_ORDER: readonly GraphicLayoutId[] = [
  "solidarity",
  "thanks",
  "spotlight",
  "notice",
  "results",
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
}

/** Inline hex/rgba only — Tailwind v4 oklch utilities wash out html-to-image PNGs */
const WHITE = "#FFFFFF";
const WHITE_90 = "rgba(255,255,255,0.9)";
const WHITE_80 = "rgba(255,255,255,0.8)";
const WHITE_70 = "rgba(255,255,255,0.7)";
const WHITE_60 = "rgba(255,255,255,0.6)";
const WHITE_30 = "rgba(255,255,255,0.3)";

function LocalFooter({
  localNumber,
  subText,
  size,
}: {
  localNumber: string;
  subText: string;
  size: "preview" | "export";
}) {
  return (
    <p
      className={cn(
        size === "export" ? "mt-3 text-sm" : "mt-2 text-[10px] sm:text-xs",
      )}
      style={{ color: WHITE_70 }}
    >
      Local {localNumber}
      {subText ? ` - ${subText}` : ""}
    </p>
  );
}

function PhotoLayer({
  photoUrl,
  photoScale,
}: {
  photoUrl?: string;
  photoScale: number;
}) {
  if (!photoUrl) return null;
  return (
    <Image
      src={photoUrl}
      alt=""
      fill
      unoptimized
      className="object-cover"
      style={{ transform: `scale(${photoScale})`, opacity: 0.35 }}
    />
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
}: GraphicLayoutCanvasProps) {
  const { primary, accent, secondary } = colors;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden",
        aspect === "square" ? "aspect-square" : "aspect-[1200/630]",
        className,
      )}
      style={{ backgroundColor: primary, ...style }}
    >
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
        />
      )}
      {layout === "quote" && (
        <QuoteLayout
          primary={primary}
          accent={accent}
          copy={copy}
          localNumber={localNumber}
          subText={subText}
          size={size}
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
        />
      )}
    </div>
  );
}

function SolidarityLayout({
  primary,
  accent,
  secondary,
  copy,
  localNumber,
  subText,
  thanks,
  photoUrl,
  photoScale,
  size,
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
}) {
  const exportMode = size === "export";
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: thanks
            ? `linear-gradient(135deg, ${primary}, ${secondary})`
            : `linear-gradient(160deg, ${primary} 0%, ${primary} 55%, ${accent} 100%)`,
        }}
      />
      <PhotoLayer photoUrl={photoUrl} photoScale={photoScale} />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to top, rgba(0,0,0,0.55), transparent 55%)",
        }}
      />
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0",
          exportMode ? "p-8" : "p-4 sm:p-5",
        )}
      >
        <BrandLogo size={exportMode ? "md" : "sm"} onDark className="mb-2" />
        <h3
          className={cn(
            "font-bold leading-tight",
            exportMode ? "text-3xl" : "text-base sm:text-lg",
          )}
          style={{ color: WHITE }}
        >
          {copy.headline}
        </h3>
        <p
          className={cn("mt-1", exportMode ? "text-lg" : "text-xs sm:text-sm")}
          style={{ color: WHITE_90 }}
        >
          {copy.body}
        </p>
        {copy.detail ? (
          <p
            className={cn(
              "mt-2 font-semibold uppercase tracking-wide",
              exportMode ? "text-sm" : "text-[10px]",
            )}
            style={{ color: WHITE_80 }}
          >
            {copy.detail}
          </p>
        ) : null}
        <LocalFooter localNumber={localNumber} subText={subText} size={size} />
      </div>
    </>
  );
}

function SpotlightLayout({
  primary,
  accent,
  secondary,
  copy,
  localNumber,
  subText,
  photoUrl,
  photoScale,
  size,
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
}) {
  const initials = copy.initials ?? "M";
  const exportMode = size === "export";
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(145deg, ${secondary}, ${primary} 60%, ${accent})`,
        }}
      />
      <PhotoLayer photoUrl={photoUrl} photoScale={photoScale} />
      {!photoUrl ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={cn(
              "flex items-center justify-center rounded-full font-bold",
              exportMode
                ? "h-36 w-36 text-5xl"
                : "h-24 w-24 text-3xl sm:h-28 sm:w-28 sm:text-4xl",
            )}
            style={{ backgroundColor: accent, color: WHITE }}
            aria-hidden
          >
            {initials}
          </div>
        </div>
      ) : null}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to top, rgba(0,0,0,0.7), transparent 50%)",
        }}
      />
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0",
          exportMode ? "p-8" : "p-4 sm:p-5",
        )}
      >
        <BrandLogo size={exportMode ? "md" : "sm"} onDark className="mb-2" />
        <h3
          className={cn(
            "font-bold",
            exportMode ? "text-3xl" : "text-base sm:text-lg",
          )}
          style={{ color: WHITE }}
        >
          {copy.headline}
        </h3>
        <p
          className={cn(
            "mt-1 italic",
            exportMode ? "text-lg" : "text-xs sm:text-sm",
          )}
          style={{ color: WHITE_90 }}
        >
          &ldquo;{copy.body}&rdquo;
        </p>
        <LocalFooter localNumber={localNumber} subText={subText} size={size} />
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
}: {
  primary: string;
  accent: string;
  secondary: string;
  copy: GraphicLayoutCopy;
  localNumber: string;
  subText: string;
  size: "preview" | "export";
}) {
  const exportMode = size === "export";
  return (
    <>
      <div className="absolute inset-0" style={{ backgroundColor: primary }} />
      <div
        className={cn("absolute left-0 top-0 w-full", exportMode ? "h-2" : "h-1.5")}
        style={{ backgroundColor: accent }}
      />
      <div
        className={cn(
          "absolute inset-0 flex flex-col justify-between",
          exportMode ? "p-8" : "p-4 sm:p-5",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <BrandLogo size={exportMode ? "md" : "sm"} onDark />
          <span
            className={cn(
              "rounded font-bold uppercase tracking-wide",
              exportMode ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-[10px]",
            )}
            style={{ backgroundColor: accent, color: WHITE }}
          >
            {copy.detail ?? "Notice"}
          </span>
        </div>
        <div>
          <h3
            className={cn(
              "font-bold",
              exportMode ? "text-4xl" : "text-base sm:text-xl",
            )}
            style={{ color: WHITE }}
          >
            {copy.headline}
          </h3>
          <p
            className={cn(
              "mt-2",
              exportMode ? "text-lg" : "text-xs sm:text-sm",
            )}
            style={{ color: WHITE_90 }}
          >
            {copy.body}
          </p>
          <LocalFooter localNumber={localNumber} subText={subText} size={size} />
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
  copy,
  localNumber,
  subText,
  size = "preview",
}: {
  primary: string;
  accent: string;
  copy: GraphicLayoutCopy;
  localNumber: string;
  subText: string;
  size?: "preview" | "export";
}) {
  const exportMode = size === "export";
  return (
    <>
      <div className="absolute inset-0" style={{ backgroundColor: primary }} />
      <div
        className={cn(
          "absolute left-0 top-0 h-full",
          exportMode ? "w-2" : "w-1.5",
        )}
        style={{ backgroundColor: accent }}
      />
      <div
        className={cn(
          "absolute inset-0 flex flex-col justify-center",
          exportMode ? "p-10" : "p-5 sm:p-6",
        )}
      >
        <p
          className={cn(
            "font-bold leading-none",
            exportMode ? "text-6xl" : "text-3xl",
          )}
          style={{ color: WHITE_30 }}
          aria-hidden
        >
          &ldquo;
        </p>
        <p
          className={cn(
            "font-medium leading-snug",
            exportMode ? "text-xl" : "text-sm sm:text-base",
          )}
          style={{ color: WHITE }}
        >
          {copy.body}
        </p>
        <p
          className={cn(
            "mt-3 font-semibold",
            exportMode ? "text-base" : "text-xs",
          )}
          style={{ color: WHITE_80 }}
        >
          {copy.headline}
        </p>
        {copy.detail ? (
          <p
            className={cn(
              "uppercase tracking-wide",
              exportMode ? "text-xs" : "text-[10px]",
            )}
            style={{ color: WHITE_60 }}
          >
            {copy.detail}
          </p>
        ) : null}
        <div className={exportMode ? "mt-6" : "mt-4"}>
          <BrandLogo size={exportMode ? "md" : "sm"} onDark />
          <LocalFooter localNumber={localNumber} subText={subText} size={size} />
        </div>
      </div>
    </>
  );
}

function ResultsLayout({
  primary,
  accent,
  copy,
  localNumber,
  subText,
  size,
}: {
  primary: string;
  accent: string;
  copy: GraphicLayoutCopy;
  localNumber: string;
  subText: string;
  size: "preview" | "export";
}) {
  const exportMode = size === "export";
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(180deg, ${primary}, ${accent})`,
        }}
      />
      <div
        className={cn(
          "absolute inset-0 flex flex-col items-center justify-center text-center",
          exportMode ? "p-8" : "p-4",
        )}
      >
        <BrandLogo
          size={exportMode ? "md" : "sm"}
          onDark
          className={exportMode ? "mb-4" : "mb-3"}
        />
        <p
          className={cn(
            "font-semibold uppercase tracking-widest",
            exportMode ? "text-sm" : "text-[10px]",
          )}
          style={{ color: WHITE_80 }}
        >
          {copy.detail}
        </p>
        <p
          className={cn(
            "font-black",
            exportMode ? "mt-2 text-6xl" : "mt-1 text-4xl sm:text-5xl",
          )}
          style={{ color: WHITE }}
        >
          {copy.headline}
        </p>
        <p
          className={cn(
            "max-w-[14rem]",
            exportMode ? "mt-3 max-w-md text-lg" : "mt-2 text-xs sm:text-sm",
          )}
          style={{ color: WHITE_90 }}
        >
          {copy.body}
        </p>
        <LocalFooter localNumber={localNumber} subText={subText} size={size} />
      </div>
    </>
  );
}
