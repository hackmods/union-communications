"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Callout } from "@/components/ui/Callout";

export function ForgotPasswordForm() {
  const t = useTranslations("passwordReset");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [emailSent, setEmailSent] = useState<boolean | null>(null);
  const [emailReason, setEmailReason] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [emailEnabled, setEmailEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/email-status")
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { emailEnabled?: boolean } | null) => {
        if (!cancelled && body?.emailEnabled) setEmailEnabled(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        setError(t("requestError"));
        return;
      }
      const data = (await res.json()) as {
        emailSent?: boolean;
        emailReason?: string;
      };
      setEmailSent(data.emailSent ?? false);
      setEmailReason(data.emailReason);
      setDone(true);
    } catch {
      setError(t("requestError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell size="focus" className="py-8 md:py-12">
      <h1 className="text-2xl font-bold text-opseu-dark md:text-3xl">
        {t("forgotTitle")}
      </h1>
      <p className="mt-2 text-gray-600">
        {emailEnabled ? t("forgotSubtitleEmailOn") : t("forgotSubtitle")}
      </p>

      <Card density="compact" className="mt-6">
        {done ? (
          <div className="space-y-3">
            <Callout tone="brand" role="status">
              {t("forgotSentGeneric")}
            </Callout>
            {emailSent === false && emailReason === "not_configured" && (
              <p className="text-sm text-gray-600">{t("smtpOffHint")}</p>
            )}
            <p className="text-sm">
              <Link href="/app/login" className="text-opseu-blue underline">
                {t("backToLogin")}
              </Link>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              label={t("email")}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={submitting}
              className="min-h-11 w-full"
            >
              {submitting ? t("sending") : t("sendLink")}
            </Button>
          </form>
        )}
      </Card>

      {!done && (
        <p className="mt-4 text-center text-sm">
          <Link href="/app/login" className="text-opseu-blue underline">
            {t("backToLogin")}
          </Link>
        </p>
      )}
    </PageShell>
  );
}
