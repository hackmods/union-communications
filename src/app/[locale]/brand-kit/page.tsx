"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useBrandStore } from "@/store/brand-store";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ThemePicker } from "@/components/tools/ThemePicker";
import { UnionPresetSelect } from "@/components/tools/UnionPresetSelect";
import {
  LogoSettings,
  brandKitPatchForLogoMode,
} from "@/components/brand/LogoSettings";
import { LocalLinksEditor } from "@/components/brand/LocalLinksEditor";
import {
  brandFieldsFromUnionPreset,
  getUnionPreset,
  resolvePresetLogos,
  type UnionBranding,
} from "@/lib/constants/unionPresets";
import { SafeLogoImage } from "@/components/brand/SafeLogoImage";
import { resolveLocalNumber } from "@/lib/utils";

export default function BrandKitPage() {
  const t = useTranslations("brandKit");
  const { brandKit, setBrandKit, importBrandKit, resetBrandKit } = useBrandStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  const unionPresetId = brandKit.unionPresetId ?? "";
  const selectedPreset = getUnionPreset(unionPresetId);
  const selectedLogos = selectedPreset
    ? resolvePresetLogos(selectedPreset.logos)
    : null;

  const applyUnionPreset = (preset: UnionBranding) => {
    setBrandKit(brandFieldsFromUnionPreset(preset));
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(brandKit, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brand-kit-local-${resolveLocalNumber(brandKit.local.localNumber)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as { version?: string; local?: unknown };
      if (
        (parsed.version !== "1.0" && parsed.version !== "1.1") ||
        !parsed.local
      ) {
        throw new Error("Invalid schema");
      }
      importBrandKit(parsed);
      setMessage(t("importSuccess"));
    } catch {
      setMessage(t("importError"));
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold text-opseu-dark">{t("title")}</h1>
      <p className="mt-2 text-gray-600">{t("description")}</p>

      <Card className="mt-8 space-y-4">
        <CardTitle>{t("unionPreset.title")}</CardTitle>
        <p className="text-sm text-gray-600">{t("unionPreset.description")}</p>
        <UnionPresetSelect
          label={t("unionPreset.label")}
          value={unionPresetId}
          placeholder={t("unionPreset.placeholder")}
          onSelect={applyUnionPreset}
        />
        {selectedPreset && selectedLogos ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-4">
              <SafeLogoImage
                src={selectedLogos.lockup}
                width={200}
                height={48}
                className="h-12 max-w-[200px]"
              />
              <SafeLogoImage
                src={selectedLogos.mark}
                width={48}
                height={48}
                className="h-12 w-12"
              />
            </div>
            <p className="text-xs text-gray-500">{t("unionPreset.logoNote")}</p>
            <div>
              <p className="text-sm font-medium text-gray-700">
                {t("unionPreset.slogans")}
              </p>
              <ul className="mt-1 list-inside list-disc text-sm text-gray-600">
                {selectedPreset.defaultSlogans.map((slogan) => (
                  <li key={slogan}>{slogan}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </Card>

      <Card className="mt-6 space-y-4">
        <CardTitle>Current settings</CardTitle>
        <Input
          label="Local number"
          value={brandKit.local.localNumber}
          onChange={(e) =>
            setBrandKit({ local: { ...brandKit.local, localNumber: e.target.value } })
          }
        />
        <Input
          label="Sub-text"
          value={brandKit.local.subText}
          onChange={(e) =>
            setBrandKit({ local: { ...brandKit.local, subText: e.target.value } })
          }
        />
        <ThemePicker
          primaryColor={brandKit.primaryColor}
          secondaryColor={brandKit.secondaryColor}
          onPrimaryChange={(c) => setBrandKit({ primaryColor: c })}
          onSecondaryChange={(c) => setBrandKit({ secondaryColor: c })}
          primaryLabel={t("colors.primary")}
          secondaryLabel={t("colors.secondary")}
        />
      </Card>

      <Card className="mt-6 space-y-4">
        <CardTitle>{t("logo.title")}</CardTitle>
        <p className="text-sm text-gray-600">{t("logo.description")}</p>
        <LogoSettings
          useOfficialLogo={brandKit.useOfficialLogo}
          officialLogoVariant={brandKit.officialLogoVariant}
          customLogoDataUrl={brandKit.customLogoDataUrl}
          logoText={brandKit.logoText}
          unionPresetId={brandKit.unionPresetId}
          primaryColor={brandKit.primaryColor}
          onModeChange={(mode) => {
            setBrandKit(
              brandKitPatchForLogoMode(
                mode,
                brandKit.logoText,
                brandKit.customLogoDataUrl,
                selectedLogos,
              ),
            );
          }}
          onCustomLogoUpload={(url) =>
            setBrandKit({ useOfficialLogo: false, customLogoDataUrl: url })
          }
          onCustomLogoClear={() =>
            setBrandKit({ customLogoDataUrl: "" })
          }
          onLogoTextChange={(text) => setBrandKit({ logoText: text })}
        />
      </Card>

      <Card className="mt-6 space-y-4">
        <LocalLinksEditor
          websiteUrl={brandKit.websiteUrl ?? ""}
          facebookUrl={brandKit.facebookUrl ?? ""}
          customLinks={brandKit.customLinks ?? []}
          onWebsiteChange={(url) => setBrandKit({ websiteUrl: url })}
          onFacebookChange={(url) => setBrandKit({ facebookUrl: url })}
          onCustomLinksChange={(links) => setBrandKit({ customLinks: links })}
        />
      </Card>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={handleExport}>{t("export")}</Button>
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          {t("import")}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="sr-only"
          aria-label={t("import")}
          onChange={handleImport}
        />
        <Button variant="ghost" onClick={resetBrandKit}>
          Reset to defaults
        </Button>
      </div>
      {message && (
        <p className="mt-4 text-sm text-opseu-blue" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
