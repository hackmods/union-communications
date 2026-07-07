"use client";

import { useState } from "react";
import { copyToClipboard } from "@/lib/utils";
import { Card, CardTitle } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useTranslations } from "next-intl";

const CHECKLIST = [
  "Describe what is visually in the image (people, signs, setting)",
  "Include any text that appears in the graphic",
  "Mention the local number or union name if shown",
  "Keep it concise — 1-2 sentences is usually enough",
  "Do not start with 'Image of' or 'Photo of' — screen readers already announce it as an image",
];

export default function AltTextPage() {
  const t = useTranslations("common");
  const [caption, setCaption] = useState("");
  const [copied, setCopied] = useState(false);

  const altTextTemplate = caption
    ? `[Image description: Describe the visual content here — who is pictured, what is happening, any text visible in the graphic.]\n\n${caption}`
    : "[Image description: Describe the visual content here — who is pictured, what is happening, any text visible in the graphic.]\n\n[Your caption here]";

  const handleCopy = async () => {
    const ok = await copyToClipboard(altTextTemplate);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold text-opseu-dark">Alt-Text Assistant</h1>
      <p className="mt-2 text-gray-600">
        Paste your caption and get a template with a reminder to write image descriptions for visually impaired members.
      </p>

      <Card className="mt-8 space-y-4">
        <Textarea
          label="Your post caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={4}
          placeholder="Paste your social media caption here..."
        />

        <div>
          <CardTitle>Generated post with alt-text placeholder</CardTitle>
          <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
            {altTextTemplate}
          </pre>
        </div>

        <Button onClick={handleCopy}>
          {copied ? t("copied") : t("copy")}
        </Button>
      </Card>

      <Card className="mt-6">
        <CardTitle>Alt-text checklist</CardTitle>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-700">
          {CHECKLIST.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
