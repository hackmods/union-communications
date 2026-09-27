"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Input } from "@/components/ui/Input";

export function ForcePasswordResetForm({
  userId,
  archived,
}: {
  userId: string;
  archived: boolean;
}) {
  const t = useTranslations("hub.platformOperator");
  const [busy, setBusy] = useState(false);
  const [stepUpRequired, setStepUpRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(
        `/api/site-admin/users/${encodeURIComponent(userId)}/force-password-reset`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mfaCode ? { mfaCode } : {}),
        },
      );
      const result = (await response.json().catch(() => ({}))) as {
        code?: string;
        sent?: boolean;
      };
      if (!response.ok) {
        if (result.code === "mfa_step_up_required") {
          setStepUpRequired(true);
          setError(t("forceResetStepUpRequired"));
        } else if (result.code === "mfa_step_up_failed") {
          setStepUpRequired(true);
          setMfaCode("");
          setError(t("forceResetStepUpFailed"));
        } else if (result.code === "mfa_step_up_limited") {
          setStepUpRequired(true);
          setMfaCode("");
          setError(t("forceResetStepUpLimited"));
        } else if (
          result.code === "mfa_step_up_unavailable" ||
          result.code === "audit_unavailable"
        ) {
          setError(t("forceResetStepUpUnavailable"));
        } else if (result.code === "delivery_result_unconfirmed") {
          setMfaCode("");
          setStepUpRequired(false);
          setError(t("forceResetResultUnconfirmed"));
        } else if (result.code === "email_delivery_failed") {
          setMfaCode("");
          setStepUpRequired(false);
          setError(t("forceResetEmailFailed"));
        } else {
          setError(t("forceResetFailed"));
        }
        return;
      }
      setMfaCode("");
      setStepUpRequired(false);
      setSuccess(t("forceResetSent"));
    } catch {
      setError(t("forceResetFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="mt-6 space-y-3 rounded-md border border-opseu-gray/15 bg-white p-4"
    >
      <h2 className="font-semibold text-opseu-dark">
        {t("accountSupportForcePassword")}
      </h2>
      <p className="text-sm text-opseu-gray-dark">
        {t("forceResetBody")}
      </p>
      {error ? (
        <Callout tone="danger" role="alert" measure="fill">
          {error}
        </Callout>
      ) : null}
      {success ? (
        <Callout tone="brand" role="status" measure="fill">
          {success}
        </Callout>
      ) : null}
      {stepUpRequired ? (
        <Input
          label={t("forceResetMfaCode")}
          value={mfaCode}
          onChange={(event) => setMfaCode(event.target.value)}
          autoComplete="one-time-code"
          maxLength={32}
          autoFocus
          required
          disabled={archived || busy}
        />
      ) : null}
      <Button type="submit" disabled={archived || busy}>
        {busy ? t("forceResetSending") : t("accountSupportForcePassword")}
      </Button>
      {archived ? (
        <p className="text-xs text-opseu-gray-dark">
          {t("accountSupportCannotResetArchived")}
        </p>
      ) : null}
    </form>
  );
}
