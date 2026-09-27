"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useBrandStore } from "@/store/brand-store";
import { getUnionPreset } from "@/lib/constants/unionPresets";
import {
  SAVED_LOOKS_MAX,
  applySavedLook,
  captureSavedLook,
  starterPaletteVariants,
} from "@/lib/brand/saved-looks";
import { resolveDesignTreatment } from "@/lib/brand/design-treatment";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function SavedLooksPanel() {
  const t = useTranslations("brandLooks");
  const kit = useBrandStore((s) => s.brandKit);
  const setBrandKit = useBrandStore((s) => s.setBrandKit);
  const [name, setName] = useState("");
  const preset = getUnionPreset(kit.unionPresetId ?? "");
  const allLooks = kit.savedLooks ?? [];
  const looks = allLooks.filter((look) => look.unionPresetId === kit.unionPresetId);
  const otherPresetCount = allLooks.length - looks.length;
  const atCap = allLooks.length >= SAVED_LOOKS_MAX;
  const currentTreatment = resolveDesignTreatment(kit);

  const save = () => {
    if (!name.trim() || atCap) return;
    const look = captureSavedLook(kit, crypto.randomUUID(), name);
    setBrandKit({ savedLooks: [...allLooks, look] });
    setName("");
  };

  return (
    <div id="brand-looks" className="scroll-mt-28 space-y-4">
      {preset && preset.id !== "opseu" ? (
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-800">{t("starters")}</p>
          <p className="mb-3 text-xs text-slate-600">{t("starterNote")}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {starterPaletteVariants(preset).map(({ id, colors }) => (
              <button
                key={id}
                type="button"
                onClick={() =>
                  setBrandKit({
                    ...colors,
                    identityPackId: undefined,
                    campaignPlate: undefined,
                  })
                }
                className="overflow-hidden rounded-lg border border-slate-300 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                <span className="flex h-16" aria-hidden="true">
                  <span className="w-2/3" style={{ backgroundColor: colors.primaryColor }} />
                  <span
                    className="w-1/3"
                    style={{
                      backgroundColor: colors.secondaryColor,
                      borderLeft: `8px solid ${colors.accentColor}`,
                    }}
                  />
                </span>
                <span className="block px-3 py-2 text-sm font-medium">{t(id)}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div>
        <p className="mb-2 text-sm font-semibold text-slate-800">{t("saved")}</p>
        <p className="mb-3 text-xs text-slate-600">{t("help")}</p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-48 flex-1">
            <Input
              label={t("name")}
              value={name}
              maxLength={60}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <Button
            type="button"
            size="sm"
            onClick={save}
            disabled={!name.trim() || atCap}
          >
            {t("save")}
          </Button>
        </div>
        <p className="mt-2 text-xs text-slate-600">
          {t("capCount", { used: allLooks.length, max: SAVED_LOOKS_MAX })}
        </p>
        {atCap && otherPresetCount > 0 ? (
          <p className="mt-1 text-xs text-amber-800">
            {t("capBlockedOtherPresets", { count: otherPresetCount })}
          </p>
        ) : null}
        {!atCap && otherPresetCount > 0 ? (
          <p className="mt-1 text-xs text-slate-600">
            {t("otherPresetCount", { count: otherPresetCount })}
          </p>
        ) : null}
        {looks.length ? (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {looks.map((look) => {
              const selected =
                look.primaryColor === kit.primaryColor &&
                look.secondaryColor === kit.secondaryColor &&
                look.accentColor === kit.accentColor &&
                (look.designTreatment === undefined ||
                  look.designTreatment === currentTreatment);
              return (
                <li key={look.id} className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => setBrandKit(applySavedLook(look))}
                    className={`overflow-hidden rounded-lg border text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                      selected
                        ? "border-blue-700 ring-1 ring-blue-700"
                        : "border-slate-300"
                    }`}
                  >
                    <span className="flex h-12" aria-hidden="true">
                      <span
                        className="w-2/3"
                        style={{ backgroundColor: look.primaryColor }}
                      />
                      <span
                        className="w-1/3"
                        style={{
                          backgroundColor: look.secondaryColor,
                          borderLeft: `8px solid ${look.accentColor}`,
                        }}
                      />
                    </span>
                    <span className="block px-3 py-2 text-sm font-medium text-slate-900">
                      {look.name}
                    </span>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setBrandKit({
                        savedLooks: allLooks.filter((item) => item.id !== look.id),
                      })
                    }
                  >
                    {t("remove")}
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-slate-600">{t("empty")}</p>
        )}
        <p className="mt-3 text-xs text-slate-600">
          {t.rich("localPackHint", {
            link: (chunks) => (
              <Link
                href="/create/local-pack"
                className="font-semibold text-blue-800 underline underline-offset-2"
              >
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>
    </div>
  );
}
