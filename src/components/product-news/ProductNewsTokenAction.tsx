"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function ProductNewsTokenAction({ token, action }: { token: string; action: "confirm" | "unsubscribe" }) {
  const t = useTranslations("productNews");
  const [result, setResult] = useState<"idle" | "busy" | "success" | "error">("idle");
  async function act() {
    setResult("busy");
    try {
      const response = await fetch(`/api/product-news/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
        cache: "no-store",
      });
      setResult(response.ok ? "success" : "error");
    } catch { setResult("error"); }
  }
  return (
    <div className="mt-6">
      {result === "success" ? <p role="status">{action === "confirm" ? t("confirmed") : t("unsubscribed")}</p>
        : result === "error" ? <p role="alert">{t("expired")}</p>
        : <button type="button" disabled={result === "busy"} onClick={() => void act()}
          className="rounded-lg bg-opseu-blue px-4 py-2 font-medium text-white disabled:opacity-50">
          {action === "confirm" ? t("confirm") : t("unsubscribe")}
        </button>}
    </div>
  );
}
