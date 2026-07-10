"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { ImageUpload } from "@/components/tools/ImageUpload";
import { Input } from "@/components/ui/Input";
import { DEFAULT_ASSET_PACK_PATH } from "@/lib/constants/brand";
import { cn } from "@/lib/utils";

export type LogoMode = "official" | "custom" | "none";

export function resolveLogoMode(
  useOfficialLogo: boolean,
  customLogoDataUrl?: string,
): LogoMode {
  if (useOfficialLogo) return "official";
  if (customLogoDataUrl) return "custom";
  return "none";
}

interface LogoSettingsProps {
  useOfficialLogo: boolean;
  customLogoDataUrl?: string;
  logoText?: string;
  onModeChange: (mode: LogoMode) => void;
  onCustomLogoUpload: (dataUrl: string) => void;
  onCustomLogoClear: () => void;
  onLogoTextChange?: (text: string) => void;
}

export function LogoSettings({
  useOfficialLogo,
  customLogoDataUrl,
  logoText = "LU",
  onModeChange,
  onCustomLogoUpload,
  onCustomLogoClear,
  onLogoTextChange,
}: LogoSettingsProps) {
  const t = useTranslations("brandKit.logo");
  const mode = resolveLogoMode(useOfficialLogo, customLogoDataUrl);

  const options: { id: LogoMode; title: string; description: string }[] = [
    {
      id: "official",
      title: t("useOfficialLogo"),
      description: t("useOfficialLogoHint"),
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
      <div
        className="grid gap-3"
        role="radiogroup"
        aria-label={t("title")}
      >
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
                {option.id === "official" && selected && (
                  <span className="mt-3 block">
                    <Image
                      src={`${DEFAULT_ASSET_PACK_PATH}logo-primary.png`}
                      alt=""
                      width={160}
                      height={64}
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
