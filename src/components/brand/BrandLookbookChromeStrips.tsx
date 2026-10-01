"use client";

import { useTranslations } from "next-intl";

/**
 * Decorative Hub / Portal chrome mocks for the Brand Lookbook.
 * Not live nav — painted by BrandLookbookScope CSS variables only.
 */
export function BrandLookbookChromeStrips() {
  const t = useTranslations("brandKit.lookbook.chromeStrips");

  return (
    <div className="space-y-4" data-testid="brand-lookbook-chrome-strips">
      <p className="text-sm font-semibold text-opseu-dark">{t("title")}</p>
      <p className="text-sm text-slate-600">{t("intro")}</p>

      <div
        data-testid="brand-lookbook-hub-strip"
        aria-hidden="true"
        className="overflow-hidden rounded-lg border border-slate-200"
      >
        <div className="flex items-center gap-4 bg-white px-3 py-2">
          <span className="text-sm font-bold text-opseu-dark">
            {t("hubWordmark")}
          </span>
          <span className="text-sm font-medium text-opseu-blue">
            {t("hubLinkHome")}
          </span>
          <span className="text-sm text-slate-600">{t("hubLinkCases")}</span>
          <span className="ml-auto rounded-md bg-opseu-blue px-2.5 py-1 text-xs font-semibold text-white">
            {t("hubCta")}
          </span>
        </div>
      </div>

      <div
        data-testid="brand-lookbook-portal-strip"
        aria-hidden="true"
        className="overflow-hidden rounded-lg border border-slate-200"
      >
        <div className="flex items-center gap-4 bg-opseu-blue/5 px-3 py-2">
          <span className="text-sm font-bold text-opseu-dark">
            {t("portalWordmark")}
          </span>
          <span className="text-sm font-medium text-opseu-blue">
            {t("portalLinkTogether")}
          </span>
          <span className="text-sm text-slate-600">
            {t("portalLinkCircles")}
          </span>
        </div>
      </div>
    </div>
  );
}
