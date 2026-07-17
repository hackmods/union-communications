"use client";

import { useTranslations } from "next-intl";
import { useBrandStore } from "@/store/brand-store";
import { applyBrandKitProfile } from "@/lib/utils/local-links";

/** Switch Brand Kit local identity between FT/PT (or other) saved profiles. */
export function BrandProfileSwitcher() {
  const t = useTranslations("brandKit");
  const brandKit = useBrandStore((s) => s.brandKit);
  const importBrandKit = useBrandStore((s) => s.importBrandKit);
  const profiles = brandKit.profiles ?? [];

  if (profiles.length === 0) return null;

  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-gray-700">
        {t("profileLabel")}
      </span>
      <select
        className="min-h-11 w-full rounded-md border border-gray-300 px-3 text-sm"
        value={brandKit.activeProfileId ?? ""}
        onChange={(e) => {
          const next = applyBrandKitProfile(brandKit, e.target.value);
          importBrandKit(next);
        }}
        aria-label={t("profileLabel")}
      >
        {profiles.map((profile) => (
          <option key={profile.id} value={profile.id}>
            {profile.label}
            {profile.bargainingUnitCode
              ? ` (${profile.bargainingUnitCode.toUpperCase()})`
              : ""}
          </option>
        ))}
      </select>
      <p className="text-xs text-gray-500">{t("profileHint")}</p>
    </label>
  );
}
