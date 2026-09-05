"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getAllProgress } from "@/lib/officer-learning/progress";
import {
  hydrateProgressFromHub,
  pushHubProgress,
} from "@/lib/officer-learning/hub-sync-client";
import { useOlTheme } from "./OlThemeProvider";
import clsx from "clsx";

type Props = {
  onProgressHydrated?: (progress: ReturnType<typeof getAllProgress>) => void;
};

export function LearningHubSyncPanel({ onProgressHydrated }: Props) {
  const t = useTranslations("officerLearning.hubSync");
  const olTheme = useOlTheme();
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
    const timer = window.setTimeout(() => {
      void (async () => {
        const { progress, record } = await hydrateProgressFromHub();
        if (cancelled) return;
        onProgressHydrated?.(progress);
        if (record) {
          setDisplayName(record.displayName || session.user?.name || "");
          setHubSyncEnabled(Boolean(record.hubSyncEnabled));
          setShareWithLocal(Boolean(record.shareWithLocal));
        } else {
          setDisplayName(session.user?.name || "");
        }
        setLoaded(true);
      })();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [session, status, onProgressHydrated]);

  if (status === "loading") return null;

  if (status !== "authenticated") {
    return (
      <div className={clsx(olTheme.surface, "p-4 text-sm")}>
        <p className={olTheme.syncSignedOutTitle}>{t("signedOutTitle")}</p>
        <p className={olTheme.syncSignedOutBody}>{t("signedOutBody")}</p>
        <Link href="/app/login" className={clsx("mt-3 inline-block", olTheme.link)}>
          {t("signIn")} →
        </Link>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    setMessage("idle");
    const ok = await pushHubProgress({
      displayName: displayName.trim() || session.user?.name || "Steward",
      hubSyncEnabled,
      shareWithLocal: hubSyncEnabled ? shareWithLocal : false,
      modules: getAllProgress(),
    });
    setMessage(ok ? "saved" : "error");
    setSaving(false);
  };

  return (
    <div className={olTheme.syncPanel}>
      <div>
        <p className={olTheme.syncTitle}>{t("title")}</p>
        <p className={olTheme.syncBody}>{t("body")}</p>
      </div>

      {loaded && (
        <>
          <label className={clsx("block", olTheme.syncLabel)}>
            {t("displayName")}
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={olTheme.input}
            />
          </label>

          <label className={clsx("flex items-start gap-3", olTheme.syncLabel)}>
            <input
              type="checkbox"
              checked={hubSyncEnabled}
              onChange={(e) => {
                setHubSyncEnabled(e.target.checked);
                if (!e.target.checked) setShareWithLocal(false);
              }}
              className={clsx("mt-1", olTheme.inputAccent)}
            />
            <span>
              <span className="font-semibold">{t("syncLabel")}</span>
              <span className={olTheme.syncHint}>{t("syncHint")}</span>
            </span>
          </label>

          <label
            className={clsx(
              "flex items-start gap-3",
              olTheme.syncLabel,
              !hubSyncEnabled && "opacity-50",
            )}
          >
            <input
              type="checkbox"
              checked={shareWithLocal}
              disabled={!hubSyncEnabled}
              onChange={(e) => setShareWithLocal(e.target.checked)}
              className={clsx("mt-1", olTheme.inputAccent)}
            />
            <span>
              <span className="font-semibold">{t("shareLabel")}</span>
              <span className={olTheme.syncHint}>{t("shareHint")}</span>
            </span>
          </label>

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className={olTheme.btnPrimarySm}
          >
            {saving ? t("saving") : t("save")}
          </button>
          {message === "saved" && (
            <p className={olTheme.successText} role="status">
              {t("saved")}
            </p>
          )}
          {message === "error" && (
            <p className={olTheme.errorText} role="alert">
              {t("error")}
            </p>
          )}
        </>
      )}
    </div>
  );
}
