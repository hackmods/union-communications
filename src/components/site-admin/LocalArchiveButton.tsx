"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Input } from "@/components/ui/Input";

type Props = {
  localId: string;
  archived: boolean;
};

/**
 * Client archive/restore so the browser does not navigate to a JSON API body.
 * The API asks for fresh MFA only when the active host policy requires it.
 */
export function LocalArchiveButton({ localId, archived }: Props) {
  const t = useTranslations("hub.platformOperator");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [stepUpRequired, setStepUpRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [resultUnconfirmed, setResultUnconfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAction(code?: string) {
    const action = archived ? "restore" : "archive";
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/site-admin/locals/${encodeURIComponent(localId)}/${action}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(code ? { mfaCode: code } : {}),
        },
      );
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
      };

      if (!response.ok) {
        if (result.code === "mfa_step_up_required") {
          setStepUpRequired(true);
          setError(t("localActionStepUpRequired"));
        } else if (result.code === "mfa_step_up_failed") {
          setStepUpRequired(true);
          setMfaCode("");
          setError(t("localActionStepUpFailed"));
        } else if (result.code === "mfa_step_up_limited") {
          setStepUpRequired(true);
          setMfaCode("");
          setError(t("localActionStepUpLimited"));
        } else if (
          result.code === "mfa_step_up_unavailable" ||
          result.code === "audit_unavailable"
        ) {
          setStepUpRequired(false);
          setMfaCode("");
          setError(t("localActionStepUpUnavailable"));
        } else if (
          result.code === "local_action_audit_unavailable" ||
          result.code === "local_action_outcome_unconfirmed"
        ) {
          setResultUnconfirmed(true);
          setStepUpRequired(false);
          setMfaCode("");
          setError(t("localActionResultUnconfirmed"));
        } else {
          setStepUpRequired(false);
          setMfaCode("");
          setError(
            result.error ??
              (archived ? t("localRestoreFailed") : t("localArchiveFailed")),
          );
        }
        return;
      }

      setMfaCode("");
      setStepUpRequired(false);
      router.refresh();
    } catch {
      // The server may have committed before the connection failed. Avoid a
      // blind repeat until the operator has refreshed and checked the status.
      setResultUnconfirmed(true);
      setStepUpRequired(false);
      setMfaCode("");
      setError(t("localActionResultUnconfirmed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="inline-flex max-w-xs flex-col items-end gap-2">
      {error ? (
        <Callout tone="danger" role="alert" className="p-2 text-xs">
          {error}
          {resultUnconfirmed ? (
            <div className="mt-2 text-right">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => window.location.reload()}
              >
                {t("localActionReload")}
              </Button>
            </div>
          ) : null}
        </Callout>
      ) : null}
      {stepUpRequired ? (
        <form
          className="flex w-full flex-col items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void runAction(mfaCode);
          }}
        >
          <Input
            label={t("localActionMfaCode")}
            value={mfaCode}
            onChange={(event) => setMfaCode(event.target.value)}
            autoComplete="one-time-code"
            maxLength={32}
            autoFocus
            required
            disabled={busy}
            className="min-h-9 px-2 py-1 text-sm"
          />
          <p className="text-right text-xs text-opseu-gray-dark">
            {t("localActionStepUpHelp")}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setMfaCode("");
                setStepUpRequired(false);
                setError(null);
              }}
            >
              {t("localActionCancelStepUp")}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={busy || !mfaCode.trim()}
            >
              {busy ? t("localArchiveSaving") : t("localActionConfirm")}
            </Button>
          </div>
        </form>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy || resultUnconfirmed}
          onClick={() => void runAction()}
        >
          {busy
            ? t("localArchiveSaving")
            : archived
              ? t("localRestore")
              : t("localArchive")}
        </Button>
      )}
    </div>
  );
}
