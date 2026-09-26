"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useBrandStore } from "@/store/brand-store";
import { getUnionPreset } from "@/lib/constants/unionPresets";
import { applySavedLook, captureSavedLook, starterPaletteVariants } from "@/lib/brand/saved-looks";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function SavedLooksPanel() {
  const t = useTranslations("brandLooks");
  const kit = useBrandStore((s) => s.brandKit);
  const setBrandKit = useBrandStore((s) => s.setBrandKit);
  const [name, setName] = useState("");
  const preset = getUnionPreset(kit.unionPresetId ?? "");
  const looks = (kit.savedLooks ?? []).filter((look) => look.unionPresetId === kit.unionPresetId);
  const save = () => {
    if (!name.trim() || (kit.savedLooks?.length ?? 0) >= 12) return;
    const look = captureSavedLook(kit, crypto.randomUUID(), name);
    setBrandKit({ savedLooks: [...(kit.savedLooks ?? []), look] });
    setName("");
  };
  return (
    <div className="space-y-4">
      {preset && preset.id !== "opseu" ? (
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-800">{t("starters")}</p>
          <p className="mb-3 text-xs text-slate-600">{t("starterNote")}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {starterPaletteVariants(preset).map(({ id, colors }) => (
              <button key={id} type="button" onClick={() => setBrandKit({ ...colors, identityPackId: undefined, campaignPlate: undefined })}
                className="overflow-hidden rounded-lg border border-slate-300 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
                <span className="flex h-16" aria-hidden="true">
                  <span className="w-2/3" style={{ backgroundColor: colors.primaryColor }} />
                  <span className="w-1/3" style={{ backgroundColor: colors.secondaryColor, borderLeft: `8px solid ${colors.accentColor}` }} />
                </span>
                <span className="block px-3 py-2 text-sm font-medium">{t(id)}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div>
        <p className="mb-2 text-sm font-semibold text-slate-800">{t("saved")}</p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-48 flex-1"><Input label={t("name")} value={name} maxLength={60} onChange={(event) => setName(event.target.value)} /></div>
          <Button type="button" size="sm" onClick={save} disabled={!name.trim() || (kit.savedLooks?.length ?? 0) >= 12}>{t("save")}</Button>
        </div>
        {looks.length ? <ul className="mt-3 space-y-2">{looks.map((look) => (
          <li key={look.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-2">
            <button type="button" onClick={() => setBrandKit(applySavedLook(look))} className="min-h-10 rounded px-2 text-left font-medium text-blue-800 underline focus-visible:outline-2">{look.name}</button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setBrandKit({ savedLooks: (kit.savedLooks ?? []).filter((item) => item.id !== look.id) })}>{t("remove")}</Button>
          </li>
        ))}</ul> : <p className="mt-2 text-xs text-slate-600">{t("empty")}</p>}
      </div>
    </div>
  );
}
