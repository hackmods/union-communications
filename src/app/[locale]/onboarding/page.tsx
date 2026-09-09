"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useBrandStore } from "@/store/brand-store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ThemePicker } from "@/components/tools/ThemePicker";
import { UnionPresetSelect } from "@/components/tools/UnionPresetSelect";
import {
  LogoSettings,
  brandKitPatchForLogoMode,
  type LogoMode,
} from "@/components/brand/LogoSettings";
import { OpseuSectorSelect } from "@/components/brand/OpseuSectorSelect";
import { IdentityPackPicker } from "@/components/brand/IdentityPackPicker";
import { CollectionProfilesEditor } from "@/components/brand/CollectionProfilesEditor";
import { LocalLinksEditor } from "@/components/brand/LocalLinksEditor";
import { hasStarterCollectionList } from "@/lib/brand/collection-profiles";
import {
  brandFieldsFromUnionPreset,
  getUnionPreset,
  resolvePresetLogos,
  UNIONOPS_LOGOS,
  type UnionBranding,
} from "@/lib/constants/unionPresets";
import { PresetSloganPicker } from "@/components/brand/PresetSloganPicker";
import { PageShell } from "@/components/layout/PageShell";
import {
  PUBLIC_PAGE_TITLE_CLASS,
  PUBLIC_SECTION_TITLE_CLASS,
} from "@/lib/constants/public-type";
import { cn } from "@/lib/utils";

const TOTAL_STEPS = 3;

export default function OnboardingPage() {
  const t = useTranslations("onboarding");
  const common = useTranslations("common");
  const router = useRouter();
  const { brandKit, setBrandKit, setOnboardingComplete } = useBrandStore();
  const [step, setStep] = useState(1);
  const presetLogos = brandKit.unionPresetId
    ? resolvePresetLogos(getUnionPreset(brandKit.unionPresetId)?.logos)
    : null;
  const profileCount = brandKit.profiles?.length ?? 0;
  const multiProfile = profileCount > 1;
  const isOpseu = brandKit.unionPresetId === "opseu";
  const showCollections =
    hasStarterCollectionList(brandKit.unionPresetId) || multiProfile;

  // Default to UnionOps mark — never force OPSEU unless that preset is chosen
  useEffect(() => {
    if (!brandKit.customLogoDataUrl && !brandKit.useOfficialLogo) {
      setBrandKit({
        useOfficialLogo: false,
        customLogoDataUrl: UNIONOPS_LOGOS.mark,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on enter
  }, []);

  const finish = () => {
    setOnboardingComplete(true);
    router.push("/brand-kit");
  };

  const applyUnionPreset = (preset: UnionBranding) => {
    setBrandKit(
      brandFieldsFromUnionPreset(preset, {
        localNumber: brandKit.local.localNumber,
      }),
    );
  };

  const handleLogoModeChange = (mode: LogoMode) => {
    setBrandKit(
      brandKitPatchForLogoMode(
        mode,
        brandKit.logoText,
        brandKit.customLogoDataUrl,
        presetLogos,
      ),
    );
  };

  const stepTitles = [t("step1"), t("step2"), t("step3")] as const;

  return (
    <PageShell size="focus" className="py-8 md:py-12">
      <header>
        <h1 className={PUBLIC_PAGE_TITLE_CLASS}>{t("title")}</h1>
        <p className="mt-2 max-w-prose text-gray-700">{t("subtitle")}</p>
      </header>

      <nav className="mt-6" aria-label={t("progressLabel")}>
        <p className="text-sm font-medium text-gray-600">
          {t("stepOf", { step, total: TOTAL_STEPS })}
        </p>
        <ol className="mt-3 grid list-none grid-cols-3 gap-2 p-0">
          {stepTitles.map((label, index) => {
            const n = index + 1;
            const active = n === step;
            const complete = n < step;
            return (
              <li key={label} className="min-w-0">
                <div
                  className={cn(
                    "h-2 rounded-full",
                    complete || active ? "bg-opseu-blue" : "bg-gray-200",
                  )}
                  aria-hidden
                />
                <p
                  className={cn(
                    "mt-2 truncate text-xs font-medium",
                    active ? "text-opseu-dark" : "text-gray-500",
                  )}
                >
                  {label}
                </p>
              </li>
            );
          })}
        </ol>
      </nav>

      <section
        className="mt-6 rounded-xl border border-opseu-blue/15 bg-gradient-to-b from-opseu-blue/[0.05] to-white p-5 sm:p-6"
        aria-labelledby={`onboarding-step-${step}`}
      >
        {step === 1 && (
          <div className="space-y-3">
            <h2
              id="onboarding-step-1"
              className={PUBLIC_SECTION_TITLE_CLASS}
            >
              {t("step1")}
            </h2>
            <UnionPresetSelect
              label={t("unionPreset")}
              value={brandKit.unionPresetId ?? ""}
              placeholder={t("unionPresetPlaceholder")}
              onSelect={applyUnionPreset}
            />
            <p className="max-w-prose text-sm text-gray-600">
              {t("unionPresetHint")}
            </p>
            <Input
              label={t("localNumber")}
              placeholder={t("localNumberPlaceholder")}
              value={brandKit.local.localNumber}
              onChange={(e) =>
                setBrandKit({
                  local: { ...brandKit.local, localNumber: e.target.value },
                })
              }
            />
            {isOpseu ? <OpseuSectorSelect compact /> : null}
            {isOpseu ? <IdentityPackPicker compact /> : null}
            {showCollections ? (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-700">
                  {t("collectionsHeading")}
                </h3>
                <CollectionProfilesEditor compact />
              </div>
            ) : (
              <div className="space-y-3">
                {brandKit.unionPresetId ? (
                  <PresetSloganPicker
                    presetId={brandKit.unionPresetId}
                    onApply={(slogan) =>
                      setBrandKit({
                        local: { ...brandKit.local, subText: slogan },
                      })
                    }
                  />
                ) : null}
                <Input
                  label={t("subText")}
                  placeholder={t("subTextPlaceholder")}
                  value={brandKit.local.subText}
                  onChange={(e) =>
                    setBrandKit({
                      local: { ...brandKit.local, subText: e.target.value },
                    })
                  }
                />
              </div>
            )}
            <LocalLinksEditor
              compact
              websiteUrl={brandKit.websiteUrl ?? ""}
              facebookUrl={brandKit.facebookUrl ?? ""}
              customLinks={brandKit.customLinks ?? []}
              onWebsiteChange={(url) => setBrandKit({ websiteUrl: url })}
              onFacebookChange={(url) => setBrandKit({ facebookUrl: url })}
              onCustomLinksChange={(links) =>
                setBrandKit({ customLinks: links })
              }
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <h2
              id="onboarding-step-2"
              className={PUBLIC_SECTION_TITLE_CLASS}
            >
              {t("step2")}
            </h2>
            <ThemePicker
              primaryColor={brandKit.primaryColor}
              secondaryColor={brandKit.secondaryColor}
              accentColor={brandKit.accentColor}
              confirmLowContrast
              onPrimaryChange={(c) => setBrandKit({ primaryColor: c })}
              onSecondaryChange={(c) => setBrandKit({ secondaryColor: c })}
              primaryLabel={t("primaryColor")}
              secondaryLabel={t("secondaryColor")}
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <h2
              id="onboarding-step-3"
              className={PUBLIC_SECTION_TITLE_CLASS}
            >
              {t("step3")}
            </h2>
            <p className="max-w-prose text-sm text-gray-600">
              {t("step3Description")}
            </p>
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
              onModeChange={handleLogoModeChange}
              onCustomLogoUpload={(url) =>
                setBrandKit({
                  useOfficialLogo: false,
                  customLogoDataUrl: url,
                })
              }
              onCustomLogoClear={() =>
                setBrandKit({ customLogoDataUrl: "" })
              }
              onLogoTextChange={(text) => setBrandKit({ logoText: text })}
            />
          </div>
        )}

        <div className="button-row mt-6">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              {common("back")}
            </Button>
          )}
          {step < TOTAL_STEPS ? (
            <Button onClick={() => setStep(step + 1)}>{common("next")}</Button>
          ) : (
            <Button onClick={finish}>{t("complete")}</Button>
          )}
          <Button variant="ghost" onClick={() => router.push("/")}>
            {common("skip")}
          </Button>
        </div>
      </section>
    </PageShell>
  );
}
