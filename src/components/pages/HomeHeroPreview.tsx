"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useBrandStore } from "@/store/brand-store";
import {
  HERO_PREVIEW_HREF,
  pickHeroPreviewVariant,
  type HeroPreviewVariant,
} from "@/lib/comms/home-hero-preview";
import { softGradientEndColor } from "@/lib/utils/canvas-surface";
import { blendHex } from "@/lib/utils/contrast";
import { resolveLocalNumber } from "@/lib/utils/local";
import {
  mutedInkOnBackground,
  pickContrastingInk,
  pickFieldInk,
} from "@/lib/utils/ink";
import { cn } from "@/lib/utils";

type HomeHeroPreviewProps = {
  className?: string;
};

let clientVariant: HeroPreviewVariant | null = null;

function getClientVariant(): HeroPreviewVariant {
  clientVariant ??= pickHeroPreviewVariant();
  return clientVariant;
}

function useHeroPreviewVariant(): HeroPreviewVariant {
  return useSyncExternalStore(
    () => () => {},
    getClientVariant,
    () => "boardNotice",
  );
}

type VariantBodyProps = {
  variant: HeroPreviewVariant;
  primary: string;
  accent: string;
  ink: string;
  inkSoft: string;
  fieldEnd: string;
  localLabel: string;
};

/**
 * Secondary marketing zone for `/` — product truth (mini tool previews + brand
 * chips), not gradient-as-product. Colours follow live Brand Kit. One variant
 * per visit, picked client-side after mount to avoid SSR hydration mismatch.
 */
export function HomeHeroPreview({ className }: HomeHeroPreviewProps) {
  const t = useTranslations("home.heroPreview");
  const brandKit = useBrandStore((s) => s.brandKit);
  const primary = brandKit.primaryColor;
  const secondary = brandKit.secondaryColor;
  const accent = brandKit.accentColor;
  const fieldEnd = softGradientEndColor(primary, secondary);
  const fieldMid = blendHex(accent, primary, 0.4);
  const ink = pickFieldInk([primary, fieldMid, fieldEnd]);
  const inkSoft = mutedInkOnBackground(primary, 0.82);
  const localLabel = resolveLocalNumber(brandKit.local.localNumber);

  const variant = useHeroPreviewVariant();

  return (
    <aside
      data-testid="home-hero-preview"
      data-variant={variant}
      className={cn("home-enter home-enter-delay-2 w-full min-w-0", className)}
      aria-label={t(`${variant}.ariaLabel`)}
    >
      <div className="relative mx-auto w-full max-w-md lg:max-w-none">
        <div
          className="absolute -inset-3 rounded-3xl opacity-40 blur-2xl sm:-inset-4"
          style={{
            backgroundImage: `linear-gradient(135deg, ${accent}, ${fieldEnd})`,
          }}
          aria-hidden
        />
        <div className="relative overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/10">
          <HeroPreviewBody
            variant={variant}
            primary={primary}
            accent={accent}
            ink={ink}
            inkSoft={inkSoft}
            fieldEnd={fieldEnd}
            localLabel={localLabel}
          />
          <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 bg-white px-4 py-3">
            <div className="flex items-center gap-1.5" aria-hidden>
              {[primary, secondary, accent].map((swatch) => (
                <span
                  key={swatch}
                  className="size-5 rounded-full ring-1 ring-black/10"
                  style={{ backgroundColor: swatch }}
                />
              ))}
            </div>
            <p className="min-w-0 flex-1 text-xs text-gray-600">{t("swatchHint")}</p>
            <Link
              href={HERO_PREVIEW_HREF[variant]}
              className="shrink-0 text-sm font-semibold text-opseu-blue underline-offset-2 hover:underline"
            >
              {t(`${variant}.openTool`)}
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}

function HeroPreviewBody({
  variant,
  primary,
  accent,
  ink,
  inkSoft,
  fieldEnd,
  localLabel,
}: VariantBodyProps) {
  const t = useTranslations("home.heroPreview");
  const headerInk = pickContrastingInk(primary);
  const headerInkSoft = mutedInkOnBackground(primary, 0.82);

  if (variant === "graphicMaker") {
    return (
      <>
        <div
          className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide"
          style={{ backgroundColor: primary, color: headerInk }}
        >
          <span>{t("graphicMaker.eyebrow")}</span>
          <span style={{ color: headerInkSoft }}>
            {t("graphicMaker.localLabel", { number: localLabel })}
          </span>
        </div>
        <div className="bg-gray-50 p-4 sm:p-5">
          <div
            className="mx-auto flex aspect-square max-w-[14rem] flex-col justify-between overflow-hidden rounded-xl shadow-md ring-1 ring-black/10 sm:max-w-[15rem]"
            style={{
              // Stay on primary → tinted end → accent; never wash through paper
              // under light ink (the long-standing washed-out headline bug).
              backgroundImage: `linear-gradient(145deg, ${primary} 0%, ${fieldEnd} 58%, ${blendHex(accent, primary, 0.45)} 100%)`,
            }}
          >
            <div className="space-y-2 p-4">
              <p
                className="text-[0.6rem] font-semibold uppercase tracking-[0.16em]"
                style={{ color: inkSoft }}
              >
                {t("graphicMaker.lead")}
              </p>
              <p
                className="text-lg font-bold leading-tight tracking-tight sm:text-xl"
                style={{ color: ink }}
              >
                {t("graphicMaker.headline")}
              </p>
            </div>
            <div
              className="mx-4 mb-4 inline-flex min-h-8 w-fit items-center rounded px-2.5 text-xs font-semibold"
              style={{
                backgroundColor: accent,
                color: pickContrastingInk(accent),
              }}
            >
              {t("graphicMaker.cta")}
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-gray-600">
            {t("graphicMaker.body")}
          </p>
        </div>
      </>
    );
  }

  if (variant === "flyerMaker") {
    return (
      <>
        <div
          className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide"
          style={{ backgroundColor: primary, color: headerInk }}
        >
          <span>{t("flyerMaker.eyebrow")}</span>
          <span style={{ color: headerInkSoft }}>
            {t("flyerMaker.localLabel", { number: localLabel })}
          </span>
        </div>
        <div className="bg-gray-50 p-4 sm:p-5">
          <div
            className="mx-auto flex aspect-[3/4] max-w-[11rem] flex-col overflow-hidden rounded-lg shadow-md ring-1 ring-black/10 sm:max-w-[12rem]"
            style={{ backgroundColor: "#fff" }}
          >
            <div
              className="px-3 py-2.5 text-[0.6rem] font-semibold uppercase tracking-wide"
              style={{ backgroundColor: primary, color: headerInk }}
            >
              {t("flyerMaker.lead")}
            </div>
            <div className="flex flex-1 flex-col justify-between space-y-2 px-3 py-3">
              <p
                className="text-base font-bold leading-tight"
                style={{ color: primary }}
              >
                {t("flyerMaker.headline")}
              </p>
              <p className="text-[0.65rem] leading-snug text-gray-600">
                {t("flyerMaker.body")}
              </p>
              <div
                className="inline-flex min-h-7 w-fit items-center rounded px-2 text-[0.65rem] font-semibold"
                style={{
                  backgroundColor: accent,
                  color: pickContrastingInk(accent),
                }}
              >
                {t("flyerMaker.cta")}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div
        className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide"
        style={{ backgroundColor: primary, color: headerInk }}
      >
        <span>{t("boardNotice.eyebrow")}</span>
        <span style={{ color: headerInkSoft }}>
          {t("boardNotice.localLabel", { number: localLabel })}
        </span>
      </div>
      <div
        className="space-y-3 px-4 py-5 sm:px-5"
        style={{
          backgroundImage: `linear-gradient(160deg, ${primary} 0%, ${fieldEnd} 100%)`,
        }}
      >
        <p
          className="text-[0.65rem] font-semibold uppercase tracking-[0.18em]"
          style={{ color: inkSoft }}
        >
          {t("boardNotice.lead")}
        </p>
        <p
          className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl"
          style={{ color: ink }}
        >
          {t("boardNotice.headline")}
        </p>
        <p className="max-w-[18rem] text-sm" style={{ color: inkSoft }}>
          {t("boardNotice.body")}
        </p>
        <div
          className="inline-flex min-h-10 items-center rounded-md px-3 text-sm font-semibold"
          style={{
            backgroundColor: accent,
            color: pickContrastingInk(accent),
          }}
        >
          {t("boardNotice.cta")}
        </div>
      </div>
    </>
  );
}
