"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

type Props = {
  localId: string;
  archived: boolean;
};

/**
 * Client archive/restore so the browser does not navigate to a JSON API body.
 */
export function LocalArchiveButton({ localId, archived }: Props) {
  const t = useTranslations("hub.platformOperator");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setError(null);
    try {
      const action = archived ? "restore" : "archive";
      const res = await fetch(
        `/api/site-admin/locals/${encodeURIComponent(localId)}/${action}`,
        { method: "POST" },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(
          data.error ??
            (archived ? t("localRestoreFailed") : t("localArchiveFailed")),
        );
        return;
      }
      router.refresh();
    } catch {
      setError(archived ? t("localRestoreFailed") : t("localArchiveFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => void onClick()}
        className="rounded-md border border-opseu-gray/30 bg-white px-2 py-1 text-xs font-semibold text-opseu-dark shadow-sm transition hover:border-opseu-blue/40 hover:text-opseu-blue disabled:opacity-50"
      >
        {busy
          ? t("localArchiveSaving")
          : archived
            ? t("localRestore")
            : t("localArchive")}
      </button>
      {error ? (
        <span className="max-w-[12rem] text-right text-xs text-red-700" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}
