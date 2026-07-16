"use client";

import { useState } from "react";
import { copyToClipboard } from "@/lib/utils";
import { Card, CardTitle } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useTranslations } from "next-intl";
import {
  GRAPHIC_STARTER_IDS,
  PLATFORM_ALT_LIMITS,
  PLATFORM_IDS,
  analyzeAltText,
  countAltChars,
  exceedsLimit,
  type AltTextIssueId,
  type GraphicStarterId,
  type PlatformId,
} from "@/lib/alt-text/draft";
import { PageShell } from "@/components/layout/PageShell";

const CHECKLIST_IDS = [
  "visual",
  "onImageText",
  "localIdentity",
  "concise",
  "noImageOf",
] as const;

type ChecklistId = (typeof CHECKLIST_IDS)[number];

export default function AltTextPage() {
  const t = useTranslations("altTextAssistant");
  const tc = useTranslations("common");
  const [altText, setAltText] = useState("");
  const [caption, setCaption] = useState("");
  const [platform, setPlatform] = useState<PlatformId>("instagram");
  const [copied, setCopied] = useState<"alt" | "both" | null>(null);
  const [checked, setChecked] = useState<Record<ChecklistId, boolean>>({
    visual: false,
    onImageText: false,
    localIdentity: false,
    concise: false,
    noImageOf: false,
  });

  const limit = PLATFORM_ALT_LIMITS[platform];
  const charCount = countAltChars(altText);
  const overLimit = exceedsLimit(altText, limit);
  const analysis = analyzeAltText(altText, { caption });

  const applyStarter = (id: GraphicStarterId) => {
    setAltText(t(`starters.${id}.draft`));
  };

  const handleCopy = async (mode: "alt" | "both") => {
    const payload =
      mode === "alt"
        ? altText.trim()
        : `${altText.trim()}\n\n${caption.trim()}`.trim();
    if (!payload) return;
    const ok = await copyToClipboard(payload);
    if (ok) {
      setCopied(mode);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const toggleCheck = (id: ChecklistId) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <PageShell size="focus" className="py-6 md:py-8 lg:py-10">
      <h1 className="text-2xl font-bold text-opseu-dark md:text-3xl">
        {t("title")}
      </h1>
      <p className="mt-1 text-gray-600">{t("subtitle")}</p>

      <Card density="compact" className="mt-6 space-y-3">
        <div>
          <p className="mb-1.5 text-sm font-medium text-gray-700">
            {t("starterLabel")}
          </p>
          <div className="flex flex-wrap gap-2">
            {GRAPHIC_STARTER_IDS.map((id) => (
              <Button
                key={id}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyStarter(id)}
              >
                {t(`starters.${id}.label`)}
              </Button>
            ))}
          </div>
        </div>

        <Textarea
          label={t("altLabel")}
          value={altText}
          onChange={(e) => setAltText(e.target.value)}
          rows={4}
          placeholder={t("altPlaceholder")}
          aria-describedby="alt-char-count alt-feedback"
        />

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <span className="font-medium">{t("platformLabel")}</span>
            <select
              className="min-h-11 rounded-lg border border-gray-300 px-2 py-1.5 text-base focus:border-opseu-blue focus:ring-2 focus:ring-opseu-blue/20"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as PlatformId)}
            >
              {PLATFORM_IDS.map((id) => (
                <option key={id} value={id}>
                  {t(`platforms.${id}`)} ({PLATFORM_ALT_LIMITS[id]})
                </option>
              ))}
            </select>
          </label>
          <p
            id="alt-char-count"
            className={`text-sm ${overLimit ? "font-semibold text-red-700" : "text-gray-600"}`}
          >
            {t("charCount", { count: charCount, limit })}
          </p>
        </div>

        {analysis.issues.length > 0 && (
          <ul
            id="alt-feedback"
            className="list-disc space-y-1 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950"
            aria-live="polite"
          >
            {analysis.issues.map((issue: AltTextIssueId) => (
              <li key={issue}>{t(`issues.${issue}`)}</li>
            ))}
          </ul>
        )}
        {analysis.ok && altText.trim() && (
          <p
            id="alt-feedback"
            className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-900"
            aria-live="polite"
          >
            {t("draftLooksGood")}
          </p>
        )}

        <Textarea
          label={t("captionLabel")}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={2}
          placeholder={t("captionPlaceholder")}
        />
        <p className="text-xs text-gray-500">{t("captionHint")}</p>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => handleCopy("alt")}
            disabled={!altText.trim() || overLimit}
          >
            {copied === "alt" ? tc("copied") : t("copyAlt")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleCopy("both")}
            disabled={!altText.trim()}
          >
            {copied === "both" ? tc("copied") : t("copyBoth")}
          </Button>
        </div>
      </Card>

      <Card density="compact" className="mt-4">
        <CardTitle className="text-base">{t("howTitle")}</CardTitle>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-gray-700">
          <li>{t("how.step1")}</li>
          <li>{t("how.step2")}</li>
          <li>{t("how.step3")}</li>
          <li>{t("how.step4")}</li>
        </ol>
      </Card>

      <Card density="compact" className="mt-4">
        <CardTitle className="text-base">{t("checklistTitle")}</CardTitle>
        <ul className="mt-2 space-y-1.5">
          {CHECKLIST_IDS.map((id) => (
            <li key={id}>
              <label className="flex min-h-11 cursor-pointer items-start gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={checked[id]}
                  onChange={() => toggleCheck(id)}
                />
                <span>{t(`checklist.${id}`)}</span>
              </label>
            </li>
          ))}
        </ul>
      </Card>

      <Card density="compact" className="mt-4 space-y-3">
        <CardTitle className="text-base">{t("examplesTitle")}</CardTitle>
        <div>
          <p className="text-sm font-medium text-red-800">
            {t("examples.badLabel")}
          </p>
          <p className="mt-0.5 text-sm text-gray-700">{t("examples.bad")}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-green-800">
            {t("examples.goodLabel")}
          </p>
          <p className="mt-0.5 text-sm text-gray-700">{t("examples.good")}</p>
        </div>
      </Card>
    </PageShell>
  );
}
