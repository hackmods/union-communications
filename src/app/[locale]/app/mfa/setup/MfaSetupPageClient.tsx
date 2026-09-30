"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Link, useRouter } from "@/i18n/navigation";
import {
  MfaCodeField,
  MfaHelpPanel,
  MfaJourneyShell,
  MfaRecoveryCodesPanel,
  MfaReplaceGate,
  MfaSetupSteps,
} from "@/components/hub/mfa";
import {
  classifySubmittedMfaCode,
  looksLikeTotpCode,
  officerMfaErrorMessage,
} from "@/lib/auth/mfa-client-codes";
import {
  hubMfaChallengeHref,
  safeMfaReturnPath,
} from "@/lib/auth/mfa-return-path";

type EnrollState =
  | "loadingStatus"
  | "replaceGate"
  | "idle"
  | "loading"
  | "ready"
  | "confirming"
  | "done";

export function MfaSetupPageClient() {
  const t = useTranslations("hub");
  const tJourney = useTranslations("hub.mfaJourney");
  const tErrors = useTranslations("hub.mfaJourney.errors");
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(
    () => safeMfaReturnPath(searchParams.get("next")),
    [searchParams],
  );
  const replaceMode = searchParams.get("mode") === "replace";

  const [state, setState] = useState<EnrollState>("loadingStatus");
  const [secret, setSecret] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [replaceCode, setReplaceCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);
  const [replaceSubmitting, setReplaceSubmitting] = useState(false);
  const [sessionVerified, setSessionVerified] = useState(false);

  const mapApiError = (code: unknown, fallback: string) =>
    officerMfaErrorMessage(code, (key) => tErrors(key), fallback);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/app/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    void fetch("/api/mfa/status")
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (data: { enrolled?: boolean; mode?: string | null } | null) => {
          if (cancelled) return;
          if (data?.mode && data.mode !== "totp") {
            router.replace(hubMfaChallengeHref(nextPath));
            return;
          }
          if (data?.enrolled && !replaceMode) {
            router.replace(hubMfaChallengeHref(nextPath));
            return;
          }
          setState(data?.enrolled && replaceMode ? "replaceGate" : "idle");
        },
      )
      .catch(() => {
        if (!cancelled) setState("idle");
      });
    return () => {
      cancelled = true;
    };
  }, [status, replaceMode, nextPath, router]);

  if (status === "loading" || !session?.user || state === "loadingStatus") {
    return (
      <PageShell size="nestedAuth" className="py-4 md:py-6">
        <p className="text-gray-600" aria-live="polite">
          {t("sessionLoading")}
        </p>
      </PageShell>
    );
  }

  const startEnroll = async (currentCode?: string) => {
    const replacing = Boolean(currentCode) || replaceMode;
    if (replacing && !looksLikeTotpCode(currentCode ?? "")) {
      setError(mapApiError("empty", t("mfaSetupError")));
      return;
    }
    if (replacing && state === "replaceGate") {
      setReplaceSubmitting(true);
    } else {
      setState("loading");
    }
    setError(null);
    try {
      const res = await fetch("/api/mfa/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentCode ? { code: currentCode } : {}),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          code?: string;
          requiresCurrentCode?: boolean;
        };
        setError(mapApiError(body.code, t("mfaSetupError")));
        setState(body.requiresCurrentCode || replaceMode ? "replaceGate" : "idle");
        return;
      }
      const body = (await res.json()) as {
        secret: string;
        otpauthUri: string;
      };
      setSecret(body.secret);
      const QRCode = (await import("qrcode")).default;
      const dataUrl = await QRCode.toDataURL(body.otpauthUri, {
        margin: 1,
        width: 220,
      });
      setQrDataUrl(dataUrl);
      setCode("");
      setState("ready");
    } catch {
      setError(t("mfaSetupError"));
      setState(replaceMode ? "replaceGate" : "idle");
    } finally {
      setReplaceSubmitting(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    const kind = classifySubmittedMfaCode(code);
    if (kind !== "totp") {
      setError(mapApiError(kind === "empty" ? "empty" : "invalid", t("mfaSetupError")));
      return;
    }
    setState("confirming");
    setError(null);

    const res = await fetch("/api/mfa/enroll/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
      };
      setError(mapApiError(body.code, t("mfaSetupError")));
      setState("ready");
      return;
    }

    const body = (await res.json()) as {
      recoveryCodes?: string[];
      mfaGrant?: string;
      mfaGrantIssued?: boolean;
    };
    let verified = false;
    if (body.mfaGrant) {
      const nextSession = await update({ mfaGrant: body.mfaGrant });
      verified = Boolean(nextSession?.user?.mfaVerified);
    }
    setSessionVerified(verified);
    setRecoveryCodes(body.recoveryCodes ?? []);
    setState("done");
  };

  if (state === "done") {
    return (
      <MfaJourneyShell
        title={t("mfaSetupSuccess")}
        subtitle={t("mfaSetupSuccessDesc")}
      >
        <MfaRecoveryCodesPanel
          codes={recoveryCodes}
          requireAcknowledge
          continueLabel={tJourney("continueToWork")}
          onContinue={() =>
            router.push(
              sessionVerified
                ? (nextPath ?? "/app")
                : hubMfaChallengeHref(nextPath),
            )
          }
        />
        {sessionVerified ? (
          <p className="text-sm text-gray-600">{tErrors("nextCodeHint")}</p>
        ) : (
          <Callout tone="warning" role="alert">
            <p>{tErrors("session_not_verified")}</p>
            <Link
              href={hubMfaChallengeHref(nextPath)}
              className="mt-2 inline-block font-medium text-opseu-blue underline underline-offset-2"
            >
              {tErrors("challengeCta")}
            </Link>
          </Callout>
        )}
      </MfaJourneyShell>
    );
  }

  const contextKey = replaceMode ? "replace" : "enroll";

  return (
    <MfaJourneyShell
      title={tJourney(`context.${contextKey}.title`)}
      subtitle={tJourney(`context.${contextKey}.subtitle`)}
      steps={state === "idle" || state === "replaceGate" ? <MfaSetupSteps /> : null}
      help={
        <MfaHelpPanel step={replaceMode ? "replace" : "setup"} />
      }
    >
      {state === "replaceGate" ? (
        <MfaReplaceGate
          code={replaceCode}
          onCodeChange={setReplaceCode}
          loading={replaceSubmitting}
          error={error}
          cancelHref={hubMfaChallengeHref(nextPath)}
          onConfirm={() => void startEnroll(replaceCode)}
        />
      ) : null}

      {state === "idle" ? (
        <div className="space-y-3">
          <Button
            className="min-h-11 w-full"
            onClick={() => void startEnroll()}
          >
            {t("mfaSetupGenerate")}
          </Button>
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}

      {state === "loading" ? (
        <p className="text-gray-600" aria-live="polite">
          {t("verifying")}
        </p>
      ) : null}

      {state === "ready" || state === "confirming" ? (
        <div className="space-y-4">
          {qrDataUrl ? (
            <div className="flex flex-col items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- data: URL, no next/image benefit */}
              <img
                src={qrDataUrl}
                alt={t("mfaSetupQrAlt")}
                width={220}
                height={220}
                className="rounded-lg border border-gray-200"
              />
              <p className="text-center text-sm text-gray-600">
                {t("mfaSetupScanHint")}
              </p>
            </div>
          ) : null}
          {secret ? (
            <details
              open={manualOpen}
              className="rounded-lg border border-gray-200 bg-gray-50/60 open:bg-white"
            >
              <summary
                className="cursor-pointer list-none px-3 py-2.5 text-sm font-semibold text-opseu-dark marker:content-none [&::-webkit-details-marker]:hidden"
                onClick={(e) => {
                  e.preventDefault();
                  setManualOpen((o) => !o);
                }}
              >
                {tJourney("cantScan")}
              </summary>
              <div className="space-y-2 border-t border-gray-100 px-3 pb-3 pt-2">
                <p className="text-xs text-gray-500">
                  {tJourney("manualSecretHint")}
                </p>
                <p className="break-all rounded-md bg-gray-50 px-3 py-2 font-mono text-sm text-opseu-dark">
                  {secret}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 w-full"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(secret)
                      .then(() => setSecretCopied(true))
                      .catch(() => setSecretCopied(false));
                  }}
                >
                  {secretCopied
                    ? tJourney("manualSecretCopied")
                    : tJourney("manualSecretCopy")}
                </Button>
              </div>
            </details>
          ) : null}
          <form
            id="mfa-setup-confirm-form"
            onSubmit={handleConfirm}
            className="space-y-3"
          >
            <MfaCodeField
              label={t("mfaSetupCodeLabel")}
              value={code}
              onChange={setCode}
              disabled={state === "confirming"}
              autoFocus
              onTotpComplete={() => {
                if (state === "ready") {
                  const form = document.getElementById(
                    "mfa-setup-confirm-form",
                  ) as HTMLFormElement | null;
                  form?.requestSubmit();
                }
              }}
            />
            {error ? (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              disabled={state === "confirming" || !looksLikeTotpCode(code)}
              className="min-h-11 w-full"
            >
              {state === "confirming" ? t("verifying") : t("mfaSetupConfirm")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full"
              onClick={() =>
                void startEnroll(replaceMode ? replaceCode : undefined)
              }
            >
              {t("mfaSetupRegenerate")}
            </Button>
          </form>
        </div>
      ) : null}
    </MfaJourneyShell>
  );
}
