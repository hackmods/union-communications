"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";

type Phase = "loading" | "signing" | "done" | "error";

export default function MagicSignInPage() {
  const t = useTranslations("hub");
  const params = useParams();
  const token = String(params.token ?? "");
  const router = useRouter();
  const { update } = useSession();
  const [phase, setPhase] = useState<Phase>(() =>
    token ? "loading" : "error",
  );
  const [errorKey, setErrorKey] = useState<
    "invalid" | "expired" | "consumed" | "failed"
  >("invalid");

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch(
          `/api/auth/sign-in/${encodeURIComponent(token)}`,
          { method: "POST" },
        );
        if (cancelled) return;
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          if (body.error === "expired") setErrorKey("expired");
          else if (body.error === "consumed") setErrorKey("consumed");
          else setErrorKey("invalid");
          setPhase("error");
          return;
        }
        const body = (await res.json()) as {
          email?: string;
          signInGrant?: string;
        };
        if (!body.email || !body.signInGrant) {
          setErrorKey("failed");
          setPhase("error");
          return;
        }
        setPhase("signing");
        const result = await signIn("credentials", {
          email: body.email,
          signInGrant: body.signInGrant,
          redirect: false,
        });
        if (cancelled) return;
        if (result?.error) {
          setErrorKey("failed");
          setPhase("error");
          return;
        }
        await update();
        setPhase("done");
        router.push("/app");
        router.refresh();
      } catch {
        if (!cancelled) {
          setErrorKey("failed");
          setPhase("error");
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [token, router, update]);

  const errorMessage =
    errorKey === "expired"
      ? t("magicLinkExpired")
      : errorKey === "consumed"
        ? t("magicLinkConsumed")
        : errorKey === "failed"
          ? t("magicLinkSignInFailed")
          : t("magicLinkInvalid");

  return (
    <PageShell size="nestedAuth" className="py-4 md:py-6">
      <h1 className="text-2xl font-bold text-opseu-dark md:text-3xl">
        {t("magicLinkPageTitle")}
      </h1>
      <Card density="compact" className="mt-6 space-y-3">
        {phase === "loading" || phase === "signing" || phase === "done" ? (
          <p className="text-gray-600" aria-live="polite">
            {phase === "done" ? t("magicLinkSuccess") : t("magicLinkWorking")}
          </p>
        ) : (
          <>
            <p className="text-sm text-red-600" role="alert">
              {errorMessage}
            </p>
            <Link
              href="/app/login"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border-2 border-opseu-blue px-4 py-2 font-semibold text-opseu-blue hover:bg-opseu-blue/5"
            >
              {t("signIn")}
            </Link>
          </>
        )}
      </Card>
    </PageShell>
  );
}
