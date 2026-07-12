import hostBrandFile from "../../../config/host-brand.json";
import { PLATFORM_UNION_ORANGE } from "@/lib/constants/unionPresets";

/** Defaults applied when Brand Kit has never been saved (first visit / reset). */
export interface HostBrandDefaults {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  localNumber: string;
  subText: string;
  divisionId?: string;
}

const HEX = /^#[0-9A-Fa-f]{6}$/;

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function asHex(value: string | undefined, fallback: string): string {
  if (value && HEX.test(value)) return value.toUpperCase();
  return fallback;
}

/**
 * Resolve instance-wide Brand Kit defaults for self-hosting.
 * Precedence: `NEXT_PUBLIC_BRAND_*` / `NEXT_PUBLIC_DEFAULT_*` env → `config/host-brand.json` → platform orange.
 * OPSEU colours live in seed + union presets — not as the platform default.
 */
export function resolveHostBrandDefaults(
  file: Partial<HostBrandDefaults> = hostBrandFile as Partial<HostBrandDefaults>,
): HostBrandDefaults {
  const primary = asHex(
    readEnv("NEXT_PUBLIC_BRAND_PRIMARY") ?? file.primaryColor,
    PLATFORM_UNION_ORANGE.primary,
  );
  const secondary = asHex(
    readEnv("NEXT_PUBLIC_BRAND_SECONDARY") ?? file.secondaryColor,
    PLATFORM_UNION_ORANGE.secondary,
  );
  const accent = asHex(
    readEnv("NEXT_PUBLIC_BRAND_ACCENT") ?? file.accentColor,
    PLATFORM_UNION_ORANGE.accent,
  );

  const localNumber =
    readEnv("NEXT_PUBLIC_DEFAULT_LOCAL_NUMBER") ?? file.localNumber ?? "";
  const subText =
    readEnv("NEXT_PUBLIC_DEFAULT_SUB_TEXT") ?? file.subText ?? "Support Staff";
  const divisionId =
    readEnv("NEXT_PUBLIC_DEFAULT_DIVISION_ID") ?? file.divisionId;

  return {
    primaryColor: primary,
    secondaryColor: secondary,
    accentColor: accent,
    localNumber,
    subText,
    ...(divisionId ? { divisionId } : {}),
  };
}
