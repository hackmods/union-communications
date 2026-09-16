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
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
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
        <Eyebrow tone="brand">{tc("title")}</Eyebrow>
        <h1 className={`${PUBLIC_PAGE_TITLE_CLASS} mt-2`}>{tc("title")}</h1>
        <p className="mt-4 max-w-prose text-base leading-relaxed text-slate-700">
          {tc("subtitle")}
        </p>
      </header>

      <ul className="mt-8 grid list-none gap-4 p-0 sm:gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
              className="min-w-0 scroll-mt-24"
            >
              <Card
                density="compact"
                className={cn(
                  "flex h-full min-w-0 flex-col gap-2 transition-colors",
                  highlighted &&
                    "border-opseu-blue bg-opseu-blue/[0.06] ring-2 ring-inset ring-opseu-blue",
                )}
              >
                <div className="flex items-start justify-between gap-3 sm:gap-4">
                  <div className="min-w-0">
                    <Eyebrow tone="brand" className="text-[0.65rem]">
                      {category}
                    </Eyebrow>
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
                <pre className="mt-1 max-w-prose whitespace-pre-wrap font-sans text-[0.875rem] leading-relaxed text-slate-700">
                  {caption}
                </pre>
                <p className="text-sm text-opseu-blue">
                  {template.hashtags.join(" ")}
                </p>
              </Card>
            </li>
          );
        })}
      </ul>

      <div className="mt-10 border-t border-slate-200 pt-6">
        {inDemo ? (
          <>
            <p className="max-w-prose text-sm text-slate-700">{td("done")}</p>
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
          <p className="text-slate-600" aria-busy="true">
            {t("loading")}
          </p>
        </PageShell>
      }
    >
      <CaptionsPageContent />
    </Suspense>
  );
}
