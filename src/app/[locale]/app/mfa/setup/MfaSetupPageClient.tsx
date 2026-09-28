"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import {
  MfaCodeField,
  MfaHelpPanel,
  MfaJourneyShell,
  MfaRecoveryCodesPanel,
  MfaReplaceGate,
  MfaSetupSteps,
} from "@/components/hub/mfa";
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
  const { data: session, status } = useSession();
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
    setState("loading");
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
          requiresCurrentCode?: boolean;
        };
        setError(body.error ?? t("mfaSetupError"));
        setState(body.requiresCurrentCode ? "replaceGate" : "idle");
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
      setState("ready");
    } catch {
      setError(t("mfaSetupError"));
      setState(replaceMode ? "replaceGate" : "idle");
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
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
      };
      setError(body.error ?? t("mfaSetupError"));
      setState("ready");
      return;
    }

    const body = (await res.json()) as { recoveryCodes?: string[] };
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
          continueLabel={t("mfaSetupVerifyNow")}
          onContinue={() => router.push(hubMfaChallengeHref(nextPath))}
        />
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
          loading={false}
          error={error}
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
              </div>
            </details>
          ) : null}
          <form onSubmit={handleConfirm} className="space-y-3">
            <MfaCodeField
              label={t("mfaSetupCodeLabel")}
              value={code}
              onChange={setCode}
              disabled={state === "confirming"}
            />
            {error ? (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              disabled={state === "confirming"}
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
