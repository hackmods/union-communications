"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getAllProgress } from "@/lib/officer-learning/progress";
import clsx from "clsx";

type MeRecord = {
  displayName: string;
  hubSyncEnabled: boolean;
  shareWithLocal: boolean;
  modules: ReturnType<typeof getAllProgress>;
};

export function LearningHubSyncPanel() {
  const t = useTranslations("officerLearning.hubSync");
  const { data: session, status } = useSession();
  const [displayName, setDisplayName] = useState("");
  const [hubSyncEnabled, setHubSyncEnabled] = useState(false);
  const [shareWithLocal, setShareWithLocal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<"idle" | "saved" | "error">("idle");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/officer-learning/me");
        if (!res.ok) return;
        const data = (await res.json()) as { record: MeRecord };
        if (cancelled) return;
        setDisplayName(data.record.displayName || session.user?.name || "");
        setHubSyncEnabled(Boolean(data.record.hubSyncEnabled));
        setShareWithLocal(Boolean(data.record.shareWithLocal));
        setLoaded(true);
      } catch {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, status]);

  if (status === "loading") return null;

  if (status !== "authenticated") {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
        <p className="font-semibold text-white">{t("signedOutTitle")}</p>
        <p className="mt-2">{t("signedOutBody")}</p>
        <Link
          href="/app/login"
          className="mt-3 inline-block font-medium text-teal-300 underline underline-offset-2"
        >
          {t("signIn")} →
        </Link>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    setMessage("idle");
    try {
      const res = await fetch("/api/officer-learning/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim() || session.user?.name || "Steward",
          hubSyncEnabled,
          shareWithLocal: hubSyncEnabled ? shareWithLocal : false,
          modules: getAllProgress(),
        }),
      });
      if (!res.ok) throw new Error("save failed");
      setMessage("saved");
    } catch {
      setMessage("error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-teal-500/25 bg-teal-500/10 p-4">
      <div>
        <p className="font-semibold text-teal-50">{t("title")}</p>
        <p className="mt-1 text-sm text-teal-100/90">{t("body")}</p>
      </div>

      {loaded && (
        <>
          <label className="block text-sm text-teal-50/90">
            {t("displayName")}
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/15 bg-slate-950/40 px-3 py-2 text-white"
            />
          </label>

          <label className="flex items-start gap-3 text-sm text-teal-50">
            <input
              type="checkbox"
              checked={hubSyncEnabled}
              onChange={(e) => {
                setHubSyncEnabled(e.target.checked);
                if (!e.target.checked) setShareWithLocal(false);
              }}
              className="mt-1 accent-teal-400"
            />
            <span>
              <span className="font-semibold">{t("syncLabel")}</span>
              <span className="mt-1 block text-teal-100/80">{t("syncHint")}</span>
            </span>
          </label>

          <label
            className={clsx(
              "flex items-start gap-3 text-sm text-teal-50",
              !hubSyncEnabled && "opacity-50",
            )}
          >
            <input
              type="checkbox"
              checked={shareWithLocal}
              disabled={!hubSyncEnabled}
              onChange={(e) => setShareWithLocal(e.target.checked)}
              className="mt-1 accent-teal-400"
            />
            <span>
              <span className="font-semibold">{t("shareLabel")}</span>
              <span className="mt-1 block text-teal-100/80">{t("shareHint")}</span>
            </span>
          </label>

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-teal-400 disabled:opacity-60"
          >
            {saving ? t("saving") : t("save")}
          </button>
          {message === "saved" && (
            <p className="text-sm text-emerald-200" role="status">
              {t("saved")}
            </p>
          )}
          {message === "error" && (
            <p className="text-sm text-red-200" role="alert">
              {t("error")}
            </p>
          )}
        </>
      )}
    </div>
  );
}
