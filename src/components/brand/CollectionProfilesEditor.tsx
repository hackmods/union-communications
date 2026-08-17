"use client";

import { useTranslations } from "next-intl";
import { useBrandStore } from "@/store/brand-store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  addBrandKitProfile,
  collectionPresetHintKey,
  hasStarterCollectionList,
  removeBrandKitProfile,
  renameBrandKitProfile,
  PROFILE_OTHER_ID,
} from "@/lib/brand/collection-profiles";
import { applyBrandKitProfile } from "@/lib/utils/local-links";

type CollectionProfilesEditorProps = {
  /** Compact spacing for onboarding step 1 */
  compact?: boolean;
};

/** Switch, add, and rename Brand Kit collection identities. */
export function CollectionProfilesEditor({
  compact = false,
}: CollectionProfilesEditorProps) {
  const t = useTranslations("brandKit");
  const brandKit = useBrandStore((s) => s.brandKit);
  const importBrandKit = useBrandStore((s) => s.importBrandKit);
  const setBrandKit = useBrandStore((s) => s.setBrandKit);
  const profiles = brandKit.profiles ?? [];
  const activeId = brandKit.activeProfileId ?? profiles[0]?.id ?? "";
  const active = profiles.find((profile) => profile.id === activeId);
  const multi = profiles.length > 1;
  const presetHintKey = collectionPresetHintKey(
    brandKit.unionPresetId,
    brandKit.opseuSectorId,
    brandKit.profiles,
  );
  const showStarterNote = hasStarterCollectionList(brandKit.unionPresetId);

  if (profiles.length === 0) return null;

  const OPSEU_SECTOR_HINT_KEYS = new Set([
    "opseu-caat-support",
    "opseu-caat-academic",
    "opseu-ops",
    "opseu-corrections",
    "opseu-hospital-professionals",
    "opseu-hospital-support",
    "opseu-lcbo",
    "opseu-municipalities",
    "opseu-long-term-care",
  ]);

  const profileHint = presetHintKey
    ? t(
        `profilePresetHint.${
          OPSEU_SECTOR_HINT_KEYS.has(presetHintKey)
            ? presetHintKey
            : presetHintKey.startsWith("opseu-")
              ? "opseu-generic"
              : presetHintKey
        }` as "profilePresetHint.cupe",
      )
    : multi
      ? t("profileHint")
      : t("profileSingleHint");

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {showStarterNote && multi ? (
        <p className="text-sm text-gray-600">{t("profileStarterNote")}</p>
      ) : null}

      {multi ? (
        <label className="block space-y-1">
          <span className="text-sm font-medium text-gray-700">
            {t("profileLabel")}
          </span>
          <select
            className="min-h-11 w-full rounded-md border border-gray-300 px-3 text-sm"
            value={activeId}
            onChange={(e) => {
              importBrandKit(applyBrandKitProfile(brandKit, e.target.value));
            }}
            aria-label={t("profileLabel")}
          >
            {profiles.map((profile, index) => (
              <option key={profile.id} value={profile.id}>
                {profile.label.trim() ||
                  t("profileAddedLabel", { n: index + 1 })}
                {profile.bargainingUnitCode
                  ? ` (${profile.bargainingUnitCode.toUpperCase()})`
                  : ""}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500">{profileHint}</p>
        </label>
      ) : (
        <p className="text-xs text-gray-500">{profileHint}</p>
      )}

      <Input
        label={t("profileName")}
        value={active?.label ?? ""}
        onChange={(e) => {
          if (!active) return;
          importBrandKit(
            renameBrandKitProfile(brandKit, active.id, e.target.value),
          );
        }}
      />
      {active?.id === PROFILE_OTHER_ID ? (
        <p className="text-xs text-gray-500">{t("profileOtherHint")}</p>
      ) : null}

      <div className="space-y-1">
        <Input
          label={t("profileCode")}
          value={brandKit.local.bargainingUnitCode ?? ""}
          onChange={(e) =>
            setBrandKit({
              local: {
                ...brandKit.local,
                bargainingUnitCode: e.target.value,
              },
            })
          }
        />
        <p className="text-xs text-gray-500">{t("profileCodeHint")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const nextIndex = profiles.length + 1;
            importBrandKit(
              addBrandKitProfile(
                brandKit,
                t("profileAddedLabel", { n: nextIndex }),
              ),
            );
          }}
        >
          {t("profileAdd")}
        </Button>
        {multi ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              if (!active) return;
              importBrandKit(removeBrandKitProfile(brandKit, active.id));
            }}
          >
            {t("profileRemove")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
