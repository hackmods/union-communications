"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  useMfaRetryCountdown,
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
  | "statusUnavailable"
  | "statusExpired"
  | "replaceGate"
  | "idle"
  | "loading"
  | "ready"
  | "confirming"
  | "done";

function formatRetryTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

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
  const [pendingExpiresAt, setPendingExpiresAt] = useState<number | null>(null);
  const [clockNow, setClockNow] = useState(() => Date.now());
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [statusRequestId, setStatusRequestId] = useState<string | null>(null);
  const retryCountdown = useMfaRetryCountdown();
  const [confirmCanContinueToChallenge, setConfirmCanContinueToChallenge] =
    useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);
  const [replaceSubmitting, setReplaceSubmitting] = useState(false);
  const [sessionVerified, setSessionVerified] = useState(false);
  /** Sync lock — auto-submit + Enter can race past React `confirming` state. */
  const confirmLockRef = useRef(false);
  const startEnrollLockRef = useRef(false);
  const enrollmentConfirmedRef = useRef(false);

  const mapApiError = (code: unknown, fallback: string) =>
    officerMfaErrorMessage(code, (key) => tErrors(key), fallback);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/app/login");
    }
  }, [status, router]);

  const loadSetupStatus = useCallback(async () => {
    // Auth.js update() transitions through loading/authenticated. After a
    // successful confirmation, a new status read would redirect an enrolled
    // user away from their one-time recovery codes before they can save them.
    if (enrollmentConfirmedRef.current) return;
    setState("loadingStatus");
    setStatusRequestId(null);
    try {
      const response = await fetch("/api/mfa/status", { cache: "no-store" });
      if (response.status === 401) {
        setState("statusExpired");
        return;
      }
      const data = await response.json().catch(() => null) as
        | { enabled?: boolean; enrolled?: boolean; mode?: string | null; requestId?: string }
        | null;
      if (
        !response.ok ||
        !data ||
        typeof data.enabled !== "boolean" ||
        typeof data.enrolled !== "boolean" ||
        !(data.mode === null || typeof data.mode === "string")
      ) {
        setStatusRequestId(data?.requestId ?? response.headers.get("X-Request-ID"));
        setState("statusUnavailable");
        return;
      }
      if (data.mode && data.mode !== "totp") {
        router.replace(hubMfaChallengeHref(nextPath));
        return;
      }
      if (data.enrolled && !replaceMode) {
        router.replace(hubMfaChallengeHref(nextPath));
        return;
      }
      setState(data.enrolled && replaceMode ? "replaceGate" : "idle");
    } catch {
      setState("statusUnavailable");
    }
  }, [nextPath, replaceMode, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    void Promise.resolve().then(loadSetupStatus);
  }, [status, loadSetupStatus]);

  useEffect(() => {
    if (pendingExpiresAt === null || (state !== "ready" && state !== "confirming")) return;
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [pendingExpiresAt, state]);

  const pendingSecondsRemaining = pendingExpiresAt === null
    ? null
    : Math.max(0, Math.ceil((pendingExpiresAt - clockNow) / 1000));
  const pendingExpired = pendingSecondsRemaining === 0;

  if ((status === "loading" && state !== "done") || !session?.user || state === "loadingStatus") {
    return (
      <PageShell size="nestedAuth" className="py-4 md:py-6">
        <p className="text-gray-600" aria-live="polite">
          {t("sessionLoading")}
        </p>
      </PageShell>
    );
  }

  if (state === "statusExpired") {
    return (
      <MfaJourneyShell title={tJourney("statusExpired.title")}>
        <p className="text-sm text-gray-700">{tJourney("statusExpired.body")}</p>
        <Link href="/app/login" className="mt-3 inline-block font-medium text-opseu-blue underline">
          {tJourney("statusExpired.cta")}
        </Link>
      </MfaJourneyShell>
    );
  }

  if (state === "statusUnavailable") {
    return (
      <MfaJourneyShell title={tJourney("statusUnavailable.title")}>
        <p className="text-sm text-gray-700">{tJourney("statusUnavailable.body")}</p>
        {statusRequestId ? (
          <p className="mt-2 text-xs text-gray-500">{tJourney("statusUnavailable.reference", { requestId: statusRequestId })}</p>
        ) : null}
        <Button type="button" className="mt-3 min-h-11" onClick={() => void loadSetupStatus()}>
          {tJourney("statusUnavailable.retry")}
        </Button>
      </MfaJourneyShell>
    );
  }

  const startEnroll = async (
    submittedProof?: string,
    proofKind: "totp" | "recovery" = "totp",
  ) => {
    const replacing = Boolean(submittedProof) || replaceMode;
    const validProof = proofKind === "totp"
      ? looksLikeTotpCode(submittedProof ?? "")
      : classifySubmittedMfaCode(submittedProof ?? "") === "recovery";
    if (replacing && !validProof) {
      setError(mapApiError("empty", t("mfaSetupError")));
      return;
    }
    if (startEnrollLockRef.current) return;
    startEnrollLockRef.current = true;
    if (replacing && state === "replaceGate") {
      setReplaceSubmitting(true);
    } else {
      setState("loading");
    }
    setError(null);
    setConfirmCanContinueToChallenge(false);
    try {
      const res = await fetch("/api/mfa/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submittedProof
          ? proofKind === "recovery"
            ? { recoveryCode: submittedProof }
            : { code: submittedProof }
          : {}),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          code?: string;
          requiresCurrentCode?: boolean;
        };
        setConfirmCanContinueToChallenge(false);
        setError(mapApiError(body.code, t("mfaSetupError")));
        if (body.code === "limited") {
          retryCountdown.start(Number(res.headers.get("Retry-After")) || 900);
        }
        setState(body.requiresCurrentCode || replaceMode ? "replaceGate" : "idle");
        return;
      }
      const body = (await res.json()) as {
        secret: string;
        otpauthUri: string;
        expiresAt?: number;
      };
      setSecret(body.secret);
      setPendingExpiresAt(typeof body.expiresAt === "number" ? body.expiresAt : null);
      setClockNow(Date.now());
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
      startEnrollLockRef.current = false;
    }
  };

  const confirmWithCode = async (submittedCode: string) => {
    const kind = classifySubmittedMfaCode(submittedCode);
    if (kind !== "totp") {
      setError(mapApiError(kind === "empty" ? "empty" : "invalid", t("mfaSetupError")));
      return;
    }
    if (confirmLockRef.current) return;
    confirmLockRef.current = true;
    setState("confirming");
    setError(null);

    try {
      const res = await fetch("/api/mfa/enroll/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: submittedCode }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          code?: string;
        };
        setConfirmCanContinueToChallenge(body.code === "no_pending");
        setError(mapApiError(body.code, t("mfaSetupError")));
        if (body.code === "limited") {
          retryCountdown.start(Number(res.headers.get("Retry-After")) || 900);
        }
        setState("ready");
        confirmLockRef.current = false;
        return;
      }

      const body = (await res.json()) as {
        recoveryCodes?: string[];
        mfaGrant?: string;
        mfaGrantIssued?: boolean;
      };
      // Confirmation commits and the plaintext codes are one-time. Keep them
      // visible even if Auth.js cannot consume the browser grant afterwards.
      enrollmentConfirmedRef.current = true;
      setRecoveryCodes(body.recoveryCodes ?? []);
      retryCountdown.clear();
      setState("done");
      let verified = false;
      if (body.mfaGrant) {
        try {
          const nextSession = await update({ mfaGrant: body.mfaGrant });
          verified = Boolean(nextSession?.user?.mfaVerified);
        } catch {
          // Enrollment is committed and codes are on screen. The user can
          // complete verification from the challenge without regenerating QR.
        }
      }
      setSessionVerified(verified);
      // Keep lock held so a late Enter/auto-submit cannot POST the same code again.
    } catch {
      setError(t("mfaSetupError"));
      setState("ready");
      confirmLockRef.current = false;
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    await confirmWithCode(code);
  };

  const restartEnrollment = () => {
    setError(null);
    setCode("");
    if (replaceMode) {
      setState("replaceGate");
    } else {
      void startEnroll();
    }
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
          loading={replaceSubmitting || retryCountdown.waiting}
          error={error}
          retrySecondsRemaining={retryCountdown.secondsRemaining}
          cancelHref={hubMfaChallengeHref(nextPath)}
          onConfirm={(submittedProof, proofKind) => void startEnroll(submittedProof, proofKind)}
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
          {pendingExpired ? (
            <Callout tone="warning" role="status">
              <p>{tJourney("setupExpired.body")}</p>
              <Button type="button" className="mt-3 min-h-11" onClick={restartEnrollment}>
                {tJourney("setupExpired.restart")}
              </Button>
            </Callout>
          ) : pendingSecondsRemaining !== null ? (
            <p className="text-center text-sm text-gray-600" role="status" aria-live="polite">
              {tJourney("setupExpiryCountdown", { time: formatRetryTime(pendingSecondsRemaining) })}
            </p>
          ) : null}
          {!pendingExpired && qrDataUrl ? (
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
          {!pendingExpired && secret ? (
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
          {!pendingExpired ? <form
            id="mfa-setup-confirm-form"
            onSubmit={handleConfirm}
            className="space-y-3"
          >
          <MfaCodeField
              label={t("mfaSetupCodeLabel")}
              value={code}
              onChange={setCode}
              disabled={state === "confirming" || retryCountdown.waiting}
              autoFocus
              error={error}
            onTotpComplete={(totp) => {
              if (state === "ready") {
                void confirmWithCode(totp);
              }
            }}
            />
            {error ? (
              <div className="space-y-1">
                {confirmCanContinueToChallenge ? (
                  <Link
                    href={hubMfaChallengeHref(nextPath)}
                    className="inline-block text-sm font-medium text-opseu-blue underline underline-offset-2"
                  >
                    {tErrors("challengeCta")}
                  </Link>
                ) : null}
              </div>
            ) : null}
            {retryCountdown.waiting ? (
              <p className="text-sm text-amber-800" role="status" aria-live="polite">
                {tJourney("retryCountdown", { time: formatRetryTime(retryCountdown.secondsRemaining) })}
              </p>
            ) : null}
            <Button
              type="submit"
              disabled={state === "confirming" || retryCountdown.waiting || !looksLikeTotpCode(code)}
              className="min-h-11 w-full"
            >
              {state === "confirming" ? t("verifying") : t("mfaSetupConfirm")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full"
              disabled={state === "confirming" || retryCountdown.waiting}
              onClick={() => {
                if (replaceMode) {
                  setError(null);
                  setState("replaceGate");
                } else {
                  void startEnroll();
                }
              }}
            >
              {replaceMode ? tJourney("replace.generateAgain") : t("mfaSetupRegenerate")}
            </Button>
          </form> : null}
        </div>
      ) : null}
    </MfaJourneyShell>
  );
}
