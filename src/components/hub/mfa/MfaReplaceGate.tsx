"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Callout } from "@/components/ui/Callout";
import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";
import { looksLikeRecoveryCode, looksLikeTotpCode } from "@/lib/auth/mfa-client-codes";
import { MfaCodeField } from "@/components/hub/mfa/MfaCodeField";

type ReplacementProofKind = "totp" | "recovery";

type MfaReplaceGateProps = {
  onConfirm: (submittedCode: string, kind: ReplacementProofKind) => void;
  loading?: boolean;
  error?: string | null;
  retrySecondsRemaining?: number;
  cancelHref?: string;
};

/** Require a fresh factor before requesting a replacement QR. */
export function MfaReplaceGate({
  onConfirm,
  loading,
  error,
  retrySecondsRemaining = 0,
  cancelHref,
}: MfaReplaceGateProps) {
  const t = useTranslations("hub.mfaJourney");
  const tHub = useTranslations("hub");
  const [kind, setKind] = useState<ReplacementProofKind>("totp");
  const [code, setCode] = useState("");
  const ready = kind === "totp" ? looksLikeTotpCode(code) : looksLikeRecoveryCode(code);
  const choose = (nextKind: ReplacementProofKind) => {
    setKind(nextKind);
    setCode("");
  };

  return (
    <div className="space-y-4">
      <Callout tone="warning">
        <p className="font-semibold text-amber-950">{t("replace.warningTitle")}</p>
        <p className="mt-1 text-amber-950/90">{t("replace.warningBody")}</p>
      </Callout>
      <div className="space-y-2">
        <p id="mfa-replace-factor-label" className="text-sm font-medium text-gray-800">
          {t("replace.factorChoiceLabel")}
        </p>
        <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="mfa-replace-factor-label">
          <Button type="button" variant={kind === "totp" ? "primary" : "outline"} aria-pressed={kind === "totp"} onClick={() => choose("totp")} className="min-h-11">
            {t("replace.authenticatorChoice")}
          </Button>
          <Button type="button" variant={kind === "recovery" ? "primary" : "outline"} aria-pressed={kind === "recovery"} onClick={() => choose("recovery")} className="min-h-11">
            {t("replace.recoveryChoice")}
          </Button>
        </div>
      </div>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!loading && ready) onConfirm(code, kind);
        }}
      >
        <MfaCodeField
          label={kind === "totp" ? t("replace.currentCodeLabel") : t("replace.recoveryCodeLabel")}
          hint={kind === "totp" ? t("replace.authenticatorHint") : t("replace.recoveryHint")}
          value={code}
          onChange={setCode}
          allowRecovery={kind === "recovery"}
          autoComplete={kind === "totp" ? "one-time-code" : "off"}
          disabled={loading}
          autoFocus
          error={error}
          onTotpComplete={(submittedCode) => {
            if (kind === "totp" && !loading) onConfirm(submittedCode, "totp");
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
