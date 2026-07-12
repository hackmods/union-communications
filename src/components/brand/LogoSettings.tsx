"use client";

import { useTranslations } from "next-intl";
import { ImageUpload } from "@/components/tools/ImageUpload";
import { SafeLogoImage } from "@/components/brand/SafeLogoImage";
import { UnionOpsMark } from "@/components/brand/UnionOpsMark";
import {
  OFFICIAL_LOGOS,
  BRAND_COLORS,
  isOfficialLogoVariant,
  isSelectableOfficialLogoVariant,
  type OfficialLogoVariant,
} from "@/lib/constants/brand";
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
): LogoMode {
  if (useOfficialLogo) {
    // Official OPSEU pack only when this preset owns it
    if (!presetLogos || presetLogos.useOfficialPack) {
      return isOfficialLogoVariant(officialLogoVariant)
        ? officialLogoVariant
        : "lockup";
    }
  }

  if (customLogoDataUrl === undefined) return "platform";
  if (customLogoDataUrl === "") return "custom";

  const src = customLogoDataUrl.trim();
  if (isUnionOpsLogoSrc(src)) return "platform";
  if (presetLogos && !presetLogos.useOfficialPack) {
    // Only treat as union modes when paths are distinct from UnionOps fallbacks
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
): LogoMode {
  let mode = resolveLogoMode(
    useOfficialLogo,
    officialLogoVariant,
    customLogoDataUrl,
    presetLogos,
  );
  if (isOfficialLogoVariant(mode) && !isSelectableOfficialLogoVariant(mode)) {
    mode = "lockup";
  }
  // OPSEU options aren't offered for other unions — remount onto platform/union paths
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
    // Guard: never persist UnionOps fallbacks as a "union" selection
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
  // No logo selected → UnionOps mark tinted to Brand Kit colours
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
  primaryColor = BRAND_COLORS.primary,
  secondaryColor = BRAND_COLORS.secondary,
  onModeChange,
  onCustomLogoUpload,
  onCustomLogoClear,
}: LogoSettingsProps) {
  const t = useTranslations("brandKit.logo");
  const preset = unionPresetId ? getUnionPreset(unionPresetId) : undefined;
  const presetLogos = preset ? resolvePresetLogos(preset.logos) : null;
  const showOpseuPack = Boolean(presetLogos?.useOfficialPack);
  // Only offer union wordmark/mark when the preset has real assets attached.
  // Otherwise those radios pointed at UnionOps fallbacks and couldn't stay selected.
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
    };
  };

  const options: Option[] = [];

  if (showOpseuPack) {
    options.push(
      {
        id: "lockup",
        title: t("useLockup"),
        description: t("useLockupHint"),
        preview: {
          src: OFFICIAL_LOGOS.lockup.src,
          width: 160,
          height: 64,
        },
      },
      {
        id: "mark",
        title: t("useMark"),
        description: t("useMarkHint"),
        preview: {
          src: OFFICIAL_LOGOS.mark.src,
          width: 56,
          height: 56,
        },
      },
    );
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
                      "mt-3 inline-flex items-center justify-center rounded-lg p-2",
                      option.preview.onDark ? "bg-opseu-dark" : "bg-white",
                    )}
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
                        src={option.preview.src!}
                        width={option.preview.width}
                        height={option.preview.height}
                        onDark={option.preview.onDark}
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
