"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import {
  buildEventInviteEmail,
  buildMailto,
  type EventEmailFields,
} from "@/lib/comms/event-email";
import { copyToClipboard } from "@/lib/utils";
import { cn } from "@/lib/utils";

type InviteEmailMessagesNamespace = "documentGenerator" | "boardNotice";

export interface InviteEmailPanelProps {
  fields: EventEmailFields;
  localNumber: string;
  messagesNamespace: InviteEmailMessagesNamespace;
  footerExtra?: React.ReactNode;
  className?: string;
}

export function InviteEmailPanel({
  fields,
  localNumber,
  messagesNamespace,
  footerExtra,
  className,
}: InviteEmailPanelProps) {
  const t = useTranslations(messagesNamespace);
  const tc = useTranslations("common");
  const locale = useLocale() as "en" | "fr";
  const [copied, setCopied] = useState<"subject" | "body" | null>(null);

  const inviteEmail = buildEventInviteEmail(fields, { locale, localNumber });

  async function copyEmailPart(part: "subject" | "body") {
    const ok = await copyToClipboard(
      part === "subject" ? inviteEmail.subject : inviteEmail.body,
    );
    if (ok) {
      setCopied(part);
      window.setTimeout(() => setCopied(null), 1500);
    }
  }

  return (
    <Card density="compact" className={cn("space-y-3", className)}>
      <div>
        <CardTitle className="text-base">{t("inviteEmail.title")}</CardTitle>
        <p className="mt-1 text-sm text-gray-600">{t("inviteEmail.hint")}</p>
      </div>

      <div className="space-y-1">
        <label
          htmlFor="invite-subject"
          className="text-sm font-medium text-gray-700"
        >
          {t("inviteEmail.subjectLabel")}
        </label>
        <Input
          id="invite-subject"
          readOnly
          value={inviteEmail.subject}
          onFocus={(e) => e.currentTarget.select()}
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="invite-body"
          className="text-sm font-medium text-gray-700"
        >
          {t("inviteEmail.bodyLabel")}
        </label>
        <Textarea
          id="invite-body"
          readOnly
          rows={12}
          value={inviteEmail.body}
          onFocus={(e) => e.currentTarget.select()}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => void copyEmailPart("subject")}
        >
          {copied === "subject"
            ? tc("copied")
            : t("inviteEmail.copySubject")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void copyEmailPart("body")}
        >
          {copied === "body" ? tc("copied") : t("inviteEmail.copyBody")}
        </Button>
        <a
          href={buildMailto(inviteEmail)}
          className="inline-flex items-center justify-center rounded-lg border-2 border-opseu-blue px-4 py-2 text-base font-semibold text-opseu-blue transition-colors hover:bg-opseu-blue/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40"
        >
          {t("inviteEmail.openMail")}
        </a>
      </div>

      <p className="text-xs text-gray-500">{t("inviteEmail.privacy")}</p>
      {footerExtra}
    </Card>
  );
}
