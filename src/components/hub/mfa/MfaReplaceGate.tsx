"use client";

import { useTranslations } from "next-intl";
import { Callout } from "@/components/ui/Callout";
import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";
import { MfaCodeField } from "@/components/hub/mfa/MfaCodeField";

type MfaReplaceGateProps = {
  code: string;
  onCodeChange: (value: string) => void;
  onConfirm: (submittedCode?: string) => void;
  loading?: boolean;
  error?: string | null;
  retrySecondsRemaining?: number;
  cancelHref?: string;
};

/** Warn + require current code before replacing the enrolled authenticator. */
export function MfaReplaceGate({
  code,
  onCodeChange,
  onConfirm,
  loading,
  error,
  retrySecondsRemaining = 0,
  cancelHref,
}: MfaReplaceGateProps) {
  const t = useTranslations("hub.mfaJourney");
  const tHub = useTranslations("hub");
  const ready = /^\d{6}$/.test(code);
  return (
    <div className="space-y-4">
      <Callout tone="warning">
        <p className="font-semibold text-amber-950">{t("replace.warningTitle")}</p>
        <p className="mt-1 text-amber-950/90">{t("replace.warningBody")}</p>
      </Callout>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!loading && ready) onConfirm();
        }}
      >
        <MfaCodeField
          label={t("replace.currentCodeLabel")}
          value={code}
          onChange={onCodeChange}
          disabled={loading}
          autoFocus
          error={error}
          onTotpComplete={(submittedCode) => {
            if (!loading) onConfirm(submittedCode);
          }}
        />
        {retrySecondsRemaining > 0 ? (
          <p className="text-sm text-amber-800" role="status" aria-live="polite">
            {t("retryCountdown", {
              time: `${String(Math.floor(retrySecondsRemaining / 60)).padStart(2, "0")}:${String(retrySecondsRemaining % 60).padStart(2, "0")}`,
            })}
          </p>
        ) : null}
        <Button type="submit" disabled={loading || retrySecondsRemaining > 0 || !ready} className="min-h-11 w-full">
          {loading ? tHub("verifying") : t("replace.continue")}
        </Button>
      </form>
      {cancelHref ? (
        <Link
          href={cancelHref}
          className="block text-center text-sm font-medium text-opseu-blue hover:underline"
        >
          {t("replace.cancel")}
        </Link>
      ) : null}
    </div>
  );
}
