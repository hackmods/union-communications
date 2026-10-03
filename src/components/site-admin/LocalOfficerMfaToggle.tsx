"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Props = {
  localId: string;
  mfaRequired: boolean;
  archived: boolean;
};

/**
 * Site Admin opt-in: require an authenticator for this Local's officers.
 * Default off so first Hub sessions are not blocked by MFA setup.
 */
export function LocalOfficerMfaToggle({
  localId,
  mfaRequired,
  archived,
}: Props) {
  const t = useTranslations("hub.platformOperator");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [stepUp, setStepUp] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function save(next: boolean, code?: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/site-admin/locals/${encodeURIComponent(localId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mfaRequired: next,
            ...(code ? { mfaCode: code } : {}),
          }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        if (data.code === "mfa_step_up_required") {
          setStepUp(true);
          setError(t("localActionStepUpRequired"));
        } else if (data.code === "mfa_step_up_failed") {
          setStepUp(true);
          setMfaCode("");
          setError(t("localActionStepUpFailed"));
        } else if (data.code === "mfa_step_up_limited") {
          setStepUp(true);
          setMfaCode("");
          setError(t("localActionStepUpLimited"));
        } else if (
          data.code === "mfa_step_up_unavailable" ||
          data.code === "audit_unavailable"
        ) {
          setStepUp(false);
          setMfaCode("");
          setError(t("localActionStepUpUnavailable"));
        } else {
          setError(data.error ?? t("localsOfficerMfaFailed"));
        }
        return;
      }
      setStepUp(false);
      setMfaCode("");
      router.refresh();
    } catch {
      setError(t("localsOfficerMfaFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-opseu-gray-dark">
        {mfaRequired ? t("localsOfficerMfaOn") : t("localsOfficerMfaOff")}
      </p>
      {stepUp ? (
        <div className="space-y-2">
          <Input
            label={t("localActionMfaCode")}
            value={mfaCode}
            onChange={(event) => setMfaCode(event.target.value)}
            autoComplete="one-time-code"
            maxLength={32}
            autoFocus
            disabled={busy || archived}
            className="min-h-11"
          />
          <p className="text-xs text-opseu-gray-dark">
            {t("localActionStepUpHelp")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="min-h-11"
              disabled={busy || archived || !mfaCode.trim()}
              onClick={() => void save(!mfaRequired, mfaCode)}
            >
              {t("localsOfficerMfaConfirm")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={busy}
              onClick={() => {
                setStepUp(false);
                setMfaCode("");
                setError(null);
              }}
            >
              {t("localActionCancel")}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={busy || archived}
          onClick={() => void save(!mfaRequired)}
        >
          {mfaRequired
            ? t("localsOfficerMfaTurnOff")
            : t("localsOfficerMfaTurnOn")}
        </Button>
      )}
      {error ? (
        <p className="text-xs text-red-700" role="status">
          {error}
        </p>
      ) : null}
    </div>
  );
}
