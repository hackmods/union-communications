"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useBrandStore } from "@/store/brand-store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ThemePicker } from "@/components/tools/ThemePicker";
import { LogoSettings, brandKitPatchForLogoMode, type LogoMode } from "@/components/brand/LogoSettings";
import { LocalLinksEditor } from "@/components/brand/LocalLinksEditor";
import {
  getUnionPreset,
  resolvePresetLogos,
  UNIONOPS_LOGOS,
} from "@/lib/constants/unionPresets";

export default function OnboardingPage() {
  const t = useTranslations("onboarding");
  const common = useTranslations("common");
  const router = useRouter();
  const { brandKit, setBrandKit, setOnboardingComplete } = useBrandStore();
  const [step, setStep] = useState(1);
  const [division, setDivision] = useState("");
  const presetLogos = brandKit.unionPresetId
    ? resolvePresetLogos(getUnionPreset(brandKit.unionPresetId)?.logos)
    : null;

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

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold text-opseu-dark">{t("title")}</h1>

      <div className="mt-4 flex gap-2" aria-label="Progress">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-2 flex-1 rounded ${s <= step ? "bg-opseu-blue" : "bg-gray-200"}`}
          />
        ))}
      </div>

      <Card className="mt-8">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">{t("step1")}</h2>
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
            <Input
              label={t("division")}
              placeholder={t("divisionPlaceholder")}
              value={division}
              onChange={(e) => setDivision(e.target.value)}
            />
            <LocalLinksEditor
              compact
              websiteUrl={brandKit.websiteUrl ?? ""}
              facebookUrl={brandKit.facebookUrl ?? ""}
              customLinks={brandKit.customLinks ?? []}
              onWebsiteChange={(url) => setBrandKit({ websiteUrl: url })}
              onFacebookChange={(url) => setBrandKit({ facebookUrl: url })}
              onCustomLinksChange={(links) => setBrandKit({ customLinks: links })}
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">{t("step2")}</h2>
            <ThemePicker
              primaryColor={brandKit.primaryColor}
              secondaryColor={brandKit.secondaryColor}
              onPrimaryChange={(c) => setBrandKit({ primaryColor: c })}
              onSecondaryChange={(c) => setBrandKit({ secondaryColor: c })}
              primaryLabel={t("primaryColor")}
              secondaryLabel={t("secondaryColor")}
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">{t("step3")}</h2>
            <p className="text-sm text-gray-600">{t("step3Description")}</p>
            <LogoSettings
              useOfficialLogo={brandKit.useOfficialLogo}
              officialLogoVariant={brandKit.officialLogoVariant}
              customLogoDataUrl={brandKit.customLogoDataUrl}
              logoText={brandKit.logoText}
              unionPresetId={brandKit.unionPresetId}
              primaryColor={brandKit.primaryColor}
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

        <div className="mt-8 flex flex-wrap gap-3">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              {common("back")}
            </Button>
          )}
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)}>{common("next")}</Button>
          ) : (
            <Button onClick={finish}>{t("complete")}</Button>
          )}
          <Button variant="ghost" onClick={() => router.push("/")}>
            {common("skip")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
