"use client";

import { useTranslations } from "next-intl";
import { BrandLookbook } from "@/components/brand/BrandLookbook";
import { BrandLookbookChromeStrips } from "@/components/brand/BrandLookbookChromeStrips";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ComposedPageLayout } from "@/components/layout/ComposedPageLayout";
import { TOOL_COMPOSITION } from "@/lib/constants/page-composition";
import { PUBLIC_PAGE_TITLE_CLASS } from "@/lib/constants/public-type";
import { useBrandStore } from "@/store/brand-store";

export default function BrandKitShowcasePage() {
  const t = useTranslations("brandKit.lookbook");
  const tKit = useTranslations("brandKit");
  const brandKit = useBrandStore((s) => s.brandKit);
  const hydrated = useBrandStore((s) => s.hydrated);

  return (
    <ComposedPageLayout
      composition={TOOL_COMPOSITION.editor.composition}
      size={TOOL_COMPOSITION.editor.shell}
      className="py-6 md:py-8"
    >
      <div className="flex flex-wrap items-center gap-3">
        <ButtonLink href="/brand-kit" variant="ghost" size="sm">
          ← {t("pageBack")}
        </ButtonLink>
      </div>
      <header className="mt-4 min-w-0">
        <h1 className={PUBLIC_PAGE_TITLE_CLASS}>{t("showcaseTitle")}</h1>
        <p className="mt-2 max-w-prose text-slate-600">
          {t("showcaseDescription")}
        </p>
      </header>
      <div className="mt-6">
        {!hydrated ? (
          <p role="status" className="text-sm text-slate-600">
            {tKit("completeness.loading")}
          </p>
        ) : (
          <BrandLookbook
            brandKit={brandKit}
            hydrated={hydrated}
            mode="full"
            showCommsStyleLink
            showHeader={false}
            idPrefix="public-lookbook"
            chromeStrips={<BrandLookbookChromeStrips />}
          />
        )}
      </div>
    </ComposedPageLayout>
  );
}
