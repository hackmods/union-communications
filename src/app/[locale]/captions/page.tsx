"use client";

import { useState } from "react";
import { CAPTION_TEMPLATES } from "@/lib/constants/captions";
import { copyToClipboard } from "@/lib/utils";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useTranslations } from "next-intl";

export default function CaptionsPage() {
  const t = useTranslations("common");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (id: string, text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-opseu-dark">Caption & Hashtag Library</h1>
      <p className="mt-2 text-gray-600">
        Reusable post templates with OPSEU-appropriate tone. Click copy and customize.
      </p>

      <div className="mt-8 space-y-4">
        {CAPTION_TEMPLATES.map((template) => {
          const fullText = `${template.caption}\n\n${template.hashtags.join(" ")}`;
          return (
            <Card key={template.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-medium uppercase text-opseu-blue">
                    {template.category}
                  </span>
                  <CardTitle className="mt-1">{template.title}</CardTitle>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopy(template.id, fullText)}
                >
                  {copiedId === template.id ? t("copied") : t("copy")}
                </Button>
              </div>
              <pre className="mt-3 whitespace-pre-wrap font-sans text-sm text-gray-700">
                {template.caption}
              </pre>
              <p className="mt-2 text-sm text-opseu-blue">
                {template.hashtags.join(" ")}
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
