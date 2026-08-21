"use client";

import { useEffect } from "react";
import { useBrandStore } from "@/store/brand-store";
import { usePublicRosterStore } from "@/store/public-roster-store";
import { BRAND_COLORS } from "@/lib/constants/brand";
import { resolveBrandChromeTokens } from "@/lib/brand/chrome-tokens";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";
import { syncPwaBrandChrome } from "@/lib/pwa/brand-chrome";

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const hydrate = useBrandStore((s) => s.hydrate);
  const hydrateRoster = usePublicRosterStore((s) => s.hydrate);
  const hydrated = useBrandStore((s) => s.hydrated);
  const brandKit = useBrandStore((s) => s.brandKit);

  useEffect(() => {
    void hydrate();
    void hydrateRoster();
  }, [hydrate, hydrateRoster]);

  useEffect(() => {
    if (!hydrated) return;
    const primary = brandKit.primaryColor || BRAND_COLORS.primary;
    const secondary = brandKit.secondaryColor || BRAND_COLORS.secondary;
    const accent = brandKit.accentColor || BRAND_COLORS.accent;
    const chrome = resolveBrandChromeTokens(primary, accent);
    const root = document.documentElement;
    // Raw Brand Kit colours for canvas / export-adjacent CSS
    root.style.setProperty("--brand-primary", primary);
    root.style.setProperty("--brand-secondary", secondary);
    root.style.setProperty("--brand-accent", accent);
    // Readable UI chrome (nav, buttons, headings) — may differ from raw accent
    root.style.setProperty("--opseu-blue", chrome.interactive);
    root.style.setProperty("--opseu-dark", chrome.heading);
  }, [
    hydrated,
    brandKit.primaryColor,
    brandKit.secondaryColor,
    brandKit.accentColor,
  ]);

  useEffect(() => {
    if (!hydrated) return;
    const primary = brandKit.primaryColor || BRAND_COLORS.primary;
    const chrome = resolveBrandChromeTokens(
      primary,
      brandKit.accentColor || BRAND_COLORS.accent,
    );
    void syncPwaBrandChrome({
      primaryColor: chrome.interactive,
      officerHubPublic: isOfficerHubPublic(),
    }).catch(() => {
      // PWA chrome is best-effort (canvas / blob may fail in odd environments).
    });
  }, [hydrated, brandKit.primaryColor, brandKit.accentColor]);

  return <>{children}</>;
}
