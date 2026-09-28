"use client";

import { useLocale, useTranslations } from "next-intl";
import { Card, CardTitle } from "@/components/ui/Card";
import { EmailDraftComposer } from "@/components/email/EmailDraftComposer";
import {
  buildEventInviteEmail,
  type EventEmailFields,
} from "@/lib/comms/event-email";
import { cn } from "@/lib/utils";

type InviteEmailMessagesNamespace =
  | "documentGenerator"
  | "boardNotice"
  | "graphicMaker"
  | "flyerMaker";

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
  const locale = useLocale() as "en" | "fr";
  const inviteEmail = buildEventInviteEmail(fields, { locale, localNumber });

  return (
    <Card density="compact" className={cn(className)}>
      <CardTitle className="text-base">{t("inviteEmail.title")}</CardTitle>
      <EmailDraftComposer
        className="mt-3"
        subject={inviteEmail.subject}
        body={inviteEmail.body}
        labels={{
          subjectLabel: t("inviteEmail.subjectLabel"),
          bodyLabel: t("inviteEmail.bodyLabel"),
          copySubject: t("inviteEmail.copySubject"),
          copyBody: t("inviteEmail.copyBody"),
          openMail: t("inviteEmail.openMail"),
          hint: t("inviteEmail.hint"),
          privacy: t("inviteEmail.privacy"),
        }}
        footer={footerExtra}
      />
    </Card>
  );
}
