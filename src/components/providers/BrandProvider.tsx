"use client";

import { useEffect } from "react";
import { useBrandStore } from "@/store/brand-store";
import { BRAND_COLORS } from "@/lib/constants/brand";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";
import { syncPwaBrandChrome } from "@/lib/pwa/brand-chrome";

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const hydrate = useBrandStore((s) => s.hydrate);
  const hydrated = useBrandStore((s) => s.hydrated);
  const brandKit = useBrandStore((s) => s.brandKit);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    const primary = brandKit.primaryColor || BRAND_COLORS.primary;
    const secondary = brandKit.secondaryColor || BRAND_COLORS.secondary;
    const accent = brandKit.accentColor || BRAND_COLORS.accent;
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", primary);
    root.style.setProperty("--brand-secondary", secondary);
    root.style.setProperty("--brand-accent", accent);
    // Legacy chrome tokens (text-opseu-blue, bg-opseu-dark, focus rings) follow Brand Kit
    root.style.setProperty("--opseu-blue", primary);
    root.style.setProperty("--opseu-dark", accent);
  }, [brandKit.primaryColor, brandKit.secondaryColor, brandKit.accentColor]);

  useEffect(() => {
    if (!hydrated) return;
    const primary = brandKit.primaryColor || BRAND_COLORS.primary;
    void syncPwaBrandChrome({
      primaryColor: primary,
      officerHubPublic: isOfficerHubPublic(),
    }).catch(() => {
      // PWA chrome is best-effort (canvas / blob may fail in odd environments).
    });
  }, [hydrated, brandKit.primaryColor]);

  return <>{children}</>;
}
