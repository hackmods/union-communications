"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Callout } from "@/components/ui/Callout";
import { Button } from "@/components/ui/Button";
import {
  ASSET_PACK_COLORS,
  BRAND_COLORS,
  OFFICIAL_LOGOS,
  isOfficialLogoVariant,
} from "@/lib/constants/brand";
import {
  coerceOfficialVariantForPack,
  identityAssetPlateColor,
  identityPacksFor,
  resolveIdentityPackForKit,
  resolveOfficialLogos,
  type IdentityPack,
} from "@/lib/brand/identity-packs";
import { resolveOpseuSectorId } from "@/lib/brand/collection-profiles";
import { isReferenceAssetPackVisible } from "@/lib/constants/comms-sources";
import { isUnionOpsLogoSrc } from "@/lib/constants/unionPresets";
import { copyToClipboard, cn } from "@/lib/utils";
import { INK_BLACK, pickContrastingInk } from "@/lib/utils/ink";
import { useBrandStore } from "@/store/brand-store";
import type { BrandKit } from "@/types/entities";
import { SafeLogoImage } from "@/components/brand/SafeLogoImage";

const guidelineKeys = [
  "clearSpace",
  "noDistort",
  "primary",
  "secondary",
  "contrast",
  "localMark",
  "questions",
] as const;

type Swatch = { name: string; hex: string };

type LogoDownload = {
  href: string;
  downloadName?: string;
};

function needsChecker(hex: string): boolean {
  return pickContrastingInk(hex) === INK_BLACK;
}

function resolveKitLogoDownload(
  kit: Pick<
    BrandKit,
    | "useOfficialLogo"
    | "officialLogoVariant"
    | "customLogoDataUrl"
    | "identityPackId"
    | "unionPresetId"
    | "opseuSectorId"
  >,
): LogoDownload | null {
  if (kit.useOfficialLogo) {
    const logos = resolveOfficialLogos(kit);
    const variant = coerceOfficialVariantForPack(
      logos,
      isOfficialLogoVariant(kit.officialLogoVariant)
        ? kit.officialLogoVariant
        : "lockup",
    );
    if (variant === "lockup") {
      const href = logos?.lockup.src ?? OFFICIAL_LOGOS.lockup.src;
      return {
        href,
        downloadName: href.split("/").pop() ?? "logo-lockup.png",
      };
    }
    if (variant === "mark" || variant === "slitBlue") {
      const href = logos?.mark?.src ?? OFFICIAL_LOGOS.mark.src;
      return {
        href,
        downloadName: href.split("/").pop() ?? "logo-mark.png",
      };
    }
    if (variant === "slitWhite") {
      return {
        href: logos?.mark?.srcOnDark ?? OFFICIAL_LOGOS.mark.srcOnDark,
        downloadName: "logo-mark-white.png",
      };
    }
  }

  const custom = kit.customLogoDataUrl?.trim();
  if (!custom || isUnionOpsLogoSrc(custom)) return null;

  if (custom.startsWith("data:")) {
    const mime = custom.slice(5, custom.indexOf(";"));
    const ext =
      mime === "image/jpeg"
        ? "jpg"
        : mime === "image/svg+xml"
          ? "svg"
          : mime === "image/webp"
            ? "webp"
            : "png";
    return { href: custom, downloadName: `brand-logo.${ext}` };
  }

  if (custom.startsWith("/") || /^https?:\/\//i.test(custom)) {
    const leaf = custom.split("?")[0]?.split("/").pop();
    return {
      href: custom,
      downloadName: leaf && leaf.includes(".") ? leaf : "brand-logo.png",
    };
  }

  return null;
}

function SwatchGrid({
  swatches,
  copyLabel,
  copiedLabel,
}: {
  swatches: Swatch[];
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  async function handleCopy(hex: string) {
    const ok = await copyToClipboard(hex);
    if (!ok) return;
    setCopiedHex(hex);
    window.setTimeout(() => {
      setCopiedHex((current) => (current === hex ? null : current));
    }, 1500);
  }

  return (
    <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
      {swatches.map((s) => {
        const checker = needsChecker(s.hex);
        return (
          <div key={`${s.name}-${s.hex}`} className="text-center">
            <button
              type="button"
              onClick={() => void handleCopy(s.hex)}
              className="group mx-auto block w-full max-w-[7rem] rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40"
              aria-label={`${copyLabel} ${s.hex}`}
            >
              <div
                className={cn(
                  "mx-auto h-14 w-14 overflow-hidden rounded-lg border border-gray-200",
                  checker && "bg-[length:10px_10px]",
                )}
                style={
                  checker
                    ? {
                        backgroundImage:
                          "linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)",
                        backgroundPosition: "0 0, 0 5px, 5px -5px, -5px 0",
                      }
                    : undefined
                }
              >
                <div
                  className="h-full w-full"
                  style={{ backgroundColor: s.hex }}
                />
              </div>
              <p className="mt-2 text-sm font-medium">{s.name}</p>
              <p className="font-mono text-xs text-gray-500 group-hover:text-opseu-blue">
                {copiedHex === s.hex ? copiedLabel : s.hex}
              </p>
            </button>
          </div>
        );
      })}
    </div>
  );
}

function LogoDownloadCard({
  children,
  href,
  downloadName,
  label,
}: {
  children: ReactNode;
  href: string;
  downloadName?: string;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white px-4 py-4">
      <div className="flex min-h-20 items-center justify-center">{children}</div>
      <a
        href={href}
        download={downloadName}
        className="text-sm font-medium text-opseu-blue underline"
      >
        {label}
      </a>
    </div>
  );
}

function packTitleKey(packId: string): "opseu-national" | "opseu-caat-s" {
  return packId === "opseu-caat-s" ? "opseu-caat-s" : "opseu-national";
}

function LookPackDownloads({
  pack,
  title,
  hint,
  downloadSvg,
  downloadPng,
  variantLabel,
}: {
  pack: IdentityPack;
  title: string;
  hint: string;
  downloadSvg: string;
  downloadPng: string;
  variantLabel: (key: string) => string;
}) {
  return (
    <section className="mt-10 border-t border-gray-200 pt-8">
      <h2 className="text-xl font-bold text-opseu-dark">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm text-gray-600">{hint}</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {pack.assetVariants.map((variant) => {
          const plate = identityAssetPlateColor(pack, variant);
          const isSvg = variant.src.toLowerCase().endsWith(".svg");
          return (
            <LogoDownloadCard
              key={`${pack.id}-${variant.id}`}
              href={variant.src}
              downloadName={variant.downloadName}
              label={`${isSvg ? downloadSvg : downloadPng} — ${variantLabel(variant.labelKey)}`}
            >
              <span
                className="flex min-h-24 w-full items-center justify-center rounded-md px-2 py-2"
                style={{ backgroundColor: plate }}
              >
                <SafeLogoImage
                  src={variant.src}
                  alt=""
                  width={220}
                  height={72}
                  className="h-16 w-auto max-w-[92%] object-contain"
                  onDark={
                    variant.plate === "dark" ||
                    variant.plate === "primary" ||
                    variant.plate === "accent"
                  }
                />
              </span>
            </LogoDownloadCard>
          );
        })}
      </div>
    </section>
  );
}

export function AssetPackPanel() {
  const t = useTranslations("assets");
  const tPack = useTranslations("brandKit.identityPack");
  const brandKit = useBrandStore((s) => s.brandKit);
  const hydrated = useBrandStore((s) => s.hydrated);
  const showReferencePack = isReferenceAssetPackVisible(
    hydrated ? brandKit.unionPresetId : undefined,
  );

  if (!hydrated) {
    return (
      <p className="text-sm text-gray-500" role="status">
        {t("loading")}
      </p>
    );
  }

  const kitSwatches: Swatch[] = [
    { name: t("swatchPrimary"), hex: brandKit.primaryColor || BRAND_COLORS.primary },
    { name: t("swatchAccent"), hex: brandKit.accentColor || BRAND_COLORS.accent },
    {
      name: t("swatchSecondary"),
      hex: brandKit.secondaryColor || BRAND_COLORS.secondary,
    },
    { name: t("swatchBlack"), hex: BRAND_COLORS.black },
  ];

  const kitDownload = resolveKitLogoDownload(brandKit);
  const referenceSwatches: Swatch[] = [
    { name: t("swatchPrimary"), hex: ASSET_PACK_COLORS.primary },
    { name: t("swatchAccent"), hex: ASSET_PACK_COLORS.accent },
    { name: t("swatchSecondary"), hex: ASSET_PACK_COLORS.secondary },
    { name: t("swatchBlack"), hex: ASSET_PACK_COLORS.black },
  ];
  const sectorId = resolveOpseuSectorId(
    brandKit.unionPresetId,
    brandKit.opseuSectorId,
    brandKit.profiles,
  );
  const lookPacks = showReferencePack
    ? identityPacksFor(
        brandKit.unionPresetId ?? "opseu",
        sectorId,
        brandKit.identityPackId,
      )
    : [];
  const activePack = resolveIdentityPackForKit(brandKit);
  // Prefer CAAT-S (and other sector packs) ahead of national when both are offered
  const packsForDownloads = [...lookPacks].sort((a, b) => {
    if (a.id === activePack?.id) return -1;
    if (b.id === activePack?.id) return 1;
    if (a.id === "opseu-national") return 1;
    if (b.id === "opseu-national") return -1;
    return 0;
  });

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <section className="border-l-2 border-opseu-blue/30 pl-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-xl font-bold text-opseu-dark">
              {t("yourColours")}
            </h2>
            <Link
              href="/brand-kit"
              className="text-sm font-medium text-opseu-blue underline"
            >
              {t("editBrandKit")}
            </Link>
          </div>
          <SwatchGrid
            swatches={kitSwatches}
            copyLabel={t("copyHex")}
            copiedLabel={t("copied")}
          />
        </section>

        <section className="border-l-2 border-opseu-blue/30 pl-5">
          <h2 className="text-xl font-bold text-opseu-dark">{t("yourLogo")}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:max-w-none lg:grid-cols-1 xl:grid-cols-2">
            <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white px-4 py-4">
              <div className="flex min-h-20 items-center justify-center">
                <BrandLogo size="lg" alt={t("logoAlt")} />
              </div>
              {kitDownload ? (
                <a
                  href={kitDownload.href}
                  download={kitDownload.downloadName}
                  className="text-sm font-medium text-opseu-blue underline"
                >
                  {kitDownload.href.toLowerCase().endsWith(".svg")
                    ? t("downloadSvg")
                    : t("downloadPng")}
                </a>
              ) : (
                <p className="text-sm text-gray-600">
                  {t("downloadUnavailable")}{" "}
                  <Link
                    href="/brand-kit"
                    className="font-medium text-opseu-blue underline"
                  >
                    {t("editBrandKit")}
                  </Link>
                </p>
              )}
            </div>
          </div>
        </section>
      </div>

      <Callout tone="muted" className="mt-8 max-w-3xl">
        <p className="font-semibold text-opseu-dark">{t("guidelinesTitle")}</p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
          {guidelineKeys.map((key) => (
            <li key={key}>{t(`guidelines.${key}`)}</li>
          ))}
        </ul>
      </Callout>

      <div className="mt-6">
        <Link href="/brand-kit">
          <Button size="sm">{t("editBrandKit")}</Button>
        </Link>
      </div>

      {packsForDownloads.map((pack) => (
        <LookPackDownloads
          key={pack.id}
          pack={pack}
          title={t("lookPackTitle", {
            name: tPack(`packs.${packTitleKey(pack.id)}.name`),
          })}
          hint={t("lookPackHint")}
          downloadSvg={t("downloadSvg")}
          downloadPng={t("downloadPng")}
          variantLabel={(key) =>
            t(`variantLabels.${key}` as "variantLabels.color")
          }
        />
      ))}

      {showReferencePack && packsForDownloads.length === 0 ? (
        <section className="mt-12 border-t border-gray-200 pt-10">
          <h2 className="text-xl font-bold text-opseu-dark">
            {t("referencePackTitle")}
          </h2>
          <Callout tone="muted" className="mt-4 max-w-3xl">
            <p className="text-sm leading-relaxed text-gray-700">
              {t("referenceNote")}
            </p>
          </Callout>

          <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:items-start">
            <div className="border-l-2 border-opseu-blue/30 pl-5">
              <h3 className="text-lg font-semibold text-opseu-dark">
                {t("primaryLogo")}
              </h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <LogoDownloadCard
                  href="/assets/caat-opseu/logo-primary.png"
                  downloadName="logo-primary.png"
                  label={t("downloadPng")}
                >
                  <Image
                    src="/assets/caat-opseu/logo-primary.png"
                    alt={t("logoAlt")}
                    width={200}
                    height={80}
                    className="max-h-20 w-auto max-w-full object-contain"
                  />
                </LogoDownloadCard>
                <LogoDownloadCard
                  href="/assets/caat-opseu/logo-mark.png"
                  downloadName="logo-mark.png"
                  label={t("downloadMark")}
                >
                  <Image
                    src="/assets/caat-opseu/logo-mark.png"
                    alt={t("markAlt")}
                    width={72}
                    height={72}
                    className="max-h-20 w-auto max-w-full object-contain"
                  />
                </LogoDownloadCard>
              </div>
            </div>

            <div className="border-l-2 border-opseu-blue/30 pl-5">
              <h3 className="text-lg font-semibold text-opseu-dark">
                {t("swatchesTitle")}
              </h3>
              <SwatchGrid
                swatches={referenceSwatches}
                copyLabel={t("copyHex")}
                copiedLabel={t("copied")}
              />
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
