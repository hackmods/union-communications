/**
 * CapRover App Config copy control — placeholders only, never live secrets.
 */
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { copyToClipboard, cn } from "@/lib/utils";

export function CapRoverConfigCopyButton({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const t = useTranslations("hub.platformOperator");
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    const ok = await copyToClipboard(text);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={() => void onCopy()}
      className={cn(
        "inline-flex items-center rounded border border-opseu-blue/30 bg-white px-3 py-1.5 text-xs font-semibold text-opseu-blue hover:bg-opseu-blue/5",
        className,
      )}
    >
      {copied ? t("hostCopyCaproverDone") : t("hostCopyCaprover")}
    </button>
  );
}
