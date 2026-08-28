"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { OFFICER_LEARNING_MODULES } from "@/lib/officer-learning/modules";
import type { LocalReportRow, OfficerLearningLocalSettings } from "@/lib/officer-learning/types-hub";
import clsx from "clsx";

export function OfficerLearningHubBoard() {
  const t = useTranslations("officerLearning.hubBoard");
  const [settings, setSettings] = useState<OfficerLearningLocalSettings | null>(null);
  const [rows, setRows] = useState<LocalReportRow[]>([]);
  const [forbidden, setForbidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/officer-learning/local-report");
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as {
        settings: OfficerLearningLocalSettings;
        rows: LocalReportRow[];
      };
      setSettings(data.settings);
      setRows(data.rows);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const toggleReporting = async (reportingEnabled: boolean) => {
    setSaving(true);
    setError(false);
    try {
      const res = await fetch("/api/officer-learning/local-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportingEnabled }),
      });
      if (!res.ok) throw new Error("save failed");
      await refresh();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  if (forbidden) {
    return (
      <div className="rounded-xl border border-orange-200 bg-orange-50 p-6 text-opseu-dark">
        <p className="font-semibold">{t("forbiddenTitle")}</p>
        <p className="mt-2 text-sm">{t("forbiddenBody")}</p>
        <Link href="/guide/officer-learning" className="mt-4 inline-block font-medium underline">
          {t("openPublic")} →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="max-w-3xl">
        <h1 className="text-2xl font-bold text-opseu-dark md:text-3xl">{t("title")}</h1>
        <p className="mt-2 text-gray-700">{t("intro")}</p>
      </header>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-opseu-dark">{t("settingsTitle")}</h2>
        <p className="mt-2 text-sm text-gray-600">{t("settingsBody")}</p>
        <label className="mt-4 flex items-start gap-3 text-sm text-gray-800">
          <input
            type="checkbox"
            checked={Boolean(settings?.reportingEnabled)}
            disabled={saving || !settings}
            onChange={(e) => void toggleReporting(e.target.checked)}
            className="mt-1"
          />
          <span>
            <span className="font-semibold">{t("reportingLabel")}</span>
            <span className="mt-1 block text-gray-600">{t("reportingHint")}</span>
          </span>
        </label>
        {error && (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {t("error")}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-opseu-dark">{t("reportTitle")}</h2>
        {!settings?.reportingEnabled ? (
          <p className="mt-2 text-sm text-gray-600">{t("reportDisabled")}</p>
        ) : rows.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">{t("reportEmpty")}</p>
        ) : (
          <ul className="mt-4 divide-y divide-gray-100">
            {rows.map((row) => {
              const completed = OFFICER_LEARNING_MODULES.filter(
                (m) => row.modules[m.id]?.quizPassed,
              ).length;
              return (
                <li key={row.userId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium text-opseu-dark">{row.displayName}</p>
                    <p className="text-sm text-gray-600">
                      {t("completedCount", {
                        completed,
                        total: OFFICER_LEARNING_MODULES.length,
                      })}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {OFFICER_LEARNING_MODULES.map((m) => {
                      const passed = row.modules[m.id]?.quizPassed;
                      return (
                        <span
                          key={m.id}
                          className={clsx(
                            "rounded-full px-2 py-0.5 text-xs font-semibold",
                            passed
                              ? "bg-emerald-100 text-emerald-900"
                              : "bg-gray-100 text-gray-500",
                          )}
                          title={m.slug}
                        >
                          M{m.number}
                        </span>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="text-sm text-gray-600">
        <Link href="/guide/officer-learning" className="font-medium text-opseu-blue underline">
          {t("openPublic")} →
        </Link>
      </p>
    </div>
  );
}
