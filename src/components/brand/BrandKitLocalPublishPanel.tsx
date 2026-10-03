"use client";

import { useId, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useBrandStore } from "@/store/brand-store";
import { canPublishLocalBrand } from "@/lib/brand/local-brand-access";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Dialog } from "@/components/ui/Dialog";
import type { UserRole } from "@/types/tenant";

/**
 * Shows Local vs personal Brand Kit status and Save as Local default for officers.
 */
export function BrandKitLocalPublishPanel() {
  const t = useTranslations("brandKit.localSync");
  const titleId = useId();
  const { data: session, status } = useSession();
  const brandKit = useBrandStore((s) => s.brandKit);
  const publishLocalBrandKit = useBrandStore((s) => s.publishLocalBrandKit);
  const hasStoredBrandKit = useBrandStore((s) => s.hasStoredBrandKit);
  const syncSource = useBrandStore((s) => s.syncSource);
  const hydrated = useBrandStore((s) => s.hydrated);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<"ok" | "err" | null>(null);

  if (status === "loading" || !hydrated) {
    return (
      <div
        className="space-y-2 rounded-lg border border-gray-200 bg-white p-4"
        aria-busy="true"
      >
        <p className="text-sm text-gray-600">{t("loading")}</p>
      </div>
    );
  }

  if (status !== "authenticated" || !session?.user) return null;

  const roles = (session.user.roles ?? []) as UserRole[];
  const canPublish = canPublishLocalBrand(roles);
  const hasLocalId = Boolean(session.user.localId);
  const hasLocalShared = syncSource?.hasLocalShared ?? false;
  const hasPersonalOverlay = syncSource?.hasPersonalOverlay ?? false;

  async function onConfirmPublish() {
    setBusy(true);
    setResult(null);
    try {
      const ok = await publishLocalBrandKit();
      setResult(ok ? "ok" : "err");
      if (ok) setConfirmOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="space-y-3 rounded-lg border border-gray-200 bg-white p-4"
      aria-labelledby={titleId}
    >
      <h2 id={titleId} className="text-base font-semibold text-gray-900">
        {t("title")}
      </h2>
      {!hasLocalId ? (
        <Callout tone="warning">{t("noLocalAssigned")}</Callout>
      ) : (
        <>
          <p className="text-sm text-gray-600">
            {hasStoredBrandKit ? t("statusReady") : t("statusEmpty")}
          </p>
          <p className="text-sm text-gray-600">
            {hasLocalShared
              ? t("chromeFromLocal")
              : hasPersonalOverlay
                ? t("chromeFromPersonal")
                : t("chromeFromSeed")}
          </p>
          <p className="text-sm text-gray-600">
            {hasLocalShared ? t("localSharedReady") : t("localSharedMissing")}
            {hasPersonalOverlay ? ` ${t("personalOverridesOn")}` : ""}
          </p>
          <p className="text-sm text-gray-600">{t("personalHint")}</p>
          {canPublish ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                onClick={() => {
                  setResult(null);
                  setConfirmOpen(true);
                }}
                disabled={busy}
              >
                {t("publish")}
              </Button>
              <span className="text-xs text-gray-500">{t("publishHint")}</span>
            </div>
          ) : (
            <p className="text-sm text-gray-600">{t("stewardHint")}</p>
          )}
        </>
      )}
      {result === "ok" ? (
        <Callout tone="success">{t("publishSuccess")}</Callout>
      ) : null}
      {result === "err" ? (
        <Callout tone="warning">
          <p>{t("publishError")}</p>
          {canPublish && hasLocalId ? (
            <Button
              type="button"
              className="mt-2"
              onClick={() => setConfirmOpen(true)}
              disabled={busy}
            >
              {t("retryPublish")}
            </Button>
          ) : null}
        </Callout>
      ) : null}
      <p className="text-xs text-gray-500">
        {t("localLabel", {
          local: brandKit.local.localNumber || "—",
        })}
      </p>

      <Dialog
        open={confirmOpen}
        onClose={() => {
          if (!busy) setConfirmOpen(false);
        }}
        title={t("confirmTitle")}
        closeLabel={t("confirmCancel")}
      >
        <p className="text-sm text-gray-700">{t("confirmBody")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => void onConfirmPublish()}
            disabled={busy}
          >
            {busy ? t("publishing") : t("confirmPublish")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setConfirmOpen(false)}
            disabled={busy}
          >
            {t("confirmCancel")}
          </Button>
        </div>
      </Dialog>
    </section>
  );
}
