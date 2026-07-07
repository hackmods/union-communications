"use client";

import { useEffect } from "react";
import { useBrandStore } from "@/store/brand-store";
import { CAAT_OPSEU_COLORS } from "@/lib/constants/brand";

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const hydrate = useBrandStore((s) => s.hydrate);
  const brandKit = useBrandStore((s) => s.brandKit);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--brand-primary",
      brandKit.primaryColor || CAAT_OPSEU_COLORS.primary,
    );
    document.documentElement.style.setProperty(
      "--brand-secondary",
      brandKit.secondaryColor || CAAT_OPSEU_COLORS.secondary,
    );
    document.documentElement.style.setProperty(
      "--brand-accent",
      brandKit.accentColor || CAAT_OPSEU_COLORS.accent,
    );
  }, [brandKit.primaryColor, brandKit.secondaryColor, brandKit.accentColor]);

  return <>{children}</>;
}
