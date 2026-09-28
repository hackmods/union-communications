"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";
import { hubMfaSetupHref } from "@/lib/auth/mfa-return-path";
import { MfaRecoveryCodesPanel } from "@/components/hub/mfa/MfaRecoveryCodesPanel";
import { MfaHelpPanel } from "@/components/hub/mfa/MfaHelpPanel";
import { Callout } from "@/components/ui/Callout";

type MfaStatusPanelProps = {
  variant: "disabled" | "notRequired" | "verified";
  nextPath?: string | null;
  recoveryCodesRemaining?: number | null;
  newRecoveryCodes?: string[];
  onContinue: () => void;
  onRotate?: (code: string) => Promise<void>;
  rotating?: boolean;
  rotateError?: string | null;
};

/** Host-disabled / not-required / verified-manage status cards. */
export function MfaStatusPanel({
  variant,
  nextPath,
  recoveryCodesRemaining = null,
  newRecoveryCodes = [],
  onContinue,
  onRotate,
  rotating,
  rotateError,
}: MfaStatusPanelProps) {
  const t = useTranslations("hub.mfaJourney");
  const continueLabel = nextPath
    ? t("continueToWork")
    : t("backToDashboard");

  if (variant === "disabled") {
    return (
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-opseu-dark">
          {t("disabled.title")}
        </h2>
        <p className="text-gray-600">{t("disabled.body")}</p>
        <Button className="min-h-11" onClick={onContinue}>
          {continueLabel}
        </Button>
      </div>
    );
  }

  if (variant === "notRequired") {
    return (
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-opseu-dark">
          {t("notRequired.title")}
        </h2>
        <p className="text-gray-600">{t("notRequired.body")}</p>
        <Button className="min-h-11" onClick={onContinue}>
          {continueLabel}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Callout tone="success">
        <p className="font-semibold text-green-900">{t("manage.title")}</p>
        <p className="mt-1 text-green-900/90">{t("manage.successCheeky")}</p>
        <p className="mt-1 text-green-900/90">{t("manage.body")}</p>
      </Callout>
      <MfaRecoveryCodesPanel
        codes={newRecoveryCodes}
        remaining={recoveryCodesRemaining}
        requireAcknowledge={newRecoveryCodes.length > 0}
        onRotate={newRecoveryCodes.length === 0 ? onRotate : undefined}
        rotating={rotating}
        rotateError={rotateError}
      />
      <Button className="min-h-11 w-full" onClick={onContinue}>
        {continueLabel}
      </Button>
      <Link
        href={hubMfaSetupHref(nextPath, "replace")}
        className="block text-sm font-medium text-opseu-blue hover:underline"
      >
        {t("manage.replaceLink")}
      </Link>
      <MfaHelpPanel step="manage" />
    </div>
  );
}
