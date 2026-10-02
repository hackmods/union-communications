"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useBrandStore } from "@/store/brand-store";
import { canPublishLocalBrand } from "@/lib/brand/local-brand-access";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import type { UserRole } from "@/types/tenant";

/**
 * Shows Local vs personal Brand Kit status and Save as Local default for officers.
 */
export function BrandKitLocalPublishPanel() {
  const t = useTranslations("brandKit.localSync");
  const { data: session, status } = useSession();
  const brandKit = useBrandStore((s) => s.brandKit);
  const publishLocalBrandKit = useBrandStore((s) => s.publishLocalBrandKit);
  const hasStoredBrandKit = useBrandStore((s) => s.hasStoredBrandKit);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<"ok" | "err" | null>(null);

  if (status !== "authenticated" || !session?.user) return null;

  const roles = (session.user.roles ?? []) as UserRole[];
  const canPublish = canPublishLocalBrand(roles);

  async function onPublish() {
    setBusy(true);
    setResult(null);
    try {
      const ok = await publishLocalBrandKit();
      setResult(ok ? "ok" : "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="text-base font-semibold text-gray-900">{t("title")}</h2>
      <p className="text-sm text-gray-600">
        {hasStoredBrandKit ? t("statusReady") : t("statusEmpty")}
      </p>
      <p className="text-sm text-gray-600">{t("personalHint")}</p>
      {canPublish ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={() => void onPublish()}
            disabled={busy}
          >
            {busy ? t("publishing") : t("publish")}
          </Button>
          <span className="text-xs text-gray-500">{t("publishHint")}</span>
        </div>
      ) : (
        <p className="text-sm text-gray-600">{t("stewardHint")}</p>
      )}
      {result === "ok" ? (
        <Callout tone="success">{t("publishSuccess")}</Callout>
      ) : null}
      {result === "err" ? (
        <Callout tone="warning">{t("publishError")}</Callout>
      ) : null}
      <p className="text-xs text-gray-500">
        {t("localLabel", {
          local: brandKit.local.localNumber || "—",
        })}
      </p>
    </div>
  );
}
