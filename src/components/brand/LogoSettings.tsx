"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { ImageUpload } from "@/components/tools/ImageUpload";
import { Input } from "@/components/ui/Input";
import { OFFICIAL_LOGOS, type OfficialLogoVariant } from "@/lib/constants/brand";
import { cn } from "@/lib/utils";

export type LogoMode = "lockup" | "mark" | "custom" | "none";

export function resolveLogoMode(
  useOfficialLogo: boolean,
  officialLogoVariant: OfficialLogoVariant | undefined,
  customLogoDataUrl?: string,
): LogoMode {
  if (useOfficialLogo) {
    return officialLogoVariant === "mark" ? "mark" : "lockup";
  }
  if (customLogoDataUrl) return "custom";
  return "none";
}

interface LogoSettingsProps {
  useOfficialLogo: boolean;
  officialLogoVariant?: OfficialLogoVariant;
  customLogoDataUrl?: string;
  logoText?: string;
  onModeChange: (mode: LogoMode) => void;
  onCustomLogoUpload: (dataUrl: string) => void;
  onCustomLogoClear: () => void;
  onLogoTextChange?: (text: string) => void;
}

export function LogoSettings({
  useOfficialLogo,
  officialLogoVariant = "lockup",
  customLogoDataUrl,
  logoText = "LU",
  onModeChange,
  onCustomLogoUpload,
  onCustomLogoClear,
  onLogoTextChange,
}: LogoSettingsProps) {
  const t = useTranslations("brandKit.logo");
  const mode = resolveLogoMode(
    useOfficialLogo,
    officialLogoVariant,
    customLogoDataUrl,
  );

  const options: {
    id: LogoMode;
    title: string;
    description: string;
    preview?: { src: string; width: number; height: number; onDark?: boolean };
  }[] = [
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
    {
      id: "custom",
      title: t("uploadCustomLogo"),
      description: t("uploadHint"),
    },
    {
      id: "none",
      title: t("noImage"),
      description: t("noImageHint"),
    },
  ];

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
                      option.id === "mark" ? "bg-white" : "bg-transparent",
                    )}
                  >
                    <Image
                      src={option.preview.src}
                      alt=""
                      width={option.preview.width}
                      height={option.preview.height}
                      className="object-contain"
                    />
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
          preview={customLogoDataUrl}
          onUpload={onCustomLogoUpload}
          onClear={onCustomLogoClear}
        />
      )}

      {mode === "none" && onLogoTextChange && (
        <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <Input
            label={t("logoText")}
            value={logoText}
            maxLength={4}
            onChange={(e) => onLogoTextChange(e.target.value.slice(0, 4))}
          />
          <p className="text-sm text-gray-600">{t("logoTextHint")}</p>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{t("preview")}</span>
            <span
              className="flex h-12 w-12 items-center justify-center rounded bg-opseu-blue text-sm font-bold text-white"
              aria-hidden
            >
              {logoText.trim() || "LU"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
