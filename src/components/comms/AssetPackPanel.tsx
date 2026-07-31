"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Callout } from "@/components/ui/Callout";
import { Button } from "@/components/ui/Button";
import { ASSET_PACK_COLORS } from "@/lib/constants/brand";
import {
  COMMS_SOURCES,
  isReferenceAssetPackVisible,
} from "@/lib/constants/comms-sources";
import { useBrandStore } from "@/store/brand-store";

const guidelineKeys = [
  "clearSpace",
  "noDistort",
  "primary",
  "secondary",
  "contrast",
  "localMark",
  "questions",
] as const;

export function AssetPackPanel() {
  const t = useTranslations("assets");
  const unionPresetId = useBrandStore((s) => s.brandKit.unionPresetId);
  const hydrated = useBrandStore((s) => s.hydrated);
  const showPack = isReferenceAssetPackVisible(
    hydrated ? unionPresetId : undefined,
  );

  if (!showPack) {
    return (
      <Callout className="mt-2">
        <p className="font-semibold text-opseu-dark">{t("otherUnion.title")}</p>
        <p className="mt-2 leading-relaxed text-gray-700">
          {t("otherUnion.body")}
        </p>
        <Link href="/brand-kit" className="mt-4 inline-block">
          <Button size="sm">{t("otherUnion.cta")}</Button>
        </Link>
      </Callout>
    );
  }

  const swatches = [
    { name: t("swatchPrimary"), hex: ASSET_PACK_COLORS.primary },
    { name: t("swatchAccent"), hex: ASSET_PACK_COLORS.accent },
    { name: t("swatchSecondary"), hex: ASSET_PACK_COLORS.secondary },
    { name: t("swatchBlack"), hex: ASSET_PACK_COLORS.black },
  ];
  const opseuBranding = COMMS_SOURCES["opseu-branding"];

  return (
    <>
      <Callout tone="muted" className="mb-8">
        <p className="text-sm leading-relaxed text-gray-700">
          {t("referenceNote")}
        </p>
      </Callout>

      <section className="border-l-2 border-opseu-blue/30 pl-5">
        <h2 className="text-xl font-bold text-opseu-dark">{t("primaryLogo")}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3">
            <Image
              src="/assets/caat-opseu/logo-primary.png"
              alt={t("logoAlt")}
              width={200}
              height={80}
              className="object-contain"
            />
            <a
              href="/assets/caat-opseu/logo-primary.png"
              download
              className="text-sm font-medium text-opseu-blue underline"
            >
              {t("downloadPng")}
            </a>
          </div>
          <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3">
            <Image
              src="/assets/caat-opseu/logo-mark.png"
              alt={t("markAlt")}
              width={72}
              height={72}
              className="object-contain"
            />
            <a
              href="/assets/caat-opseu/logo-mark.png"
              download
              className="text-sm font-medium text-opseu-blue underline"
            >
              {t("downloadMark")}
            </a>
          </div>
        </div>
      </section>

      <section className="mt-8 border-l-2 border-opseu-blue/30 pl-5">
        <h2 className="text-xl font-bold text-opseu-dark">{t("swatchesTitle")}</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {swatches.map((s) => (
            <div key={s.name} className="text-center">
              <div
                className="mx-auto h-14 w-14 rounded-lg border border-gray-200"
                style={{ backgroundColor: s.hex }}
              />
              <p className="mt-2 text-sm font-medium">{s.name}</p>
              <p className="text-xs text-gray-500">{s.hex}</p>
            </div>
          ))}
        </div>
      </section>

      <Callout tone="muted" className="mt-8">
        <p className="font-semibold text-opseu-dark">{t("guidelinesTitle")}</p>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
          {guidelineKeys.map((key) => (
            <li key={key}>{t(`guidelines.${key}`)}</li>
          ))}
          <li>
            {t("guidelines.sourceLabel")}{" "}
            <a
              href={opseuBranding.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-opseu-blue underline"
            >
              {opseuBranding.label}
            </a>
          </li>
        </ul>
      </Callout>
    </>
  );
}
