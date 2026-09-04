"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Callout } from "@/components/ui/Callout";
import { useBrandStore } from "@/store/brand-store";

/**
 * When an officer is signed into the Hub, remind them that Hub collection
 * scope and Brand Kit collection profiles are separate layers (ADR-013).
 * Does not auto-sync — stewards choose the matching profile below.
 */
export function BrandKitContextHint() {
  const { status } = useSession();
  const t = useTranslations("brandKit.contextHint");
  const brandKit = useBrandStore((s) => s.brandKit);

  if (status !== "authenticated") return null;
  if ((brandKit.profiles?.length ?? 0) < 2) return null;

  return (
    <Callout tone="brand" className="mt-6">
      <p className="font-semibold text-opseu-dark">{t("title")}</p>
      <p className="mt-1">{t("body")}</p>
    </Callout>
  );
}
