"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { copyToClipboard } from "@/lib/utils";
import { cn } from "@/lib/utils";

type SuggestionPanelProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

/** Right-hand live script / scorecard surface for steward guides. */
export function SuggestionPanel({
  title,
  children,
  className,
}: SuggestionPanelProps) {
  return (
    <Card density="compact" className={className}>
      <h2 className="text-sm font-semibold text-opseu-dark">{title}</h2>
      <div className="mt-3 space-y-3 text-sm text-gray-800">{children}</div>
    </Card>
  );
}

type ScriptBlockProps = {
  label: string;
  text: string;
  /** When true, omit Copy (e.g. empty placeholder). */
  hideCopy?: boolean;
};

export function ScriptBlock({ label, text, hideCopy }: ScriptBlockProps) {
  const tc = useTranslations("common");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const handleCopy = async () => {
    const payload = text.trim();
    if (!payload) return;
    setCopyError(null);
    const ok = await copyToClipboard(payload);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } else {
      setCopyError(tc("copyFailed"));
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {label}
        </p>
        {!hideCopy && text.trim() ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-11 shrink-0"
            onClick={() => void handleCopy()}
            aria-label={`${tc("copy")}: ${label}`}
          >
            {copied ? tc("copied") : tc("copy")}
          </Button>
        ) : null}
      </div>
      <pre
        className={cn(
          "mt-1.5 max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-lg border border-gray-200 bg-gray-50 p-3 font-sans text-sm leading-relaxed text-gray-800",
        )}
      >
        {text}
      </pre>
      {copyError ? (
        <p className="mt-1 text-xs text-red-700" role="status">
          {copyError}
        </p>
      ) : null}
    </div>
  );
}
