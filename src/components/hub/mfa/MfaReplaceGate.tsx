"use client";

import { useTranslations } from "next-intl";
import { Callout } from "@/components/ui/Callout";
import { Button } from "@/components/ui/Button";
import { MfaCodeField } from "@/components/hub/mfa/MfaCodeField";

type MfaReplaceGateProps = {
  code: string;
  onCodeChange: (value: string) => void;
  onConfirm: () => void;
  loading?: boolean;
  error?: string | null;
};

/** Warn + require current code before replacing the enrolled authenticator. */
export function MfaReplaceGate({
  code,
  onCodeChange,
  onConfirm,
  loading,
  error,
}: MfaReplaceGateProps) {
  const t = useTranslations("hub.mfaJourney");
  const tHub = useTranslations("hub");
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
          onConfirm();
        }}
      >
        <MfaCodeField
          label={t("replace.currentCodeLabel")}
          value={code}
          onChange={onCodeChange}
          disabled={loading}
        />
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={loading} className="min-h-11 w-full">
          {loading ? tHub("verifying") : t("replace.continue")}
        </Button>
      </form>
    </div>
  );
}
