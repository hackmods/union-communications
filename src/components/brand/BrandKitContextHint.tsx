"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Callout } from "@/components/ui/Callout";
import { Button } from "@/components/ui/Button";
import { useBrandStore } from "@/store/brand-store";

/**
 * When an officer is signed into the Hub, remind them that Hub collection
 * scope and Brand Kit collection profiles are separate layers (ADR-013).
 * Offers one-click Match to apply the Hub union's Comms preset to public chrome.
 */
export function BrandKitContextHint() {
  const { status } = useSession();
  const t = useTranslations("brandKit.contextHint");
  const brandKit = useBrandStore((s) => s.brandKit);
  const applyUnionPresetId = useBrandStore((s) => s.applyUnionPresetId);
  const [hubPresetId, setHubPresetId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    void fetch("/api/me/union-brand-preset")
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { presetId?: string | null };
        if (!cancelled) setHubPresetId(data.presetId ?? null);
      })
      .catch(() => {
        if (!cancelled) setHubPresetId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  if (status !== "authenticated") return null;

  const showCollectionHint = (brandKit.profiles?.length ?? 0) >= 2;
  const showMatch =
    Boolean(hubPresetId) && brandKit.unionPresetId !== hubPresetId;

  if (!showCollectionHint && !showMatch && !message && !error) return null;

  const onMatch = () => {
    if (!hubPresetId) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    const ok = applyUnionPresetId(hubPresetId);
    setBusy(false);
    if (ok) {
      setMessage(t("matchSuccess"));
    } else {
      setError(t("matchFailed"));
    }
  };

  return (
    <Callout tone="brand" className="mt-6">
      {showCollectionHint ? (
        <>
          <p className="font-semibold text-opseu-dark">{t("title")}</p>
          <p className="mt-1">{t("body")}</p>
        </>
      ) : null}
      {showMatch ? (
        <div
          className={
            showCollectionHint
              ? "mt-3 border-t border-opseu-gray/20 pt-3"
              : undefined
          }
        >
          <p className="font-semibold text-opseu-dark">{t("matchTitle")}</p>
          <p className="mt-1">{t("matchBody")}</p>
          <Button
            type="button"
            size="sm"
            className="mt-2"
            disabled={busy}
            onClick={onMatch}
          >
            {busy ? t("matchBusy") : t("matchAction")}
          </Button>
        </div>
      ) : null}
      {message ? <p className="mt-2 text-sm text-opseu-dark">{message}</p> : null}
      {error ? (
        <p className="mt-2 text-sm text-red-800">
          {error} {t("matchRemedy")}
        </p>
      ) : null}
    </Callout>
  );
}
