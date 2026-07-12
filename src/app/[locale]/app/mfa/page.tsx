"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
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
      <p className="text-gray-600" aria-live="polite">
        {t("sessionLoading")}
      </p>
    );
  }

  if (session.user.mfaVerified) {
    return (
      <Card>
        <CardTitle>{t("mfaVerified")}</CardTitle>
        <p className="mt-2 text-gray-600">{t("mfaVerifiedDesc")}</p>
        <Button className="mt-4" onClick={() => router.push("/app")}>
          {t("backToDashboard")}
        </Button>
      </Card>
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

    await update({ mfaVerified: true });
    setLoading(false);
    router.push("/app");
  };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-bold text-opseu-dark">{t("mfaTitle")}</h1>
      <p className="mt-2 text-gray-600">{t("mfaSubtitle")}</p>

      <Card className="mt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? t("verifying") : t("verifyMfa")}
          </Button>
        </form>
        <p className="mt-4 text-xs text-gray-500">{t("mfaDevHint")}</p>
      </Card>
    </div>
  );
}
