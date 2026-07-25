"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Callout } from "@/components/ui/Callout";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card } from "@/components/ui/Card";

type ResetPreview = {
  email: string;
  status: string;
  expiresAt: string;
};

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("passwordReset");
  const [preview, setPreview] = useState<ResetPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/auth/reset-password/${encodeURIComponent(token)}`,
        );
        if (!res.ok) {
          if (!cancelled) setLoadError(t("notFound"));
          return;
        }
        const data = (await res.json()) as ResetPreview;
        if (!cancelled) setPreview(data);
      } catch {
        if (!cancelled) setLoadError(t("notFound"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, t]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (password.length < 8) {
      setSubmitError(t("passwordTooShort"));
      return;
    }
    if (password !== confirm) {
      setSubmitError(t("passwordMismatch"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/auth/reset-password/${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setSubmitError(body?.error ?? t("resetError"));
        return;
      }
      setDone(true);
    } catch {
      setSubmitError(t("resetError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <PageShell size="focus" className="space-y-4 py-8 md:py-12">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-32 w-full" />
      </PageShell>
    );
  }

  if (loadError || !preview) {
    return (
      <PageShell size="focus" className="space-y-4 py-8 md:py-12">
        <h1 className="text-2xl font-bold text-opseu-dark">{t("resetTitle")}</h1>
        <Callout tone="danger" role="alert">
          {loadError ?? t("notFound")}
        </Callout>
        <Link href="/app/forgot-password" className="text-opseu-blue underline">
          {t("requestAgain")}
        </Link>
      </PageShell>
    );
  }

  if (preview.status === "expired") {
    return (
      <PageShell size="focus" className="space-y-4 py-8 md:py-12">
        <h1 className="text-2xl font-bold text-opseu-dark">{t("resetTitle")}</h1>
        <Callout tone="danger" role="alert">
          {t("expired")}
        </Callout>
        <Link href="/app/forgot-password" className="text-opseu-blue underline">
          {t("requestAgain")}
        </Link>
      </PageShell>
    );
  }

  if (preview.status === "consumed" && !done) {
    return (
      <PageShell size="focus" className="space-y-4 py-8 md:py-12">
        <h1 className="text-2xl font-bold text-opseu-dark">{t("resetTitle")}</h1>
        <Callout tone="danger" role="alert">
          {t("alreadyUsed")}
        </Callout>
        <Link href="/app/forgot-password" className="text-opseu-blue underline">
          {t("requestAgain")}
        </Link>
      </PageShell>
    );
  }

  return (
    <PageShell size="focus" className="py-8 md:py-12">
      <h1 className="text-2xl font-bold text-opseu-dark md:text-3xl">
        {t("resetTitle")}
      </h1>
      <p className="mt-2 text-gray-600">
        {t("resetSubtitle", { email: preview.email })}
      </p>

      <Card density="compact" className="mt-6">
        {done ? (
          <div className="space-y-3">
            <Callout tone="brand" role="status">
              {t("success")}
            </Callout>
            <Link href="/app/login" className="text-opseu-blue underline">
              {t("goLogin")}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              label={t("password")}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <Input
              label={t("confirmPassword")}
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />
            {submitError && (
              <p className="text-sm text-red-600" role="alert">
                {submitError}
              </p>
            )}
            <Button
              type="submit"
              disabled={submitting}
              className="min-h-11 w-full"
            >
              {submitting ? t("saving") : t("savePassword")}
            </Button>
          </form>
        )}
      </Card>
    </PageShell>
  );
}
