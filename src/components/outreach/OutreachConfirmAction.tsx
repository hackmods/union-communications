"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

export function OutreachConfirmAction({ token }: { token: string }) {
  const t = useTranslations("outreachConfirm");
  const [state, setState] = useState<"idle" | "busy" | "success" | "error">("idle");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setState("busy");
      try {
        const response = await fetch(
          `/api/outreach-lists/confirm?token=${encodeURIComponent(token)}`,
          { cache: "no-store" },
        );
        if (!cancelled) setState(response.ok ? "success" : "error");
      } catch {
        if (!cancelled) setState("error");
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state === "success") {
    return (
      <p className="mt-6 text-opseu-dark" role="status">
        {t("success")}
      </p>
    );
  }
  if (state === "error") {
    return (
      <p className="mt-6 text-red-800" role="alert">
        {t("failed")}
      </p>
    );
  }
  return <p className="mt-6 text-sm text-opseu-gray-dark">{t("working")}</p>;
}
