"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import {
  MfaCodeField,
  MfaHelpPanel,
  MfaJourneyShell,
  MfaStatusPanel,
} from "@/components/hub/mfa";
import {
  classifySubmittedMfaCode,
  officerMfaErrorMessage,
} from "@/lib/auth/mfa-client-codes";
import { resolveMfaCopyIntent } from "@/lib/auth/mfa-copy-context";
import {
  hubMfaSetupHref,
  safeMfaReturnPath,
} from "@/lib/auth/mfa-return-path";

type MfaStatus = {
  enabled: boolean;
  required: boolean;
  mode: string | null;
  enrolled: boolean;
  needsEnrollment: boolean;
  mfaVerified: boolean;
  reenrollGrace: boolean;
  recoveryCodesRemaining: number | null;
};

export function MfaPageClient() {
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

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mfaStatus, setMfaStatus] = useState<MfaStatus | null>(null);
  const [statusLoad, setStatusLoad] = useState<"loading" | "ready" | "unavailable" | "expired">("loading");
  const [statusRequestId, setStatusRequestId] = useState<string | null>(null);
  const [newRecoveryCodes, setNewRecoveryCodes] = useState<string[]>([]);
  const [rotatingRecoveryCodes, setRotatingRecoveryCodes] = useState(false);
  const [rotateError, setRotateError] = useState<string | null>(null);
  /** Sync lock — React `loading` state alone cannot stop auto-submit + Enter racing. */
  const verifyLockRef = useRef(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/app/login");
    }
  }, [status, router]);

  const loadMfaStatus = useCallback(async (options: {
    silent?: boolean;
    preserveOnFailure?: boolean;
  } = {}) => {
    if (!options.silent) {
      setStatusLoad("loading");
      setStatusRequestId(null);
    }
    try {
      const response = await fetch("/api/mfa/status", { cache: "no-store" });
      if (response.status === 401) {
        if (options.preserveOnFailure) return;
        setMfaStatus(null);
        setStatusLoad("expired");
        return;
      }
      const data = await response.json().catch(() => null) as
        | (Partial<MfaStatus> & { requestId?: string })
        | null;
      if (
        !response.ok ||
        !data ||
        typeof data.enabled !== "boolean" ||
        typeof data.required !== "boolean" ||
        typeof data.enrolled !== "boolean" ||
        typeof data.needsEnrollment !== "boolean" ||
        typeof data.mfaVerified !== "boolean" ||
        typeof data.reenrollGrace !== "boolean" ||
        !(data.mode === null || typeof data.mode === "string")
      ) {
        if (options.preserveOnFailure) return;
        setMfaStatus(null);
        setStatusRequestId(data?.requestId ?? response.headers.get("X-Request-ID"));
        setStatusLoad("unavailable");
        return;
      }
      setMfaStatus({
        enabled: data.enabled,
        required: data.required,
        mode: data.mode ?? null,
        enrolled: data.enrolled,
        needsEnrollment: data.needsEnrollment,
        mfaVerified: data.mfaVerified,
        reenrollGrace: data.reenrollGrace,
        recoveryCodesRemaining:
          typeof data.recoveryCodesRemaining === "number"
            ? data.recoveryCodesRemaining
            : null,
      });
      setStatusLoad("ready");
    } catch {
      if (options.preserveOnFailure) return;
      setMfaStatus(null);
      setStatusLoad("unavailable");
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    void Promise.resolve().then(() => loadMfaStatus());
  }, [status, loadMfaStatus]);

  const resume = () => {
    router.push(nextPath ?? "/app");
  };

  if (status === "loading" || !session?.user || statusLoad === "loading") {
    return (
      <PageShell size="nestedAuth" className="py-4 md:py-6">
        <p className="text-gray-600" aria-live="polite">
          {t("sessionLoading")}
        </p>
      </PageShell>
    );
  }

  if (statusLoad === "expired") {
    return (
      <MfaJourneyShell title={tJourney("statusExpired.title")}>
        <p className="text-sm text-gray-700">{tJourney("statusExpired.body")}</p>
        <Link href="/app/login" className="mt-3 inline-block font-medium text-opseu-blue underline">
          {tJourney("statusExpired.cta")}
        </Link>
      </MfaJourneyShell>
    );
  }

  if (statusLoad === "unavailable" || !mfaStatus) {
    return (
      <MfaJourneyShell title={tJourney("statusUnavailable.title")}>
        <p className="text-sm text-gray-700">{tJourney("statusUnavailable.body")}</p>
        {statusRequestId ? (
          <p className="mt-2 text-xs text-gray-500">{tJourney("statusUnavailable.reference", { requestId: statusRequestId })}</p>
        ) : null}
        <Button type="button" className="mt-3 min-h-11" onClick={() => void loadMfaStatus()}>
          {tJourney("statusUnavailable.retry")}
        </Button>
      </MfaJourneyShell>
    );
  }

  if (!mfaStatus.enabled) {
    return (
      <MfaJourneyShell title={tJourney("disabled.title")}>
        <MfaStatusPanel
          variant="disabled"
          nextPath={nextPath}
          onContinue={resume}
        />
      </MfaJourneyShell>
    );
  }

  if (mfaStatus.reenrollGrace) {
    return (
      <MfaJourneyShell
        title={tJourney("reenrollGrace.title")}
        subtitle={tJourney("reenrollGrace.body")}
      >
        <Link
          href={hubMfaSetupHref(nextPath)}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-opseu-blue px-4 py-2 font-semibold text-white hover:bg-opseu-blue/90"
        >
          {tJourney("reenrollGrace.cta")}
        </Link>
      </MfaJourneyShell>
    );
  }

  if (!mfaStatus.required) {
    return (
      <MfaJourneyShell title={tJourney("notRequired.title")}>
        <MfaStatusPanel
          variant="notRequired"
          nextPath={nextPath}
          onContinue={resume}
        />
      </MfaJourneyShell>
    );
  }

  if (mfaStatus.mfaVerified) {
    const handleRotate = async (rotationCode: string) => {
      setRotatingRecoveryCodes(true);
      setRotateError(null);
      try {
        const response = await fetch("/api/mfa/recovery-codes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: rotationCode }),
        });
        const body = (await response.json().catch(() => ({}))) as {
          recoveryCodes?: string[];
          mfaGrant?: string;
        };
        if (!response.ok || !body.recoveryCodes?.length || !body.mfaGrant) {
          setRotateError(t("mfaError"));
          return;
        }
        setNewRecoveryCodes(body.recoveryCodes);
        setMfaStatus((prev) =>
          prev
            ? {
                ...prev,
                recoveryCodesRemaining: body.recoveryCodes!.length,
                mfaVerified: false,
              }
            : prev,
        );
        try {
          const nextSession = await update({ mfaGrant: body.mfaGrant });
          if (!nextSession?.user?.mfaVerified) {
            setRotateError(tErrors("session_not_verified"));
            return;
          }
          setMfaStatus((prev) => prev ? { ...prev, mfaVerified: true } : prev);
          await loadMfaStatus({ silent: true, preserveOnFailure: true });
        } catch {
          setRotateError(tErrors("session_not_verified"));
        }
      } catch {
        setRotateError(t("mfaError"));
      } finally {
        setRotatingRecoveryCodes(false);
      }
    };

    return (
      <MfaJourneyShell
        title={tJourney("context.manage.title")}
        subtitle={tJourney("context.manage.subtitle")}
      >
        <MfaStatusPanel
          variant="verified"
          nextPath={nextPath}
          recoveryCodesRemaining={mfaStatus.recoveryCodesRemaining}
          newRecoveryCodes={newRecoveryCodes}
          onContinue={resume}
          onDismissNewCodes={() => setNewRecoveryCodes([])}
          onRotate={handleRotate}
          rotating={rotatingRecoveryCodes}
          rotateError={rotateError}
        />
      </MfaJourneyShell>
    );
  }

  const intent = resolveMfaCopyIntent({
    next: nextPath,
    step: "challenge",
  });
  const title = tJourney(`context.${intent}.title`);
  const subtitle = tJourney(`context.${intent}.subtitle`);

  const verifyWithCode = async (submittedCode: string) => {
    const kind = classifySubmittedMfaCode(submittedCode);
    if (kind === "empty" || kind === "invalid") {
      setError(
        officerMfaErrorMessage(kind, (key) => tErrors(key), t("mfaError")),
      );
      return;
    }
    if (verifyLockRef.current) return;
    verifyLockRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: submittedCode }),
      });

      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as {
          needsEnrollment?: boolean;
          code?: string;
        };
        if (errBody.needsEnrollment) {
          router.replace(hubMfaSetupHref(nextPath));
          return;
        }
        setError(
          officerMfaErrorMessage(
            errBody.code,
            (key) => tErrors(key),
            t("mfaError"),
          ),
        );
        verifyLockRef.current = false;
        setLoading(false);
        return;
      }

      const body = (await res.json()) as { mfaGrant?: string };
      if (!body.mfaGrant) {
        setError(
        officerMfaErrorMessage(
          "grant_unavailable",
          (key) => tErrors(key),
          t("mfaError"),
        ),
        );
        verifyLockRef.current = false;
        setLoading(false);
        return;
      }

      const nextSession = await update({ mfaGrant: body.mfaGrant });
      if (!nextSession?.user?.mfaVerified) {
        setError(
          officerMfaErrorMessage(
            "session_not_verified",
            (key) => tErrors(key),
            t("mfaError"),
          ),
        );
        verifyLockRef.current = false;
        setLoading(false);
        return;
      }
      // Keep lock held through navigation so a late Enter cannot replay-fail.
      router.push(nextPath ?? "/app");
    } catch {
      setError(t("mfaError"));
      verifyLockRef.current = false;
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await verifyWithCode(code);
  };

  return (
    <MfaJourneyShell
      title={title}
      subtitle={subtitle}
      help={<MfaHelpPanel step="challenge" />}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <MfaCodeField
          label={tJourney("challengeCodeLabel")}
          value={code}
          onChange={setCode}
          allowRecovery
          disabled={loading}
          autoFocus
          hint={tJourney("challengeCodeHint")}
          onTotpComplete={(totp) => {
            if (!loading) void verifyWithCode(totp);
          }}
        />
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          disabled={
            loading ||
            classifySubmittedMfaCode(code) === "empty" ||
            classifySubmittedMfaCode(code) === "invalid"
          }
          className="min-h-11 w-full"
        >
          {loading ? t("verifying") : t("verifyMfa")}
        </Button>
      </form>
      {mfaStatus.mode === "shared_code_insecure" ? (
        <p className="mt-4 text-xs text-gray-500">{t("mfaDevHint")}</p>
      ) : null}
      {mfaStatus.needsEnrollment ? (
        <Link
          href={hubMfaSetupHref(nextPath)}
          className="mt-3 block text-sm font-medium text-opseu-blue hover:underline"
        >
          {tJourney("setupCta")}
        </Link>
      ) : null}
    </MfaJourneyShell>
  );
}
