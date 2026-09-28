"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Callout } from "@/components/ui/Callout";
import { Button } from "@/components/ui/Button";
import { MfaCodeField } from "@/components/hub/mfa/MfaCodeField";

type MfaRecoveryCodesPanelProps = {
  /** Fresh plaintext codes (one-time reveal). */
  codes?: string[];
  remaining?: number | null;
  /** Require acknowledge before continue (enroll success / rotate). */
  requireAcknowledge?: boolean;
  onContinue?: () => void;
  continueLabel?: string;
  /** Rotate form (manage view). */
  onRotate?: (code: string) => Promise<void>;
  rotating?: boolean;
  rotateError?: string | null;
};

function downloadCodes(codes: string[], filename: string) {
  const blob = new Blob([`${codes.join("\n")}\n`], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Recovery codes reveal, low-count warning, copy/download, and optional rotate. */
export function MfaRecoveryCodesPanel({
  codes = [],
  remaining = null,
  requireAcknowledge = false,
  onContinue,
  continueLabel,
  onRotate,
  rotating,
  rotateError,
}: MfaRecoveryCodesPanelProps) {
  const t = useTranslations("hub.mfaJourney.recovery");
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rotationCode, setRotationCode] = useState("");

  const low =
    remaining !== null && remaining <= 2
      ? remaining === 0
        ? "empty"
        : "low"
      : null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="space-y-3" aria-labelledby="mfa-recovery-heading">
      <h2 id="mfa-recovery-heading" className="font-semibold text-opseu-dark">
        {t("title")}
      </h2>
      {remaining !== null && codes.length === 0 ? (
        <p className="text-sm text-gray-600">
          {t("remaining", { count: remaining })}
        </p>
      ) : null}
      {low && codes.length === 0 ? (
        <Callout tone={low === "empty" ? "danger" : "warning"}>
          {low === "empty" ? t("emptyWarning") : t("lowWarning")}
        </Callout>
      ) : null}
      {codes.length > 0 ? (
        <>
          <Callout tone="warning">
            <p className="font-semibold text-amber-950">{t("saveOnceTitle")}</p>
            <p className="mt-1 text-amber-950/90">{t("saveOnce")}</p>
          </Callout>
          <ul
            className="grid grid-cols-1 gap-2 rounded-md bg-gray-50 p-3 font-mono text-sm sm:grid-cols-2"
            aria-label={t("title")}
          >
            {codes.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ul>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => void handleCopy()}
            >
              {copied ? t("copied") : t("copyAll")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() =>
                downloadCodes(codes, "unionops-recovery-codes.txt")
              }
            >
              {t("download")}
            </Button>
            {requireAcknowledge ? (
              <label className="flex min-h-11 items-center gap-2 text-sm text-gray-700 sm:ml-1">
                <input
                  type="checkbox"
                  checked={saved}
                  onChange={(e) => setSaved(e.target.checked)}
                  className="size-4 rounded border-gray-300"
                />
                {t("acknowledge")}
              </label>
            ) : null}
          </div>
          {onContinue ? (
            <Button
              className="min-h-11 w-full"
              disabled={requireAcknowledge && !saved}
              onClick={onContinue}
            >
              {continueLabel ?? t("continue")}
            </Button>
          ) : null}
        </>
      ) : null}
      {onRotate && codes.length === 0 ? (
        <form
          className="space-y-3 border-t border-gray-200 pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            void onRotate(rotationCode).then(() => setRotationCode(""));
          }}
        >
          <p className="text-sm text-gray-600">{t("rotateHint")}</p>
          <MfaCodeField
            label={t("rotateCodeLabel")}
            value={rotationCode}
            onChange={setRotationCode}
            disabled={rotating}
            autoFocus
          />
          {rotateError ? (
            <p className="text-sm text-red-600" role="alert">
              {rotateError}
            </p>
          ) : null}
          <Button
            type="submit"
            variant="outline"
            disabled={rotating}
            className="min-h-11 w-full"
          >
            {rotating ? t("regenerating") : t("regenerate")}
          </Button>
        </form>
      ) : null}
    </section>
  );
}
