"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function ProductNewsPreferencesPanel({
  locale,
  enabled,
  notice,
  noticeVersion,
  token,
  current,
}: {
  locale: "en" | "fr";
  enabled: boolean;
  notice: string;
  noticeVersion: string;
  token?: string;
  current?: { email: string; status: string } | null;
}) {
  const t = useTranslations("productNews");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [status, setStatus] = useState(current?.status ?? "");

  async function submit(path: string, body: Record<string, unknown>, success: string) {
    setBusy(true);
    setFeedback("");
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });
      setFeedback(response.ok ? success : t("error"));
      if (response.ok && path.endsWith("/unsubscribe")) setStatus("suppressed");
    } catch {
      setFeedback(t("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {token && current ? (
        <section className="rounded-xl border border-opseu-gray/20 bg-white p-5">
          <h2 className="text-lg font-semibold text-opseu-dark">{t("currentTitle")}</h2>
          <p className="mt-2 text-sm text-opseu-gray-dark">{current.email}</p>
          <p className="mt-1 text-sm text-opseu-gray-dark">{t("status")}: {t(`statusValues.${status}`)}</p>
          {status !== "suppressed" ? (
            <button type="button" disabled={busy} onClick={() => submit("/api/product-news/unsubscribe", { token }, t("unsubscribed"))}
              className="mt-4 rounded-lg bg-opseu-blue px-4 py-2 font-medium text-white disabled:opacity-50">
              {t("unsubscribe")}
            </button>
          ) : null}
        </section>
      ) : token ? <p role="alert" className="text-sm text-opseu-gray-dark">{t("expired")}</p> : null}

      {enabled ? (
        <form onSubmit={(event) => {
          event.preventDefault();
          void submit("/api/product-news/subscribe", { email, locale, consent, noticeVersion, website: "" }, t("checkInbox"));
        }} className="rounded-xl border border-opseu-gray/20 bg-white p-5">
          <h2 className="text-lg font-semibold text-opseu-dark">{t("subscribeTitle")}</h2>
          <label className="mt-4 block text-sm font-medium text-opseu-dark" htmlFor="product-news-email">{t("email")}</label>
          <input id="product-news-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-lg border border-opseu-gray/40 p-2" />
          <label className="mt-4 flex items-start gap-3 text-sm text-opseu-dark">
            <input type="checkbox" required checked={consent} onChange={(event) => setConsent(event.target.checked)}
              className="mt-1" />
            <span>{notice}</span>
          </label>
          <button type="submit" disabled={busy || !consent}
            className="mt-4 rounded-lg bg-opseu-blue px-4 py-2 font-medium text-white disabled:opacity-50">{t("subscribe")}</button>
        </form>
      ) : <p className="text-sm text-opseu-gray-dark">{t("subscriptionUnavailable")}</p>}

      <form onSubmit={(event) => {
        event.preventDefault();
        void submit("/api/product-news/preferences-link", { email, locale }, t("linkSent"));
      }} className="rounded-xl border border-opseu-gray/20 bg-white p-5">
        <h2 className="text-lg font-semibold text-opseu-dark">{t("linkTitle")}</h2>
        <p className="mt-2 text-sm text-opseu-gray-dark">{t("linkBody")}</p>
        <label className="mt-4 block text-sm font-medium text-opseu-dark" htmlFor="product-news-link-email">{t("email")}</label>
        <input id="product-news-link-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)}
          className="mt-1 w-full rounded-lg border border-opseu-gray/40 p-2" />
        <button type="submit" disabled={busy} className="mt-4 rounded-lg border border-opseu-blue px-4 py-2 font-medium text-opseu-blue disabled:opacity-50">{t("sendLink")}</button>
      </form>
      {feedback ? <p role="status" aria-live="polite" className="text-sm text-opseu-dark">{feedback}</p> : null}
    </div>
  );
}
