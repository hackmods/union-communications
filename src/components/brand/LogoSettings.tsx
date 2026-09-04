"use client";

import { useTranslations } from "next-intl";
import { ImageUpload } from "@/components/tools/ImageUpload";
import { SafeLogoImage } from "@/components/brand/SafeLogoImage";
import { UnionOpsMark } from "@/components/brand/UnionOpsMark";
import {
  BRAND_COLORS,
  isOfficialLogoVariant,
  type OfficialLogoVariant,
} from "@/lib/constants/brand";
import {
  coerceOfficialVariantForPack,
  resolveOfficialLogos,
  type ResolvedOfficialLogos,
} from "@/lib/brand/identity-packs";
import {
  UNIONOPS_LOGOS,
  getUnionPreset,
  hasAttachedUnionLogos,
  isUnionOpsLogoSrc,
  resolvePresetLogos,
  type ResolvedUnionLogoPack,
} from "@/lib/constants/unionPresets";
import { cn } from "@/lib/utils";
import type { BrandKitPatch } from "@/types/entities";

export type LogoMode =
  | OfficialLogoVariant
  | "union-lockup"
  | "union-mark"
  | "platform"
  | "custom"
  | "none";

export function resolveLogoMode(
  useOfficialLogo: boolean,
  officialLogoVariant: OfficialLogoVariant | undefined,
  customLogoDataUrl?: string,
  presetLogos?: ResolvedUnionLogoPack | null,
  officialLogos?: ResolvedOfficialLogos | null,
): LogoMode {
  if (useOfficialLogo) {
    if (!presetLogos || presetLogos.useOfficialPack) {
      const coerced = coerceOfficialVariantForPack(
        officialLogos,
        isOfficialLogoVariant(officialLogoVariant)
          ? officialLogoVariant
          : "lockup",
      );
      return coerced;
    }
  }

  if (customLogoDataUrl === undefined) return "platform";
  if (customLogoDataUrl === "") return "custom";

  const src = customLogoDataUrl.trim();
  if (isUnionOpsLogoSrc(src)) return "platform";
  if (presetLogos && !presetLogos.useOfficialPack) {
    if (
      src === presetLogos.lockup &&
      !isUnionOpsLogoSrc(presetLogos.lockup)
    ) {
      return "union-lockup";
    }
    if (
      (src === presetLogos.mark || src === presetLogos.markOnDark) &&
      !isUnionOpsLogoSrc(presetLogos.mark)
    ) {
      return "union-mark";
    }
  }
  return "custom";
}

/** Picker mode: non-selectable official variants fall back so the radio group stays valid */
export function resolveSelectableLogoMode(
  useOfficialLogo: boolean,
  officialLogoVariant: OfficialLogoVariant | undefined,
  customLogoDataUrl?: string,
  presetLogos?: ResolvedUnionLogoPack | null,
  officialLogos?: ResolvedOfficialLogos | null,
): LogoMode {
  let mode = resolveLogoMode(
    useOfficialLogo,
    officialLogoVariant,
    customLogoDataUrl,
    presetLogos,
    officialLogos,
  );
  if (isOfficialLogoVariant(mode)) {
    mode = coerceOfficialVariantForPack(officialLogos, mode);
  }
  // Official options aren't offered for other unions — remount onto platform/union paths
  if (
    presetLogos &&
    !presetLogos.useOfficialPack &&
    (useOfficialLogo || isOfficialLogoVariant(mode))
  ) {
    return resolveLogoMode(
      false,
      officialLogoVariant,
      customLogoDataUrl ?? UNIONOPS_LOGOS.mark,
      presetLogos,
      null,
    );
  }
  return mode;
}

export function brandKitPatchForLogoMode(
  mode: LogoMode,
  currentLogoText?: string,
  currentCustomLogoDataUrl?: string,
  presetLogos?: ResolvedUnionLogoPack | null,
): BrandKitPatch {
  if (mode === "union-lockup" && presetLogos && !presetLogos.useOfficialPack) {
    if (!isUnionOpsLogoSrc(presetLogos.lockup)) {
      return {
        useOfficialLogo: false,
        customLogoDataUrl: presetLogos.lockup,
      };
    }
  }
  if (mode === "union-mark" && presetLogos && !presetLogos.useOfficialPack) {
    if (!isUnionOpsLogoSrc(presetLogos.mark)) {
      return {
        useOfficialLogo: false,
        customLogoDataUrl: presetLogos.mark,
      };
    }
  }
  if (mode === "platform") {
    return {
      useOfficialLogo: false,
      customLogoDataUrl: UNIONOPS_LOGOS.mark,
    };
  }
  if (isOfficialLogoVariant(mode)) {
    return {
      useOfficialLogo: true,
      officialLogoVariant: mode,
      customLogoDataUrl: undefined,
    };
  }
  if (mode === "custom") {
    return {
      useOfficialLogo: false,
      customLogoDataUrl: currentCustomLogoDataUrl ?? "",
    };
  }
  return {
    useOfficialLogo: false,
    customLogoDataUrl: UNIONOPS_LOGOS.mark,
    logoText: currentLogoText?.trim() || "UO",
  };
}

interface LogoSettingsProps {
  useOfficialLogo: boolean;
  officialLogoVariant?: OfficialLogoVariant;
  customLogoDataUrl?: string;
  logoText?: string;
  /** Drives which bundled union logos appear (OPSEU pack vs starter wordmarks) */
  unionPresetId?: string;
  /** Active identity pack — official logo variants come from this Look */
  identityPackId?: string;
  opseuSectorId?: string;
  campaignPlate?: string;
  primaryColor?: string;
  secondaryColor?: string;
  onModeChange: (mode: LogoMode) => void;
  onCustomLogoUpload: (dataUrl: string) => void;
  onCustomLogoClear: () => void;
  onLogoTextChange?: (text: string) => void;
}

export function LogoSettings({
  useOfficialLogo,
  officialLogoVariant = "lockup",
  customLogoDataUrl,
  unionPresetId,
  identityPackId,
  opseuSectorId,
  campaignPlate,
  primaryColor = BRAND_COLORS.primary,
  secondaryColor = BRAND_COLORS.secondary,
  onModeChange,
  onCustomLogoUpload,
  onCustomLogoClear,
}: LogoSettingsProps) {
  const t = useTranslations("brandKit.logo");
  const preset = unionPresetId ? getUnionPreset(unionPresetId) : undefined;
  const presetLogos = preset ? resolvePresetLogos(preset.logos) : null;
  const officialLogos = resolveOfficialLogos({
    identityPackId,
    unionPresetId,
    opseuSectorId,
    useOfficialLogo,
    campaignPlate,
    primaryColor,
  });
  const showOfficialPack = Boolean(
    presetLogos?.useOfficialPack && officialLogos,
  );
  const showUnionPack = Boolean(
    preset &&
      hasAttachedUnionLogos(preset.logos) &&
      presetLogos &&
      !presetLogos.useOfficialPack,
  );

  const mode = resolveSelectableLogoMode(
    useOfficialLogo,
    officialLogoVariant,
    customLogoDataUrl,
    presetLogos,
    officialLogos,
  );

  type Option = {
    id: LogoMode;
    title: string;
    description: string;
    preview?: {
      src?: string;
      width: number;
      height: number;
      onDark?: boolean;
      platformMark?: boolean;
      /** Override preview plate (e.g. CAAT-S coral behind knockout lockup) */
      plateColor?: string;
    };
  };

  const options: Option[] = [];

  if (showOfficialPack && officialLogos) {
    const isCaatS = officialLogos.packId === "opseu-caat-s";
    const isCaatA = officialLogos.packId === "opseu-caat-a";
    if (officialLogos.selectableVariants.includes("lockup")) {
      const onDarkPreview = Boolean(
        isCaatS && officialLogos.lockup.srcOnDark,
      );
      options.push({
        id: "lockup",
        title: isCaatS
          ? t("useCaatSLockup")
          : isCaatA
            ? t("useCaatALockup")
            : t("useLockup"),
        description: isCaatS
          ? t("useCaatSLockupHint")
          : isCaatA
            ? t("useCaatALockupHint")
            : t("useLockupHint"),
        preview: {
          // CAAT-S: show knockout on coral so the preview matches Look cards
          // and never collapses to an empty white ring.
          src: onDarkPreview
            ? officialLogos.lockup.srcOnDark!
            : officialLogos.lockup.src,
          width: isCaatS ? 220 : isCaatA ? 220 : 160,
          height: isCaatS ? 72 : isCaatA ? 50 : 64,
          onDark: onDarkPreview,
          plateColor: onDarkPreview ? primaryColor : undefined,
        },
      });
    }
    if (
      officialLogos.selectableVariants.includes("mark") &&
      officialLogos.mark
    ) {
      options.push({
        id: "mark",
        title: t("useMark"),
        description: t("useMarkHint"),
        preview: {
          src: officialLogos.mark.src,
          width: 56,
          height: 56,
        },
      });
    }
  }

  if (showUnionPack && preset && presetLogos) {
    options.push(
      {
        id: "union-lockup",
        title: t("useUnionLockup", { union: preset.name }),
        description: t("useUnionLockupHint", { union: preset.name }),
        preview: {
          src: presetLogos.lockup,
          width: 160,
          height: 64,
        },
      },
      {
        id: "union-mark",
        title: t("useUnionMark", { union: preset.name }),
        description: t("useUnionMarkHint", { union: preset.name }),
        preview: {
          src: presetLogos.mark,
          width: 56,
          height: 56,
        },
      },
    );
  }

  options.push(
    {
      id: "platform",
      title: t("usePlatform"),
      description: t("usePlatformHint"),
      preview: {
        platformMark: true,
        width: 48,
        height: 48,
      },
    },
    {
      id: "custom",
      title: t("uploadCustomLogo"),
      description: t("uploadHint"),
    },
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3" role="radiogroup" aria-label={t("title")}>
        {options.map((option) => {
          const selected = mode === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onModeChange(option.id)}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                selected
                  ? "border-opseu-blue bg-opseu-blue/5 ring-2 ring-opseu-blue/20"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                  selected ? "border-opseu-blue" : "border-gray-400",
                )}
                aria-hidden
              >
                {selected && (
                  <span className="h-2 w-2 rounded-full bg-opseu-blue" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-opseu-dark">
                  {option.title}
                </span>
                <span className="mt-0.5 block text-sm text-gray-600">
                  {option.description}
                </span>
                {option.preview && (
                  <span
                    className={cn(
                      "mt-3 inline-flex max-w-full items-center justify-center overflow-hidden rounded-md",
                      option.preview.platformMark ? "p-2" : "px-2 py-1.5",
                      !option.preview.plateColor && "ring-1 ring-black/10",
                      option.preview.onDark && !option.preview.plateColor
                        ? "bg-opseu-dark"
                        : !option.preview.plateColor
                          ? "bg-white"
                          : undefined,
                    )}
                    style={
                      option.preview.plateColor
                        ? { backgroundColor: option.preview.plateColor }
                        : undefined
                    }
                  >
                    {option.preview.platformMark ? (
                      <span className="flex flex-wrap items-center gap-3">
                        <UnionOpsMark
                          primaryColor={primaryColor}
                          secondaryColor={secondaryColor}
                          size="md"
                        />
                        <span className="inline-flex items-center justify-center rounded-lg bg-opseu-dark p-2">
                          <UnionOpsMark
                            primaryColor={primaryColor}
                            secondaryColor={secondaryColor}
                            size="md"
                            onDark
                          />
                        </span>
                      </span>
                    ) : (
                      <SafeLogoImage
                        key={option.preview.src}
                        src={option.preview.src!}
                        width={option.preview.width}
                        height={option.preview.height}
                        onDark={option.preview.onDark}
                        className="h-14 w-auto max-w-[min(100%,14rem)] shrink-0"
                      />
                    )}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {mode === "custom" && (
        <ImageUpload
          label={t("uploadCustomLogo")}
          hint={t("uploadHint")}
          preview={customLogoDataUrl?.trim() ? customLogoDataUrl : undefined}
          onUpload={onCustomLogoUpload}
          onClear={onCustomLogoClear}
        />
      )}
    </div>
  );
}
