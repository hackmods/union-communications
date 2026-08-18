"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CAPTION_TEMPLATES,
  formatCaptionBody,
  isCaptionTemplateId,
} from "@/lib/constants/captions";
import { copyToClipboard, cn } from "@/lib/utils";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageShell } from "@/components/layout/PageShell";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { WorkshopDemoPath } from "@/components/comms/WorkshopDemoPath";
import { useWorkshopDemoSession } from "@/hooks/use-workshop-demo-session";

function resolveCaptionId(searchParams: URLSearchParams): string | null {
  const id = searchParams.get("caption");
  if (!id || !isCaptionTemplateId(id)) return null;
  return id;
}

function CaptionsPageContent() {
  const t = useTranslations("common");
  const tc = useTranslations("captions");
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
    <PageShell className="py-8 md:py-12">
      {inDemo ? (
        <WorkshopDemoPath variant="trail" className="mb-4" />
      ) : null}
      <h1 className="text-2xl font-bold tracking-tight text-opseu-dark md:text-3xl">
        {tc("title")}
      </h1>
      <p className="mt-2 max-w-prose text-gray-600">{tc("subtitle")}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
            <Card
              key={template.id}
              id={`caption-${template.id}`}
              density="compact"
              className={cn(
                "scroll-mt-24 transition-shadow",
                highlighted && "ring-2 ring-opseu-blue shadow-md",
              )}
            >
              <div className="flex items-start justify-between gap-3 sm:gap-4">
                <div className="min-w-0">
                  <span className="text-xs font-medium uppercase text-opseu-blue">
                    {category}
                  </span>
                  <CardTitle className="mt-0.5 text-base">{title}</CardTitle>
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
              <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-gray-700">
                {caption}
              </pre>
              <p className="mt-1.5 text-sm text-opseu-blue">
                {template.hashtags.join(" ")}
              </p>
            </Card>
          );
        })}
      </div>

      <div className="mt-10 max-w-prose border-t border-gray-200 pt-6">
        {inDemo ? (
          <>
            <p className="text-sm text-gray-600">{td("done")}</p>
            <p className="mt-3">
              <Link
                href="/guide/social-media-plan"
                className="text-sm font-medium text-opseu-blue underline-offset-2 hover:underline"
              >
                {td("openRoadmap")}
              </Link>
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-600">{tc("graphicMakerHint")}</p>
            <Link href="/tools/graphic-maker" className="mt-3 inline-block">
              <Button variant="outline">{tc("graphicMakerCta")}</Button>
            </Link>
          </>
        )}
      </div>
    </PageShell>
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
