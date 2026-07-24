"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
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

  if (session.user.mfaVerified) {
    return (
      <div className="mx-auto max-w-md px-4 py-8 md:py-12">
        <Card density="compact">
          <CardTitle className="text-base">{t("mfaVerified")}</CardTitle>
          <p className="mt-2 text-gray-600">{t("mfaVerifiedDesc")}</p>
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
      </div>
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
    <div className="mx-auto max-w-md px-4 py-8 md:py-12">
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
    </div>
  );
}
