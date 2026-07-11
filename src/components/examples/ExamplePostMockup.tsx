"use client";

import { useBrandStore } from "@/store/brand-store";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { resolveLocalNumber } from "@/lib/utils/local";
import { cn } from "@/lib/utils";
import type { ExampleAspect, ExampleLayout } from "@/lib/constants/examples";

export interface ExampleMockupCopy {
  headline: string;
  body: string;
  detail?: string;
  initials?: string;
}

interface ExamplePostMockupProps {
  layout: ExampleLayout;
  aspect: ExampleAspect;
  platformLabel: string;
  copy: ExampleMockupCopy;
  className?: string;
}

export function ExamplePostMockup({
  layout,
  aspect,
  platformLabel,
  copy,
  className,
}: ExamplePostMockupProps) {
  const brandKit = useBrandStore((s) => s.brandKit);
  const primary = brandKit.primaryColor;
  const accent = brandKit.accentColor;
  const secondary = brandKit.secondaryColor;
  const local = resolveLocalNumber(brandKit.local.localNumber);
  const subText = brandKit.local.subText;

  return (
    <div className={cn("overflow-hidden rounded-lg border border-gray-200 bg-gray-50", className)}>
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-3 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
          {platformLabel}
        </span>
        <span className="text-[10px] text-gray-400">Local {local}</span>
      </div>
      <div
        className={cn(
          "relative w-full overflow-hidden",
          aspect === "square" ? "aspect-square" : "aspect-[1200/630]",
        )}
        style={{ backgroundColor: primary }}
      >
        {layout === "spotlight" && (
          <SpotlightLayout
            primary={primary}
            accent={accent}
            secondary={secondary}
            copy={copy}
            local={local}
            subText={subText}
          />
        )}
        {layout === "quote" && (
          <QuoteLayout
            primary={primary}
            accent={accent}
            copy={copy}
            local={local}
            subText={subText}
          />
        )}
        {layout === "results" && (
          <ResultsLayout
            primary={primary}
            accent={accent}
            copy={copy}
            local={local}
            subText={subText}
          />
        )}
        {layout === "notice" && (
          <NoticeLayout
            primary={primary}
            accent={accent}
            secondary={secondary}
            copy={copy}
            local={local}
            subText={subText}
          />
        )}
        {(layout === "solidarity" || layout === "thanks") && (
          <SolidarityLayout
            primary={primary}
            accent={accent}
            secondary={secondary}
            copy={copy}
            local={local}
            subText={subText}
            thanks={layout === "thanks"}
          />
        )}
      </div>
    </div>
  );
}

function LocalFooter({ local, subText }: { local: string; subText: string }) {
  return (
    <p className="mt-2 text-[10px] text-white/70 sm:text-xs">
      Local {local}
      {subText ? ` — ${subText}` : ""}
    </p>
  );
}

function SolidarityLayout({
  primary,
  accent,
  secondary,
  copy,
  local,
  subText,
  thanks,
}: {
  primary: string;
  accent: string;
  secondary: string;
  copy: ExampleMockupCopy;
  local: string;
  subText: string;
  thanks: boolean;
}) {
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
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to top, rgba(0,0,0,0.55), transparent 55%)",
        }}
      />
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
        <BrandLogo size="sm" onDark className="mb-2" />
        <h3 className="text-base font-bold leading-tight text-white sm:text-lg">
          {copy.headline}
        </h3>
        <p className="mt-1 text-xs text-white/90 sm:text-sm">{copy.body}</p>
        {copy.detail && (
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-white/80">
            {copy.detail}
          </p>
        )}
        <LocalFooter local={local} subText={subText} />
      </div>
    </>
  );
}

function SpotlightLayout({
  primary,
  accent,
  secondary,
  copy,
  local,
  subText,
}: {
  primary: string;
  accent: string;
  secondary: string;
  copy: ExampleMockupCopy;
  local: string;
  subText: string;
}) {
  const initials = copy.initials ?? "M";
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(145deg, ${secondary}, ${primary} 60%, ${accent})`,
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold text-white shadow-lg sm:h-28 sm:w-28 sm:text-4xl"
          style={{ backgroundColor: accent }}
          aria-hidden
        >
          {initials}
        </div>
      </div>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to top, rgba(0,0,0,0.7), transparent 50%)",
        }}
      />
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
        <BrandLogo size="sm" onDark className="mb-2" />
        <h3 className="text-base font-bold text-white sm:text-lg">{copy.headline}</h3>
        <p className="mt-1 text-xs italic text-white/90 sm:text-sm">
          &ldquo;{copy.body}&rdquo;
        </p>
        <LocalFooter local={local} subText={subText} />
      </div>
    </>
  );
}

function NoticeLayout({
  primary,
  accent,
  secondary,
  copy,
  local,
  subText,
}: {
  primary: string;
  accent: string;
  secondary: string;
  copy: ExampleMockupCopy;
  local: string;
  subText: string;
}) {
  return (
    <>
      <div className="absolute inset-0" style={{ backgroundColor: primary }} />
      <div
        className="absolute left-0 top-0 h-1.5 w-full"
        style={{ backgroundColor: accent }}
      />
      <div className="absolute inset-0 flex flex-col justify-between p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <BrandLogo size="sm" onDark />
          <span
            className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
            style={{ backgroundColor: accent }}
          >
            {copy.detail ?? "Notice"}
          </span>
        </div>
        <div>
          <h3 className="text-base font-bold text-white sm:text-xl">{copy.headline}</h3>
          <p className="mt-2 text-xs text-white/90 sm:text-sm">{copy.body}</p>
          <LocalFooter local={local} subText={subText} />
        </div>
        <div
          className="absolute bottom-0 right-0 h-16 w-16 opacity-20"
          style={{
            background: `radial-gradient(circle at bottom right, ${secondary}, transparent 70%)`,
          }}
          aria-hidden
        />
      </div>
    </>
  );
}

function QuoteLayout({
  primary,
  accent,
  copy,
  local,
  subText,
}: {
  primary: string;
  accent: string;
  copy: ExampleMockupCopy;
  local: string;
  subText: string;
}) {
  return (
    <>
      <div className="absolute inset-0" style={{ backgroundColor: primary }} />
      <div
        className="absolute left-0 top-0 h-full w-1.5"
        style={{ backgroundColor: accent }}
      />
      <div className="absolute inset-0 flex flex-col justify-center p-5 sm:p-6">
        <p className="text-3xl font-bold leading-none text-white/30" aria-hidden>
          &ldquo;
        </p>
        <p className="text-sm font-medium leading-snug text-white sm:text-base">
          {copy.body}
        </p>
        <p className="mt-3 text-xs font-semibold text-white/80">{copy.headline}</p>
        {copy.detail && (
          <p className="text-[10px] uppercase tracking-wide text-white/60">
            {copy.detail}
          </p>
        )}
        <div className="mt-4">
          <BrandLogo size="sm" onDark />
          <LocalFooter local={local} subText={subText} />
        </div>
      </div>
    </>
  );
}

function ResultsLayout({
  primary,
  accent,
  copy,
  local,
  subText,
}: {
  primary: string;
  accent: string;
  copy: ExampleMockupCopy;
  local: string;
  subText: string;
}) {
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(180deg, ${primary}, ${accent})`,
        }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
        <BrandLogo size="sm" onDark className="mb-3" />
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/80">
          {copy.detail}
        </p>
        <p className="mt-1 text-4xl font-black text-white sm:text-5xl">
          {copy.headline}
        </p>
        <p className="mt-2 max-w-[14rem] text-xs text-white/90 sm:text-sm">
          {copy.body}
        </p>
        <LocalFooter local={local} subText={subText} />
      </div>
    </>
  );
}
