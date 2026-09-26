"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Callout } from "@/components/ui/Callout";
import { Button } from "@/components/ui/Button";
import { useBrandStore } from "@/store/brand-store";
import type { UnionBrandTheme } from "@/lib/brand/union-brand-theme";

/**
 * When an officer is signed into the Hub, remind them that Hub collection
 * scope and Brand Kit collection profiles are separate layers (ADR-013).
 * Offers one-click Match to apply the Hub union's Comms preset + theme.
 */
export function BrandKitContextHint() {
  const { status } = useSession();
  const t = useTranslations("brandKit.contextHint");
  const brandKit = useBrandStore((s) => s.brandKit);
  const applyUnionPresetId = useBrandStore((s) => s.applyUnionPresetId);
  const applyBrandTheme = useBrandStore((s) => s.applyBrandTheme);
  const [hubPresetId, setHubPresetId] = useState<string | null>(null);
  const [hubTheme, setHubTheme] = useState<UnionBrandTheme | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    void fetch("/api/me/union-brand-preset")
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as {
          presetId?: string | null;
          theme?: UnionBrandTheme | null;
        };
        if (!cancelled) {
          setHubPresetId(data.presetId ?? null);
          setHubTheme(data.theme ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHubPresetId(null);
          setHubTheme(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  if (status !== "authenticated") return null;

  const showCollectionHint = (brandKit.profiles?.length ?? 0) >= 2;
  const themeDiffers =
    Boolean(hubTheme) &&
    (brandKit.primaryColor.toUpperCase() !== hubTheme!.primaryColor ||
      brandKit.secondaryColor.toUpperCase() !== hubTheme!.secondaryColor ||
      brandKit.accentColor.toUpperCase() !== hubTheme!.accentColor);
  const presetDiffers =
    Boolean(hubPresetId) && brandKit.unionPresetId !== hubPresetId;
  const showMatch = presetDiffers || themeDiffers;

  if (!showCollectionHint && !showMatch && !message && !error) return null;

  const onMatch = () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    let ok = true;
    if (hubPresetId) {
      ok = applyUnionPresetId(hubPresetId);
    }
    if (ok && hubTheme) {
      applyBrandTheme(hubTheme);
    }
    setBusy(false);
    if (ok || (!hubPresetId && hubTheme)) {
      setMessage(t("matchSuccess"));
    } else {
      setError(t("matchFailed"));
    }
  };

  const matchBodyKey =
    hubTheme && hubPresetId
      ? "matchBodyWithTheme"
      : hubTheme && !hubPresetId
        ? "matchBodyThemeOnly"
        : "matchBody";

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
          <p className="mt-1">{t(matchBodyKey)}</p>
          {hubTheme ? (
            <div
              className="mt-2 flex items-center gap-1.5"
              role="img"
              aria-label={t("matchThemePreview")}
            >
              {[
                hubTheme.primaryColor,
                hubTheme.secondaryColor,
                hubTheme.accentColor,
              ].map((c) => (
                <span
                  key={c}
                  className="inline-block h-4 w-4 rounded-sm border border-opseu-gray/30"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          ) : null}
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
      {message ? (
        <p className="mt-2 text-sm text-opseu-dark" aria-live="polite">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 text-sm text-red-800" role="alert">
          {error} {t("matchRemedy")}
        </p>
      ) : null}
    </Callout>
  );
}
