"use client";

import { useEffect } from "react";
import { useBrandStore } from "@/store/brand-store";
import { BRAND_COLORS } from "@/lib/constants/brand";

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const hydrate = useBrandStore((s) => s.hydrate);
  const brandKit = useBrandStore((s) => s.brandKit);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--brand-primary",
      brandKit.primaryColor || BRAND_COLORS.primary,
    );
    document.documentElement.style.setProperty(
      "--brand-secondary",
      brandKit.secondaryColor || BRAND_COLORS.secondary,
    );
    document.documentElement.style.setProperty(
      "--brand-accent",
      brandKit.accentColor || BRAND_COLORS.accent,
    );
  }, [brandKit.primaryColor, brandKit.secondaryColor, brandKit.accentColor]);

  return <>{children}</>;
}
