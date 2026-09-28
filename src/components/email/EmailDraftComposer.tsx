"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { buildMailto } from "@/lib/email/adapters/mailto";
import { copyToClipboard, cn } from "@/lib/utils";

export type EmailDraftComposerLabels = {
  subjectLabel: string;
  bodyLabel: string;
  copySubject: string;
  copyBody: string;
  openMail: string;
  hint?: string;
  privacy?: string;
};

export type EmailDraftComposerProps = {
  subject: string;
  body: string;
  labels: EmailDraftComposerLabels;
  idPrefix?: string;
  className?: string;
  footer?: React.ReactNode;
  rows?: number;
};

/**
 * Shared steward draft UX: read-only subject/body, copy parts, mailto.
 * Does not send SMTP — ADR-016 copy-only lane.
 */
export function EmailDraftComposer({
  subject,
  body,
  labels,
  idPrefix = "email-draft",
  className,
  footer,
  rows = 12,
}: EmailDraftComposerProps) {
  const tc = useTranslations("common");
  const [copied, setCopied] = useState<"subject" | "body" | null>(null);

  async function copyEmailPart(part: "subject" | "body") {
    const ok = await copyToClipboard(part === "subject" ? subject : body);
    if (ok) {
      setCopied(part);
      window.setTimeout(() => setCopied(null), 1500);
    }
  }

  const mailto = buildMailto({ subject, body });

  return (
    <div className={cn("space-y-3", className)}>
      {labels.hint ? (
        <p className="text-sm text-gray-600">{labels.hint}</p>
      ) : null}

      <div className="space-y-1">
        <label
          htmlFor={`${idPrefix}-subject`}
          className="text-sm font-medium text-gray-700"
        >
          {labels.subjectLabel}
        </label>
        <Input
          id={`${idPrefix}-subject`}
          readOnly
          value={subject}
          onFocus={(e) => e.currentTarget.select()}
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor={`${idPrefix}-body`}
          className="text-sm font-medium text-gray-700"
        >
          {labels.bodyLabel}
        </label>
        <Textarea
          id={`${idPrefix}-body`}
          readOnly
          rows={rows}
          value={body}
          onFocus={(e) => e.currentTarget.select()}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => void copyEmailPart("subject")}
        >
          {copied === "subject" ? tc("copied") : labels.copySubject}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void copyEmailPart("body")}
        >
          {copied === "body" ? tc("copied") : labels.copyBody}
        </Button>
        <a
          href={mailto}
          className="inline-flex items-center justify-center rounded-lg border-2 border-opseu-blue px-4 py-2 text-base font-semibold text-opseu-blue transition-colors hover:bg-opseu-blue/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40"
        >
          {labels.openMail}
        </a>
      </div>

      {labels.privacy ? (
        <p className="text-xs text-gray-500">{labels.privacy}</p>
      ) : null}
      {footer}
    </div>
  );
}
