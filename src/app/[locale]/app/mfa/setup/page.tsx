"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type EnrollState = "idle" | "loading" | "ready" | "confirming" | "done";

export default function MfaSetupPage() {
  const t = useTranslations("hub");
  const { data: session, status } = useSession();
  const router = useRouter();

  const [state, setState] = useState<EnrollState>("idle");
  const [secret, setSecret] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/app/login");
    }
  }, [status, router]);

  if (status === "loading" || !session?.user) {
    return (
      <div className="mx-auto max-w-md px-4 py-8 md:py-12">
        <p className="text-gray-600" aria-live="polite">
          {t("sessionLoading")}
        </p>
      </div>
    );
  }

  const handleGenerate = async () => {
    setState("loading");
    setError(null);
    try {
      const res = await fetch("/api/mfa/enroll", { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(body.error ?? t("mfaSetupError"));
        setState("idle");
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
      setState("idle");
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

    setState("done");
  };

  if (state === "done") {
    return (
      <div className="mx-auto max-w-md px-4 py-8 md:py-12">
        <Card density="compact">
          <CardTitle className="text-base">{t("mfaSetupSuccess")}</CardTitle>
          <p className="mt-2 text-gray-600">{t("mfaSetupSuccessDesc")}</p>
          <Button
            className="mt-4 min-h-11 w-full"
            onClick={() => router.push("/app/mfa")}
          >
            {t("mfaSetupVerifyNow")}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8 md:py-12">
      <h1 className="text-2xl font-bold text-opseu-dark md:text-3xl">
        {t("mfaSetupTitle")}
      </h1>
      <p className="mt-2 text-gray-600">{t("mfaSetupSubtitle")}</p>

      <Card density="compact" className="mt-6">
        {state === "idle" ? (
          <Button
            className="min-h-11 w-full"
            onClick={handleGenerate}
            disabled={(state as EnrollState) === "loading"}
          >
            {t("mfaSetupGenerate")}
          </Button>
        ) : (
          <div className="space-y-4">
            {qrDataUrl && (
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
            )}
            {secret && (
              <div>
                <p className="text-xs font-medium text-gray-500">
                  {t("mfaSetupSecretLabel")}
                </p>
                <p className="mt-1 break-all rounded-md bg-gray-50 px-3 py-2 font-mono text-sm text-opseu-dark">
                  {secret}
                </p>
              </div>
            )}
            <form onSubmit={handleConfirm} className="space-y-3">
              <Input
                label={t("mfaSetupCodeLabel")}
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
              <Button
                type="submit"
                disabled={state === "confirming"}
                className="min-h-11 w-full"
              >
                {state === "confirming"
                  ? t("verifying")
                  : t("mfaSetupConfirm")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full"
                onClick={handleGenerate}
              >
                {t("mfaSetupRegenerate")}
              </Button>
            </form>
          </div>
        )}
        {error && state === "idle" && (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </Card>
    </div>
  );
}
