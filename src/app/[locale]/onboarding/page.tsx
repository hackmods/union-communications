"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useBrandStore } from "@/store/brand-store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ThemePicker } from "@/components/tools/ThemePicker";
import { ImageUpload } from "@/components/tools/ImageUpload";

export default function OnboardingPage() {
  const t = useTranslations("onboarding");
  const common = useTranslations("common");
  const router = useRouter();
  const { brandKit, setBrandKit, setOnboardingComplete } = useBrandStore();
  const [step, setStep] = useState(1);

  const finish = () => {
    setOnboardingComplete(true);
    router.push("/brand-kit");
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
              value="CAAT"
              readOnly
              className="bg-gray-50"
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
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={brandKit.useOfficialLogo}
                onChange={(e) =>
                  setBrandKit({ useOfficialLogo: e.target.checked })
                }
              />
              {t("useOfficialLogo")}
            </label>
            {!brandKit.useOfficialLogo && (
              <ImageUpload
                label={t("uploadCustomLogo")}
                preview={brandKit.customLogoDataUrl}
                onUpload={(url) => setBrandKit({ customLogoDataUrl: url })}
                onClear={() => setBrandKit({ customLogoDataUrl: undefined })}
              />
            )}
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
