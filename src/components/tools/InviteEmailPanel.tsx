"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
  const te = useTranslations("commsAutoSend");
  const locale = useLocale() as "en" | "fr";
  const inviteEmail = buildEventInviteEmail(fields, { locale, localNumber });
  const [autoSendAllowed, setAutoSendAllowed] = useState(false);
  const [trackingAllowed, setTrackingAllowed] = useState(false);
  const [to, setTo] = useState("");
  const [trackingOptIn, setTrackingOptIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/email/capabilities", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const data = (await response.json()) as {
          allowed?: { comms_auto_send?: boolean; tracking_pixels?: boolean };
        };
        if (!cancelled) {
          setAutoSendAllowed(data.allowed?.comms_auto_send === true);
          setTrackingAllowed(data.allowed?.tracking_pixels === true);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  async function sendSmtp() {
    setBusy(true);
    setFeedback("");
    try {
      const response = await fetch("/api/comms/invite-email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          locale,
          localNumber,
          fields,
          explicitTrackingOptIn: trackingOptIn,
        }),
        cache: "no-store",
      });
      const data = (await response.json()) as {
        error?: string;
        trackingApplied?: boolean;
      };
      if (!response.ok) throw new Error(data.error ?? te("error"));
      setFeedback(
        te("sent", {
          tracking: data.trackingApplied ? te("yes") : te("no"),
        }),
      );
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : te("error"));
    } finally {
      setBusy(false);
    }
  }

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
        footer={
          <>
            {autoSendAllowed ? (
              <div className="mt-4 space-y-2 border-t border-gray-100 pt-3">
                <p className="text-sm font-medium text-gray-800">
                  {te("title")}
                </p>
                <p className="text-xs text-gray-600">{te("hint")}</p>
                <Input
                  type="email"
                  label={te("to")}
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  autoComplete="email"
                />
                <label className="flex items-start gap-2 text-sm text-gray-800">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4"
                    checked={trackingOptIn}
                    disabled={!trackingAllowed}
                    onChange={(e) => setTrackingOptIn(e.target.checked)}
                  />
                  <span>
                    {te("trackingOptIn")}
                    {!trackingAllowed ? (
                      <span className="block text-xs text-gray-500">
                        {te("trackingUnavailable")}
                      </span>
                    ) : null}
                  </span>
                </label>
                <Button
                  type="button"
                  size="sm"
                  disabled={busy || !to.trim()}
                  onClick={() => void sendSmtp()}
                >
                  {te("send")}
                </Button>
                {feedback ? (
                  <p className="text-xs text-gray-700" role="status">
                    {feedback}
                  </p>
                ) : null}
              </div>
            ) : null}
            {footerExtra}
          </>
        }
      />
    </Card>
  );
}
