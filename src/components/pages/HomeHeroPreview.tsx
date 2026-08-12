"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useBrandStore } from "@/store/brand-store";
import { resolveLocalNumber } from "@/lib/utils/local";
import { inkWithAlpha, pickContrastingInk } from "@/lib/utils/ink";
import { cn } from "@/lib/utils";

type HomeHeroPreviewProps = {
  className?: string;
};

/**
 * Secondary marketing zone for `/` — product truth (mini board notice + brand
 * chips), not gradient-as-product. Colours follow live Brand Kit.
 */
export function HomeHeroPreview({ className }: HomeHeroPreviewProps) {
  const t = useTranslations("home.heroPreview");
  const brandKit = useBrandStore((s) => s.brandKit);
  const primary = brandKit.primaryColor;
  const secondary = brandKit.secondaryColor;
  const accent = brandKit.accentColor;
  const ink = pickContrastingInk(primary);
  const inkSoft = inkWithAlpha(ink, 0.78);
  const localLabel = resolveLocalNumber(brandKit.localNumber);

  return (
    <aside
      data-testid="home-hero-preview"
      className={cn("home-enter home-enter-delay-2 w-full min-w-0", className)}
      aria-label={t("ariaLabel")}
    >
      <div className="relative mx-auto w-full max-w-md lg:max-w-none">
        <div
          className="absolute -inset-3 rounded-3xl opacity-40 blur-2xl sm:-inset-4"
          style={{
            backgroundImage: `linear-gradient(135deg, ${accent}, ${secondary})`,
          }}
          aria-hidden
        />
        <div className="relative overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/10">
          <div
            className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide"
            style={{ backgroundColor: primary, color: ink }}
          >
            <span>{t("noticeEyebrow")}</span>
            <span style={{ color: inkSoft }}>{t("localLabel", { number: localLabel })}</span>
          </div>
          <div
            className="space-y-3 px-4 py-5 sm:px-5"
            style={{
              backgroundImage: `linear-gradient(160deg, ${primary} 0%, ${secondary} 100%)`,
            }}
          >
            <p
              className="text-[0.65rem] font-semibold uppercase tracking-[0.18em]"
              style={{ color: inkSoft }}
            >
              {t("noticeLead")}
            </p>
            <p
              className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl"
              style={{ color: ink }}
            >
              {t("noticeHeadline")}
            </p>
            <p className="max-w-[18rem] text-sm" style={{ color: inkSoft }}>
              {t("noticeBody")}
            </p>
            <div
              className="inline-flex min-h-10 items-center rounded-md px-3 text-sm font-semibold"
              style={{
                backgroundColor: accent,
                color: pickContrastingInk(accent),
              }}
            >
              {t("noticeCta")}
            </div>
          </div>
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
              href="/tools/board-notice"
              className="shrink-0 text-sm font-semibold text-opseu-blue underline-offset-2 hover:underline"
            >
              {t("openTool")}
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
