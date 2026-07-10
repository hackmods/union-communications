"use client";

import { useTranslations } from "next-intl";
import { ImageUpload } from "@/components/tools/ImageUpload";

interface LogoSettingsProps {
  useOfficialLogo: boolean;
  customLogoDataUrl?: string;
  onUseOfficialLogoChange: (value: boolean) => void;
  onCustomLogoUpload: (dataUrl: string) => void;
  onCustomLogoClear: () => void;
}

export function LogoSettings({
  useOfficialLogo,
  customLogoDataUrl,
  onUseOfficialLogoChange,
  onCustomLogoUpload,
  onCustomLogoClear,
}: LogoSettingsProps) {
  const t = useTranslations("brandKit.logo");

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={useOfficialLogo}
          onChange={(e) => onUseOfficialLogoChange(e.target.checked)}
        />
        {t("useOfficialLogo")}
      </label>
      {!useOfficialLogo && (
        <ImageUpload
          label={t("uploadCustomLogo")}
          hint={t("uploadHint")}
          preview={customLogoDataUrl}
          onUpload={onCustomLogoUpload}
          onClear={onCustomLogoClear}
        />
      )}
    </div>
  );
}
