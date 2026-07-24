"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Callout } from "@/components/ui/Callout";
import { Skeleton } from "@/components/ui/Skeleton";

type InvitePreview = {
  email: string;
  name: string;
  status: string;
  expiresAt: string;
  roles: string[];
};

export function AcceptInviteForm({ token }: { token: string }) {
  const t = useTranslations("inviteAccept");
  const [preview, setPreview] = useState<InvitePreview | null>(null);
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
        const res = await fetch(`/api/invites/${encodeURIComponent(token)}`);
        if (!res.ok) {
          if (!cancelled) setLoadError(t("notFound"));
          return;
        }
        const data = (await res.json()) as InvitePreview;
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
      const res = await fetch(`/api/invites/${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setSubmitError(body?.error ?? t("acceptError"));
        return;
      }
      setDone(true);
    } catch {
      setSubmitError(t("acceptError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <PageShell size="focus" className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-32 w-full" />
      </PageShell>
    );
  }

  if (loadError || !preview) {
    return (
      <PageShell size="focus" className="space-y-4">
        <h1 className="text-2xl font-bold text-opseu-dark">{t("title")}</h1>
        <Callout tone="danger" role="alert">
          {loadError ?? t("notFound")}
        </Callout>
        <Link href="/app/login" className="text-opseu-blue underline">
          {t("goLogin")}
        </Link>
      </PageShell>
    );
  }

  if (preview.status !== "pending") {
    return (
      <PageShell size="focus" className="space-y-4">
        <h1 className="text-2xl font-bold text-opseu-dark">{t("title")}</h1>
        <Callout tone="muted">
          {preview.status === "accepted"
            ? t("alreadyAccepted")
            : preview.status === "expired"
              ? t("expired")
              : t("unavailable")}
        </Callout>
        <Link href="/app/login" className="text-opseu-blue underline">
          {t("goLogin")}
        </Link>
      </PageShell>
    );
  }

  if (done) {
    return (
      <PageShell size="focus" className="space-y-4">
        <h1 className="text-2xl font-bold text-opseu-dark">{t("title")}</h1>
        <p className="text-gray-700">{t("success")}</p>
        <Link
          href="/app/login"
          className="inline-flex min-h-11 items-center rounded-lg bg-opseu-blue px-4 text-white"
        >
          {t("goLogin")}
        </Link>
      </PageShell>
    );
  }

  return (
    <PageShell size="focus" className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-opseu-dark md:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-gray-600">
          {t("subtitle", { name: preview.name, email: preview.email })}
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          label={t("password")}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          minLength={8}
        />
        <Input
          label={t("confirmPassword")}
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          autoComplete="new-password"
          minLength={8}
        />
        {submitError && (
          <p className="text-sm text-red-600" role="alert">
            {submitError}
          </p>
        )}
        <Button type="submit" disabled={submitting} className="min-h-11 w-full">
          {submitting ? t("accepting") : t("accept")}
        </Button>
      </form>
    </PageShell>
  );
}
