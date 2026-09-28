"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Input } from "@/components/ui/Input";

export function ResetMfaForm({
  userId,
  email,
  enrolled,
  archived,
}: {
  userId: string;
  email: string;
  enrolled: boolean;
  archived: boolean;
}) {
  const t = useTranslations("hub.platformOperator");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [stepUpRequired, setStepUpRequired] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
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
        `/api/site-admin/users/${encodeURIComponent(userId)}/reset-mfa`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            confirmEmail,
            ...(mfaCode ? { mfaCode } : {}),
          }),
        },
      );
      const result = (await response.json().catch(() => ({}))) as {
        code?: string;
      };
      if (!response.ok) {
        if (result.code === "mfa_step_up_required") {
          setStepUpRequired(true);
          setError(t("resetMfaStepUpRequired"));
        } else if (result.code === "mfa_step_up_failed") {
          setStepUpRequired(true);
          setMfaCode("");
          setError(t("resetMfaStepUpFailed"));
        } else if (result.code === "mfa_step_up_limited") {
          setStepUpRequired(true);
          setMfaCode("");
          setError(t("resetMfaStepUpLimited"));
        } else if (
          result.code === "mfa_step_up_unavailable" ||
          result.code === "audit_unavailable"
        ) {
          setError(t("resetMfaStepUpUnavailable"));
        } else if (result.code === "confirm_email_mismatch") {
          setError(t("resetMfaConfirmMismatch"));
        } else if (result.code === "not_enrolled") {
          setError(t("resetMfaNotEnrolled"));
        } else {
          setError(t("resetMfaFailed"));
        }
        return;
      }
      setMfaCode("");
      setConfirmEmail("");
      setStepUpRequired(false);
      setSuccess(t("resetMfaSuccess"));
      router.refresh();
    } catch {
      setError(t("resetMfaFailed"));
    } finally {
      setBusy(false);
    }
  }

  const disabled = archived || !enrolled || busy;

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="mt-6 space-y-3 rounded-md border border-opseu-gray/15 bg-white p-4"
    >
      <h2 className="font-semibold text-opseu-dark">{t("resetMfaTitle")}</h2>
      <p className="text-sm text-opseu-gray-dark">{t("resetMfaBody")}</p>
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
      {!enrolled && !archived ? (
        <p className="text-xs text-opseu-gray-dark">{t("resetMfaNotEnrolled")}</p>
      ) : null}
      <Input
        label={t("resetMfaConfirmEmail", { email })}
        value={confirmEmail}
        onChange={(event) => setConfirmEmail(event.target.value)}
        autoComplete="off"
        required
        disabled={disabled}
      />
      {stepUpRequired ? (
        <Input
          label={t("resetMfaCode")}
          value={mfaCode}
          onChange={(event) => setMfaCode(event.target.value)}
          autoComplete="one-time-code"
          maxLength={32}
          autoFocus
          required
          disabled={disabled}
        />
      ) : null}
      <Button type="submit" disabled={disabled}>
        {busy ? t("resetMfaSubmitting") : t("resetMfaSubmit")}
      </Button>
      {archived ? (
        <p className="text-xs text-opseu-gray-dark">
          {t("accountSupportCannotResetArchived")}
        </p>
      ) : null}
    </form>
  );
}
