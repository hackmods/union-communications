"use client";

import { useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";

export default function LoginPage() {
  const t = useTranslations("hub");
  const router = useRouter();
  const { update } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

    // Credentials sign-in with redirect:false sets the cookie but leaves
    // SessionProvider on a stale unauthenticated session. Refetch before
    // soft-navigating so the hub dashboard does not render blank.
    await update();
    router.push("/app");
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-md py-12">
      <h1 className="text-3xl font-bold text-opseu-dark">{t("login")}</h1>
      <p className="mt-2 text-gray-600">{t("loginSubtitle")}</p>

      <Card className="mt-8">
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? t("signingIn") : t("signIn")}
          </Button>
        </form>

        <p className="mt-6 text-xs text-gray-500">{t("demoHint")}</p>
      </Card>

      <p className="mt-4 text-center text-sm">
        <Link href="/" className="text-opseu-blue underline">
          {t("backToPublic")}
        </Link>
      </p>
    </div>
  );
}
