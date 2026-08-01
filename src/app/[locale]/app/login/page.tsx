"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";

function isDemoSiteClient(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_SITE === "true";
}

export default function LoginPage() {
  const t = useTranslations("hub");
  const router = useRouter();
  const { update } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [magicBusy, setMagicBusy] = useState(false);
  const [magicDone, setMagicDone] = useState(false);
  const [magicEmailSent, setMagicEmailSent] = useState<boolean | null>(null);
  const [magicReason, setMagicReason] = useState<string | undefined>();
  const showDemoHint = isDemoSiteClient();

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/email-status")
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { emailEnabled?: boolean } | null) => {
        if (!cancelled && body?.emailEnabled) setEmailEnabled(true);
      })
      .catch(() => {
        /* ignore — password login still works */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError(t("loginError"));
      setLoading(false);
      return;
    }

    await update();
    router.push("/app");
    router.refresh();
  };

  const handleMagicLink = async () => {
    if (!email.trim()) {
      setError(t("magicLinkNeedEmail"));
      return;
    }
    setMagicBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/sign-in-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        setError(t("magicLinkError"));
        return;
      }
      const data = (await res.json()) as {
        emailSent?: boolean;
        emailReason?: string;
      };
      setMagicEmailSent(data.emailSent ?? false);
      setMagicReason(data.emailReason);
      setMagicDone(true);
    } catch {
      setError(t("magicLinkError"));
    } finally {
      setMagicBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md py-4 md:py-6">
      <h1 className="text-2xl font-bold text-opseu-dark md:text-3xl">
        {t("login")}
      </h1>
      <p className="mt-2 text-gray-600">{t("loginSubtitle")}</p>

      <Card density="compact" className="mt-6">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            label={t("email")}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            label={t("password")}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={loading} className="min-h-11 w-full">
            {loading ? t("signingIn") : t("signIn")}
          </Button>
        </form>

        <p className="mt-3 text-center text-sm">
          <Link href="/app/forgot-password" className="text-opseu-blue underline">
            {t("forgotPassword")}
          </Link>
        </p>
        {emailEnabled ? (
          <p className="mt-1 text-center text-xs text-gray-500">
            {t("forgotPasswordEmailHint")}
          </p>
        ) : null}

        {emailEnabled ? (
          <div className="mt-4 border-t border-gray-100 pt-4">
            {magicDone ? (
              <div className="space-y-2 text-sm text-gray-700">
                <p>{t("magicLinkSentGeneric")}</p>
                {magicEmailSent === false &&
                  magicReason === "not_configured" && (
                    <p className="text-gray-600">{t("magicLinkSmtpOff")}</p>
                  )}
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full"
                disabled={magicBusy}
                onClick={() => void handleMagicLink()}
              >
                {magicBusy ? t("magicLinkSending") : t("magicLinkCta")}
              </Button>
            )}
          </div>
        ) : null}

        {showDemoHint ? (
          <p className="mt-4 text-xs text-gray-500">{t("demoHint")}</p>
        ) : null}
      </Card>

      <p className="mt-4 text-center text-sm">
        <Link href="/" className="text-opseu-blue underline">
          {t("backToPublic")}
        </Link>
      </p>
    </div>
  );
}
