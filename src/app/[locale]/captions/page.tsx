"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CAPTION_TEMPLATES,
  formatCaptionBody,
  isCaptionTemplateId,
} from "@/lib/constants/captions";
import { copyToClipboard, cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { PageShell } from "@/components/layout/PageShell";
import { ComposedPageLayout } from "@/components/layout/ComposedPageLayout";
import { GuideActionRow } from "@/components/comms/GuideSection";
import { GuideCatalogCard } from "@/components/comms/GuideSurfaces";
import {
  guideCtaClassSm,
  guideCtaOutlineClassSm,
} from "@/components/comms/guideCtaClasses";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { WorkshopDemoPath } from "@/components/comms/WorkshopDemoPath";
import { useWorkshopDemoSession } from "@/hooks/use-workshop-demo-session";
import {
  PUBLIC_CARD_TITLE_CLASS,
  PUBLIC_PAGE_TITLE_CLASS,
} from "@/lib/constants/public-type";

function resolveCaptionId(searchParams: URLSearchParams): string | null {
  const id = searchParams.get("caption");
  if (!id || !isCaptionTemplateId(id)) return null;
  return id;
}

function CaptionsPageContent() {
  const t = useTranslations("common");
  const tc = useTranslations("captions");
  const nav = useTranslations("nav");
  const td = useTranslations("workshopDemo");
  const searchParams = useSearchParams();
  const inDemo = useWorkshopDemoSession(searchParams.get("demo"));
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const targetId = resolveCaptionId(searchParams);
  const [faded, setFaded] = useState(false);
  const [prevTarget, setPrevTarget] = useState(targetId);
  if (targetId !== prevTarget) {
    setPrevTarget(targetId);
    setFaded(false);
  }
  const highlightId = targetId && !faded ? targetId : null;

  const handleCopy = async (id: string, text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  useEffect(() => {
    if (!targetId) return;
    const el = document.getElementById(`caption-${targetId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const timer = window.setTimeout(() => setFaded(true), 2500);
    return () => window.clearTimeout(timer);
  }, [targetId]);

  return (
    <ComposedPageLayout composition="hub" size="wide" className="py-8 md:py-12">
      {inDemo ? (
        <WorkshopDemoPath variant="trail" className="mb-4" />
      ) : null}
      <header>
        <h1 className={PUBLIC_PAGE_TITLE_CLASS}>{tc("title")}</h1>
        <p className="mt-2 max-w-prose text-gray-600">{tc("subtitle")}</p>
      </header>

      <ul className="mt-6 grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {CAPTION_TEMPLATES.map((template) => {
          const category = tc(`templates.${template.id}.category`);
          const title = tc(`templates.${template.id}.title`);
          const caption = formatCaptionBody(
            template,
            tc(`templates.${template.id}.caption`),
          );
          const fullText = `${caption}\n\n${template.hashtags.join(" ")}`;
          const highlighted = highlightId === template.id;
          return (
            <li
              key={template.id}
              id={`caption-${template.id}`}
              className={cn(
                "min-w-0 scroll-mt-24 border-l-2 border-opseu-blue/30 bg-white pl-4 pr-1 py-1 transition-shadow sm:pl-5",
                highlighted &&
                  "rounded-r-lg bg-opseu-blue/[0.04] ring-2 ring-opseu-blue shadow-sm",
              )}
            >
              <div className="flex items-start justify-between gap-3 sm:gap-4">
                <div className="min-w-0">
                  <span className="text-xs font-medium uppercase tracking-wide text-opseu-blue">
                    {category}
                  </span>
                  <h2 className={cn(PUBLIC_CARD_TITLE_CLASS, "mt-0.5")}>
                    {title}
                  </h2>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="min-h-11 shrink-0"
                  onClick={() => handleCopy(template.id, fullText)}
                >
                  {copiedId === template.id ? t("copied") : t("copy")}
                </Button>
              </div>
              <pre className="mt-2 max-w-prose whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-700">
                {caption}
              </pre>
              <p className="mt-1.5 text-sm text-opseu-blue">
                {template.hashtags.join(" ")}
              </p>
            </li>
          );
        })}
      </ul>

      <div className="mt-10 border-t border-gray-200 pt-6">
        {inDemo ? (
          <>
            <p className="max-w-prose text-sm text-gray-600">{td("done")}</p>
            <GuideActionRow>
              <Link
                href="/guide/social-media-plan"
                className={guideCtaOutlineClassSm}
              >
                {td("openRoadmap")} →
              </Link>
            </GuideActionRow>
          </>
        ) : (
          <ul className="grid list-none gap-6 p-0 sm:grid-cols-2">
            <GuideCatalogCard
              title={tc("graphicMakerCta")}
              body={tc("graphicMakerHint")}
              action={
                <>
                  <Link
                    href="/tools/graphic-maker"
                    className={guideCtaClassSm}
                  >
                    {tc("graphicMakerCta")} →
                  </Link>
                  <Link
                    href="/guide/short-form"
                    className={guideCtaOutlineClassSm}
                  >
                    {nav("shortFormGuide")} →
                  </Link>
                </>
              }
            />
            <GuideCatalogCard
              title={tc("examplesLink")}
              body={tc("examplesPrompt")}
              action={
                <Link href="/examples" className={guideCtaOutlineClassSm}>
                  {tc("examplesLink")} →
                </Link>
              }
            />
          </ul>
        )}
      </div>
    </ComposedPageLayout>
  );
}

export default function CaptionsPage() {
  const t = useTranslations("common");
  return (
    <Suspense
      fallback={
        <PageShell className="py-8 md:py-12">
          <p className="text-gray-600" aria-busy="true">
            {t("loading")}
          </p>
        </PageShell>
      }
    >
      <CaptionsPageContent />
    </Suspense>
  );
}
