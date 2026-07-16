"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CAPTION_TEMPLATES } from "@/lib/constants/captions";
import { copyToClipboard, cn } from "@/lib/utils";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageShell } from "@/components/layout/PageShell";
import { useTranslations } from "next-intl";

function resolveCaptionId(searchParams: URLSearchParams): string | null {
  const id = searchParams.get("caption");
  if (!id) return null;
  return CAPTION_TEMPLATES.some((tpl) => tpl.id === id) ? id : null;
}

function CaptionsPageContent() {
  const t = useTranslations("common");
  const searchParams = useSearchParams();
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
    <PageShell size="read" className="py-8 md:py-12">
      <h1 className="text-2xl font-bold text-opseu-dark md:text-3xl">
        Caption & Hashtag Library
      </h1>
      <p className="mt-2 max-w-prose text-gray-600">
        Reusable post templates with a solidarity-first tone. Click copy and customize.
      </p>

      <div className="mt-6 space-y-3">
        {CAPTION_TEMPLATES.map((template) => {
          const fullText = `${template.caption}\n\n${template.hashtags.join(" ")}`;
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
                    {template.category}
                  </span>
                  <CardTitle className="mt-0.5 text-base">{template.title}</CardTitle>
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
                {template.caption}
              </pre>
              <p className="mt-1.5 text-sm text-opseu-blue">
                {template.hashtags.join(" ")}
              </p>
            </Card>
          );
        })}
      </div>
    </PageShell>
  );
}

export default function CaptionsPage() {
  return (
    <Suspense
      fallback={
        <PageShell size="read" className="py-8 md:py-12">
          <h1 className="text-2xl font-bold text-opseu-dark md:text-3xl">
            Caption & Hashtag Library
          </h1>
        </PageShell>
      }
    >
      <CaptionsPageContent />
    </Suspense>
  );
}
