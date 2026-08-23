"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useBrandStore } from "@/store/brand-store";
import { useOneShotBrandSeed } from "@/hooks/use-one-shot-brand-seed";
import { alignOpseuMembershipPrimary } from "@/lib/brand/membership-primary";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Callout } from "@/components/ui/Callout";
import { Input } from "@/components/ui/Input";
import { ThemePicker } from "@/components/tools/ThemePicker";
import { UnionPresetSelect } from "@/components/tools/UnionPresetSelect";
import {
  LogoSettings,
  brandKitPatchForLogoMode,
} from "@/components/brand/LogoSettings";
import { LocalLinksEditor } from "@/components/brand/LocalLinksEditor";
import { MembershipUrlsEditor } from "@/components/brand/MembershipUrlsEditor";
import { OpseuSectorSelect } from "@/components/brand/OpseuSectorSelect";
import { IdentityPackPicker } from "@/components/brand/IdentityPackPicker";
import { CollectionProfilesEditor } from "@/components/brand/CollectionProfilesEditor";
import { hasStarterCollectionList } from "@/lib/brand/collection-profiles";
import { resolveIdentityPackForKit } from "@/lib/brand/identity-packs";
import { BrandKitCanvasPanel } from "@/components/brand/BrandKitCanvasPanel";
import {
  brandFieldsFromUnionPreset,
  getUnionPreset,
  resolvePresetLogos,
  type UnionBranding,
} from "@/lib/constants/unionPresets";
import { SafeLogoImage } from "@/components/brand/SafeLogoImage";
import { UnionOpsMark } from "@/components/brand/UnionOpsMark";
import { resolveLocalNumber } from "@/lib/utils";
import { isBrandThemeEstablished } from "@/lib/utils/brand-theme";
import { PageShell } from "@/components/layout/PageShell";
import { WorkshopDemoPath } from "@/components/comms/WorkshopDemoPath";
import { useWorkshopDemoSession } from "@/hooks/use-workshop-demo-session";

export default function BrandKitPage() {
  const t = useTranslations("brandKit");
  const nav = useTranslations("nav");
  const {
    brandKit,
    setBrandKit,
    importBrandKit,
    resetBrandKit,
    onboardingComplete,
    storageBlocked,
    dismissStorageBlocked,
    hydrated,
  } = useBrandStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const themeEstablished = isBrandThemeEstablished(
    brandKit,
    onboardingComplete,
  );
  const inDemo = useWorkshopDemoSession(null);

  const unionPresetId = brandKit.unionPresetId ?? "";
  const selectedPreset = getUnionPreset(unionPresetId);
  const selectedLogos = selectedPreset
    ? resolvePresetLogos(selectedPreset.logos)
    : null;
  const activeIdentityPack = resolveIdentityPackForKit(brandKit);
  const multiProfile = (brandKit.profiles?.length ?? 0) > 1;
  const showPresetCollectionsNote = hasStarterCollectionList(unionPresetId);

  useOneShotBrandSeed(hydrated, () => {
    const kit = useBrandStore.getState().brandKit;
    const aligned = alignOpseuMembershipPrimary(kit);
    if (aligned.membershipUrls !== kit.membershipUrls) {
      setBrandKit({ membershipUrls: aligned.membershipUrls });
    }
  });

  const applyUnionPreset = (preset: UnionBranding) => {
    setBrandKit(
      brandFieldsFromUnionPreset(preset, {
        localNumber: brandKit.local.localNumber,
      }),
    );
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
        (parsed.version !== "1.0" &&
          parsed.version !== "1.1" &&
          parsed.version !== "2.0") ||
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
    <PageShell className="py-8 md:py-12">
      {inDemo ? (
        <WorkshopDemoPath variant="trail" className="mb-4" />
      ) : null}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
        <header className="min-w-0 max-w-3xl">
          <h1 className="text-2xl font-bold text-opseu-dark md:text-3xl">
            {t("title")}
          </h1>
          <p className="mt-2 max-w-prose text-gray-600">{t("description")}</p>
        </header>

        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <div className="flex flex-wrap gap-2 sm:justify-end">
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
              {t("resetDefaults")}
            </Button>
          </div>
          {message ? (
            <p className="text-sm text-opseu-blue" role="status">
              {message}
            </p>
          ) : null}
        </div>
      </div>

      {storageBlocked ? (
        <Callout
          tone="muted"
          className="mt-6 flex flex-col gap-3 border-amber-300 bg-amber-50 sm:flex-row sm:items-start sm:justify-between"
          role="alert"
        >
          <p className="text-sm text-amber-950">{t("storageBlocked")}</p>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="shrink-0"
            onClick={dismissStorageBlocked}
          >
            {t("storageBlockedDismiss")}
          </Button>
        </Callout>
      ) : null}

      <Callout tone="brand" className="mt-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2 sm:gap-6">
            <div className="max-w-xl">
              <p className="font-semibold text-opseu-dark">{t("purposeSets")}</p>
              <p className="mt-1">{t("purposeSetsBody")}</p>
            </div>
            <div className="max-w-xl">
              <p className="font-semibold text-opseu-dark">
                {t("purposeUnlocks")}
              </p>
              <p className="mt-1">{t("purposeUnlocksBody")}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 lg:shrink-0">
            {themeEstablished ? (
              <Link href="/guide/social-media-plan" className="inline-flex">
                <Button size="sm">{t("continueRoadmap")}</Button>
              </Link>
            ) : (
              <Link href="/onboarding" className="inline-flex">
                <Button size="sm">{t("startSetup")}</Button>
              </Link>
            )}
            <Link
              href="/assets"
              className="inline-flex min-h-11 items-center text-sm font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
            >
              {t("assetsLink")}
            </Link>
            <Link
              href="/guide/email-broadcast"
              className="inline-flex min-h-11 items-center text-sm font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
            >
              {nav("emailBroadcastGuide")}
            </Link>
          </div>
        </div>
      </Callout>

      <div className="mt-4 grid min-w-0 items-start gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card
          density="compact"
          className="space-y-3 lg:col-start-1 lg:row-start-1"
        >
          <CardTitle className="text-base">{t("unionPreset.title")}</CardTitle>
          <p className="text-sm text-gray-600">{t("unionPreset.description")}</p>
          <UnionPresetSelect
            label={t("unionPreset.label")}
            value={unionPresetId}
            placeholder={t("unionPreset.placeholder")}
            onSelect={applyUnionPreset}
          />
          {showPresetCollectionsNote ? (
            <p className="text-sm text-gray-600">{t("unionPreset.collectionsNote")}</p>
          ) : null}
          {unionPresetId === "opseu" ? <OpseuSectorSelect /> : null}
          {unionPresetId === "opseu" ? <IdentityPackPicker /> : null}
          {selectedPreset && selectedLogos ? (
            <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start xl:grid-cols-1">
              <div className="flex min-w-0 flex-wrap items-center gap-4">
                {selectedLogos.useOfficialPack ? (
                  <>
                    <SafeLogoImage
                      src={
                        activeIdentityPack?.logos.lockup ?? selectedLogos.lockup
                      }
                      alt={selectedPreset.name}
                      width={200}
                      height={48}
                      className="h-12 w-auto max-w-full"
                    />
                    {activeIdentityPack?.logos.mark ? (
                      <SafeLogoImage
                        src={activeIdentityPack.logos.mark}
                        alt={selectedPreset.name}
                        width={48}
                        height={48}
                        className="h-12 w-12"
                      />
                    ) : null}
                  </>
                ) : (
                  <UnionOpsMark
                    primaryColor={selectedPreset.primaryColor}
                    secondaryColor={selectedPreset.secondaryColor}
                    size="md"
                  />
                )}
              </div>
              <div className="space-y-2">
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
            </div>
          ) : null}
        </Card>

        <Card
          density="compact"
          className="space-y-3 lg:col-start-2 lg:row-start-1 lg:row-span-2 xl:row-span-1"
        >
          <CardTitle className="text-base">{t("currentSettings")}</CardTitle>
          <CollectionProfilesEditor />
          <div className={`grid gap-3 ${multiProfile ? "" : "sm:grid-cols-2"}`}>
            <Input
              label={t("localNumber")}
              value={brandKit.local.localNumber}
              onChange={(e) =>
                setBrandKit({
                  local: { ...brandKit.local, localNumber: e.target.value },
                })
              }
            />
            {!multiProfile ? (
              <Input
                label={t("subText")}
                value={brandKit.local.subText}
                onChange={(e) =>
                  setBrandKit({
                    local: { ...brandKit.local, subText: e.target.value },
                  })
                }
              />
            ) : null}
          </div>
          <ThemePicker
            primaryColor={brandKit.primaryColor}
            secondaryColor={brandKit.secondaryColor}
            accentColor={brandKit.accentColor}
            confirmLowContrast
            onPrimaryChange={(c) => setBrandKit({ primaryColor: c })}
            onSecondaryChange={(c) => setBrandKit({ secondaryColor: c })}
            primaryLabel={t("colors.primary")}
            secondaryLabel={t("colors.secondary")}
          />
        </Card>

        <Card
          density="compact"
          className="space-y-3 lg:col-start-1 lg:row-start-2 xl:col-start-3 xl:row-start-1"
        >
          <CardTitle className="text-base">{t("logo.title")}</CardTitle>
          <p className="text-sm text-gray-600">{t("logo.description")}</p>
          <LogoSettings
            useOfficialLogo={brandKit.useOfficialLogo}
            officialLogoVariant={brandKit.officialLogoVariant}
            customLogoDataUrl={brandKit.customLogoDataUrl}
            logoText={brandKit.logoText}
            unionPresetId={brandKit.unionPresetId}
            identityPackId={brandKit.identityPackId}
            opseuSectorId={brandKit.opseuSectorId}
            primaryColor={brandKit.primaryColor}
            secondaryColor={brandKit.secondaryColor}
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
            onCustomLogoClear={() => setBrandKit({ customLogoDataUrl: "" })}
            onLogoTextChange={(text) => setBrandKit({ logoText: text })}
          />
        </Card>
      </div>

      <div className="mt-4">
        <BrandKitCanvasPanel />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card density="compact" className="space-y-3">
          <LocalLinksEditor
            websiteUrl={brandKit.websiteUrl ?? ""}
            facebookUrl={brandKit.facebookUrl ?? ""}
            customLinks={brandKit.customLinks ?? []}
            onWebsiteChange={(url) => setBrandKit({ websiteUrl: url })}
            onFacebookChange={(url) => setBrandKit({ facebookUrl: url })}
            onCustomLinksChange={(links) => setBrandKit({ customLinks: links })}
          />
        </Card>

        <Card density="compact" className="space-y-3">
          <MembershipUrlsEditor
            membershipUrls={brandKit.membershipUrls ?? []}
            onChange={(urls) => setBrandKit({ membershipUrls: urls })}
          />
        </Card>
      </div>
    </PageShell>
  );
}
