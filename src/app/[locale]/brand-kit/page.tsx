"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useBrandStore } from "@/store/brand-store";
import { useOneShotBrandSeed } from "@/hooks/use-one-shot-brand-seed";
import {
  alignOpseuMembershipPrimary,
  membershipAudienceOptions,
} from "@/lib/brand/membership-primary";
import { Button } from "@/components/ui/Button";
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
import { SavedLooksPanel } from "@/components/brand/SavedLooksPanel";
import { BrandKitContextHint } from "@/components/brand/BrandKitContextHint";
import { CollectionProfilesEditor } from "@/components/brand/CollectionProfilesEditor";
import { hasStarterCollectionList } from "@/lib/brand/collection-profiles";
import { resolveIdentityPackForKit } from "@/lib/brand/identity-packs";
import { BrandKitCanvasPanel } from "@/components/brand/BrandKitCanvasPanel";
import { DesignTreatmentControl } from "@/components/tools/DesignTreatmentControl";
import { resolveDesignTreatment } from "@/lib/brand/design-treatment";
import { BrandKitPreview } from "@/components/brand/BrandKitPreview";
import { BrandKitCompletenessBar } from "@/components/brand/BrandKitCompletenessBar";
import { BrandKitSaveBanner } from "@/components/brand/BrandKitSaveBanner";
import {
  brandFieldsFromUnionPreset,
  getUnionPreset,
  resolvePresetLogos,
  type UnionBranding,
} from "@/lib/constants/unionPresets";
import { SafeLogoImage } from "@/components/brand/SafeLogoImage";
import { UnionOpsMark } from "@/components/brand/UnionOpsMark";
import { isBrandThemeEstablished } from "@/lib/utils/brand-theme";
import { ComposedPageLayout } from "@/components/layout/ComposedPageLayout";
import { TOOL_COMPOSITION } from "@/lib/constants/page-composition";
import {
  PUBLIC_PAGE_TITLE_CLASS,
  PUBLIC_SECTION_TITLE_CLASS,
} from "@/lib/constants/public-type";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { PublicHubPanel } from "@/components/comms/PublicHubPanel";
import { PresetSloganPicker } from "@/components/brand/PresetSloganPicker";
import { WorkshopDemoPath } from "@/components/comms/WorkshopDemoPath";
import { JointActionCard } from "@/components/comms/campaign/JointActionCard";
import { useWorkshopDemoSession } from "@/hooks/use-workshop-demo-session";
import { BrandBaselineOffer } from "@/components/customization/BrandBaselineOffer";

export default function BrandKitPage() {
  const t = useTranslations("brandKit");
  const nav = useTranslations("nav");
  const {
    brandKit,
    setBrandKit,
    resetBrandKit,
    onboardingComplete,
    storageBlocked,
    dismissStorageBlocked,
    hydrated,
    hasStoredBrandKit,
  } = useBrandStore();
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

  const confirmReset = () => {
    if (window.confirm(t("resetConfirm"))) resetBrandKit();
  };
  const sectionLinkClass =
    "text-opseu-blue underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-opseu-blue";

  return (
    <ComposedPageLayout
      composition={TOOL_COMPOSITION.editor.composition}
      size={TOOL_COMPOSITION.editor.shell}
      className="py-6 md:py-8"
    >
      <BrandKitSaveBanner />
      {inDemo ? (
        <WorkshopDemoPath variant="trail" className="mb-6" />
      ) : null}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
        <header className="min-w-0">
          <h1 className={PUBLIC_PAGE_TITLE_CLASS}>{t("title")}</h1>
          <p className="mt-2 max-w-prose text-slate-600">{t("description")}</p>
          {hydrated && hasStoredBrandKit && !storageBlocked ? (
            <p className="mt-2 text-sm font-medium text-slate-600">
              {t("savedOnDevice")}
            </p>
          ) : null}
        </header>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <ButtonLink href="/tools/local-pack" variant="outline" size="sm">
            {t("moveBrowser")}
          </ButtonLink>
          <Button type="button" variant="ghost" onClick={confirmReset}>
            {t("resetDefaults")}
          </Button>
        </div>
      </div>

      {storageBlocked ? (
        <Callout
          tone="muted"
          className="mt-4 flex flex-col gap-3 border-amber-300 bg-amber-50 sm:flex-row sm:items-start sm:justify-between"
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

      <div className="mt-4">
        <BrandKitCompletenessBar
          brandKit={brandKit}
          hydrated={hydrated}
        />
      </div>

      <BrandKitContextHint />

      <nav
        aria-label={t("sectionNavLabel")}
        className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold"
      >
        <a href="#brand-identity" className={sectionLinkClass}>
          {t("sections.identity")}
        </a>
        <a href="#brand-colours" className={sectionLinkClass}>
          {t("sections.colours")}
        </a>
        <a href="#brand-preview" className={`${sectionLinkClass} xl:hidden`}>
          {t("sections.preview")}
        </a>
        <a href="#brand-style" className={sectionLinkClass}>
          {t("sections.style")}
        </a>
        <a href="#brand-links" className={sectionLinkClass}>
          {t("sections.links")}
        </a>
        <a href="#brand-display" className={sectionLinkClass}>
          {t("sections.display")}
        </a>
      </nav>

      <div className="mt-5 grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(20rem,1fr)]">
        <div id="brand-identity" className="min-w-0 scroll-mt-28 space-y-5 xl:col-start-1 xl:row-start-1">
        <PublicHubPanel
          title={t("unionPreset.title")}
          description={t("unionPreset.description")}
        >
          <UnionPresetSelect
            label={t("unionPreset.label")}
            value={unionPresetId}
            placeholder={t("unionPreset.placeholder")}
            onSelect={applyUnionPreset}
          />
          <div className={`grid gap-3 ${multiProfile ? "" : "sm:grid-cols-2"}`}>
            <Input
              id="brand-local-number"
              className="scroll-mt-28"
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
          {showPresetCollectionsNote ? (
            <p className="text-sm text-gray-600">
              {t("unionPreset.collectionsNote")}
            </p>
          ) : null}
          {unionPresetId === "opseu" ? <OpseuSectorSelect /> : null}
          {unionPresetId === "opseu" ? <IdentityPackPicker roomy /> : null}
          <BrandBaselineOffer />
          {selectedPreset && selectedLogos ? (
            <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
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
                <p className="text-xs text-gray-500">
                  {t("unionPreset.logoNote")}
                </p>
                <PresetSloganPicker
                  presetId={selectedPreset.id}
                  onApply={(slogan) =>
                    setBrandKit({
                      local: { ...brandKit.local, subText: slogan },
                    })
                  }
                />
              </div>
            </div>
          ) : null}
        </PublicHubPanel>

        <PublicHubPanel
          id="brand-colours"
          title={t("currentSettings")}
          className="scroll-mt-28"
        >
          <CollectionProfilesEditor />
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
          <div className="mt-4">
            <DesignTreatmentControl
              primaryColor={brandKit.primaryColor}
              value={resolveDesignTreatment(brandKit)}
              onChange={(designTreatment) => setBrandKit({ designTreatment })}
            />
          </div>
          <SavedLooksPanel />
        </PublicHubPanel>

        <PublicHubPanel
          id="brand-logo"
          title={t("logo.title")}
          description={t("logo.description")}
          className="scroll-mt-28"
        >
          <LogoSettings
            useOfficialLogo={brandKit.useOfficialLogo}
            officialLogoVariant={brandKit.officialLogoVariant}
            customLogoDataUrl={brandKit.customLogoDataUrl}
            logoText={brandKit.logoText}
            unionPresetId={brandKit.unionPresetId}
            identityPackId={brandKit.identityPackId}
            opseuSectorId={brandKit.opseuSectorId}
            campaignPlate={brandKit.campaignPlate}
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
          <details className="rounded-lg border border-slate-200 bg-white p-3">
            <summary className="cursor-pointer text-sm font-semibold text-opseu-dark">{t("campaignSection")}</summary>
            <div className="mt-3 space-y-1">
              <Input
                id="campaign-badge"
                label={t("campaignBadge.label")}
                value={brandKit.campaignBadge ?? ""}
                placeholder={t("campaignBadge.placeholder")}
                onChange={(e) => setBrandKit({ campaignBadge: e.target.value.trim() || undefined })}
              />
              <p className="text-xs text-slate-600">{t("campaignBadge.hint")}</p>
            </div>
          </details>
        </PublicHubPanel>
        </div>

        <aside id="brand-preview" className="min-w-0 scroll-mt-28 xl:col-start-2 xl:row-start-1 xl:row-span-3 xl:self-stretch">
          <div className="xl:sticky xl:top-24">
            <PublicHubPanel title={t("previewTitle")} description={t("previewDescription")}>
              <BrandKitPreview brandKit={brandKit} hydrated={hydrated} />
              <p className="text-xs text-slate-600">{t("previewNote")}</p>
            </PublicHubPanel>
          </div>
        </aside>

      <div id="brand-style" className="min-w-0 scroll-mt-28 space-y-5 xl:col-start-1 xl:row-start-2">
        <BrandKitCanvasPanel />
        {themeEstablished && unionPresetId === "opseu" ? (
          <PublicHubPanel
            title={t("coalitionPreview.title")}
            description={t("coalitionPreview.description")}
          >
            <JointActionCard
              primaryColor={brandKit.primaryColor}
              accentColor={brandKit.accentColor}
              title={t("coalitionPreview.sampleTitle")}
              body={t("coalitionPreview.sampleBody")}
              actionLabel={t("coalitionPreview.sampleAction")}
              coalitionBadge={
                brandKit.campaignBadge?.trim() ||
                t("coalitionPreview.defaultBadge")
              }
            />
          </PublicHubPanel>
        ) : null}
      </div>

      <div id="brand-links" className="min-w-0 scroll-mt-28 space-y-5 xl:col-start-1 xl:row-start-3">
        <h2 className={PUBLIC_SECTION_TITLE_CLASS}>{t("sections.links")}</h2>
        <PublicHubPanel>
          <LocalLinksEditor
            websiteUrl={brandKit.websiteUrl ?? ""}
            facebookUrl={brandKit.facebookUrl ?? ""}
            customLinks={brandKit.customLinks ?? []}
            onWebsiteChange={(url) => setBrandKit({ websiteUrl: url })}
            onFacebookChange={(url) => setBrandKit({ facebookUrl: url })}
            onCustomLinksChange={(links) => setBrandKit({ customLinks: links })}
          />
        </PublicHubPanel>

        <PublicHubPanel>
          <MembershipUrlsEditor
            membershipUrls={brandKit.membershipUrls ?? []}
            onChange={(urls) => setBrandKit({ membershipUrls: urls })}
            audienceOptions={membershipAudienceOptions(
              brandKit.unionPresetId,
              brandKit.opseuSectorId,
            )}
          />
        </PublicHubPanel>

        <PublicHubPanel title={t("signatureSection")} description={t("signatureNameHint")}>
          <Input
            label={t("signatureName")}
            value={brandKit.signatureName ?? ""}
            placeholder={t("signatureNamePlaceholder")}
            onChange={(e) => setBrandKit({ signatureName: e.target.value.trim() || undefined })}
          />
        </PublicHubPanel>
      </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold">
        <Link href="/assets" className="text-opseu-blue underline underline-offset-2">{t("assetsLink")}</Link>
        <Link href="/guide/email-broadcast" className="text-opseu-blue underline underline-offset-2">{nav("emailBroadcastGuide")}</Link>
        {themeEstablished ? <Link href="/create" className="text-opseu-blue underline underline-offset-2">{t("openCreate")}</Link> : null}
      </div>

      <PublicHubPanel
        id="brand-display"
        title={t("displayPreferences")}
        description={t("displayPreferencesBody")}
        className="mt-8 max-w-3xl scroll-mt-28"
      >
        <Callout>
          <p>
            <Link
              href="/accessibility"
              className="font-semibold text-opseu-blue underline underline-offset-2"
            >
              {t("displayPreferencesOpen")}
            </Link>
          </p>
        </Callout>
      </PublicHubPanel>
    </ComposedPageLayout>
  );
}
