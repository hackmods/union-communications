"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function MfaPage() {
  const t = useTranslations("hub");
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null);
  const [mfaRequired, setMfaRequired] = useState<boolean | null>(null);
  const [mfaVerified, setMfaVerified] = useState(false);
  const [recoveryCodesRemaining, setRecoveryCodesRemaining] = useState<number | null>(null);
  const [rotationCode, setRotationCode] = useState("");
  const [newRecoveryCodes, setNewRecoveryCodes] = useState<string[]>([]);
  const [rotatingRecoveryCodes, setRotatingRecoveryCodes] = useState(false);

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
      .then((data: {
        enabled?: boolean;
        required?: boolean;
        mfaVerified?: boolean;
        recoveryCodesRemaining?: number | null;
      } | null) => {
        if (!cancelled) {
          setMfaEnabled(Boolean(data?.enabled));
          setMfaRequired(Boolean(data?.required));
          setMfaVerified(Boolean(data?.mfaVerified));
          setRecoveryCodesRemaining(
            typeof data?.recoveryCodesRemaining === "number"
              ? data.recoveryCodesRemaining
              : null,
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMfaEnabled(false);
          setMfaRequired(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  if (
    status === "loading" ||
    !session?.user ||
    mfaEnabled === null ||
    mfaRequired === null
  ) {
    return (
      <PageShell size="nestedAuth" className="py-4 md:py-6">
        <p className="text-gray-600" aria-live="polite">
          {t("sessionLoading")}
        </p>
      </PageShell>
    );
  }

  if (!mfaEnabled) {
    return (
      <PageShell size="nestedAuth" className="py-4 md:py-6">
        <Card density="compact">
          <CardTitle className="text-base">{t("mfaDisabledTitle")}</CardTitle>
          <p className="mt-2 text-gray-600">{t("mfaDisabledDesc")}</p>
          <Button className="mt-4 min-h-11" onClick={() => router.push("/app")}>
            {t("backToDashboard")}
          </Button>
        </Card>
      </PageShell>
    );
  }

  if (!mfaRequired) {
    return (
      <PageShell size="nestedAuth" className="py-4 md:py-6">
        <Card density="compact">
          <CardTitle className="text-base">{t("mfaNotRequiredTitle")}</CardTitle>
          <p className="mt-2 text-gray-600">{t("mfaNotRequiredDesc")}</p>
          <Button
            className="mt-4 min-h-11"
            onClick={() => router.push("/app")}
          >
            {t("backToDashboard")}
          </Button>
          <Link
            href="/app/mfa/setup"
            className="mt-3 block text-sm font-medium text-opseu-blue hover:underline"
          >
            {t("mfaSetupLink")}
          </Link>
        </Card>
      </PageShell>
    );
  }

  if (mfaVerified) {
    const handleRotateRecoveryCodes = async (event: React.FormEvent) => {
      event.preventDefault();
      setRotatingRecoveryCodes(true);
      setError(null);
      try {
        const response = await fetch("/api/mfa/recovery-codes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: rotationCode }),
        });
        const body = (await response.json().catch(() => ({}))) as {
          recoveryCodes?: string[];
        };
        if (!response.ok || !body.recoveryCodes?.length) {
          setError(t("mfaError"));
          return;
        }
        setNewRecoveryCodes(body.recoveryCodes);
        setRecoveryCodesRemaining(body.recoveryCodes.length);
        setRotationCode("");
      } catch {
        setError(t("mfaError"));
      } finally {
        setRotatingRecoveryCodes(false);
      }
    };
    return (
      <PageShell size="nestedAuth" className="py-4 md:py-6">
        <Card density="compact">
          <CardTitle className="text-base">{t("mfaVerified")}</CardTitle>
          <p className="mt-2 text-gray-600">{t("mfaVerifiedDesc")}</p>
          <section
            className="mt-5 border-t border-gray-200 pt-4"
            aria-labelledby="mfa-recovery-rotate-heading"
          >
            <h2
              id="mfa-recovery-rotate-heading"
              className="font-semibold text-opseu-dark"
            >
              {t("mfaRecoveryCodesTitle")}
            </h2>
            {recoveryCodesRemaining !== null && (
              <p className="mt-1 text-sm text-gray-600">
                {t("mfaRecoveryCodesRemaining", {
                  count: recoveryCodesRemaining,
                })}
              </p>
            )}
            {newRecoveryCodes.length > 0 ? (
              <>
                <p className="mt-2 text-sm text-gray-600">{t("mfaRecoveryCodesSave")}</p>
                <ul className="mt-3 grid grid-cols-1 gap-2 rounded-md bg-gray-50 p-3 font-mono text-sm sm:grid-cols-2">
                  {newRecoveryCodes.map((recoveryCode) => (
                    <li key={recoveryCode}>{recoveryCode}</li>
                  ))}
                </ul>
              </>
            ) : (
              <form onSubmit={handleRotateRecoveryCodes} className="mt-3 space-y-3">
                <Input
                  label={t("mfaRecoveryCodesChallenge")}
                  value={rotationCode}
                  onChange={(event) => setRotationCode(event.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                />
                {error && (
                  <p className="text-sm text-red-600" role="alert">
                    {error}
                  </p>
                )}
                <Button
                  type="submit"
                  disabled={rotatingRecoveryCodes}
                  variant="outline"
                  className="min-h-11 w-full"
                >
                  {rotatingRecoveryCodes
                    ? t("verifying")
                    : t("mfaRecoveryCodesRegenerate")}
                </Button>
              </form>
            )}
          </section>
          <Button className="mt-4 min-h-11" onClick={() => router.push("/app")}>
            {t("backToDashboard")}
          </Button>
          <Link
            href="/app/mfa/setup"
            className="mt-3 block text-sm font-medium text-opseu-blue hover:underline"
          >
            {t("mfaSetupLink")}
          </Link>
        </Card>
      </PageShell>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/mfa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    if (!res.ok) {
      const errBody = (await res.json().catch(() => ({}))) as {
        needsEnrollment?: boolean;
      };
      if (errBody.needsEnrollment) {
        setLoading(false);
        router.replace("/app/mfa/setup");
        return;
      }
      setError(t("mfaError"));
      setLoading(false);
      return;
    }

    const body = (await res.json()) as { mfaGrant?: string };
    if (!body.mfaGrant) {
      setError(t("mfaError"));
      setLoading(false);
      return;
    }

    // Opaque server-issued grant only — never set mfaVerified from the client.
    await update({ mfaGrant: body.mfaGrant });
    setLoading(false);
    router.push("/app");
  };

  return (
    <PageShell size="nestedAuth" className="py-4 md:py-6">
      <h1 className="text-2xl font-bold text-opseu-dark md:text-3xl">
        {t("mfaTitle")}
      </h1>
      <p className="mt-2 text-gray-600">{t("mfaSubtitle")}</p>

      <Card density="compact" className="mt-6">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            label={t("mfaCode")}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="000000"
            maxLength={6}
            required
          />
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={loading} className="min-h-11 w-full">
            {loading ? t("verifying") : t("verifyMfa")}
          </Button>
        </form>
        <p className="mt-4 text-xs text-gray-500">{t("mfaDevHint")}</p>
        <Link
          href="/app/mfa/setup"
          className="mt-3 block text-sm font-medium text-opseu-blue hover:underline"
        >
          {t("mfaSetupLink")}
        </Link>
      </Card>
    </PageShell>
  );
}
