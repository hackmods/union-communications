"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { useStewardReadOnly } from "@/hooks/use-steward-read-only";
import {
  canApproveMinutes,
  canDeleteMinutes,
  canWriteMinutes,
} from "@/lib/minutes/access";
import {
  buildMinutesDocxBlob,
  minutesExportFilename,
} from "@/lib/minutes/export-docx";
import { resolveLocalNumber } from "@/lib/utils/local";
import type { MeetingMinutes } from "@/types/minutes";
import type { UserRole } from "@/types/tenant";

export function MinutesDetail({ minutesId }: { minutesId: string }) {
  const t = useTranslations("minutes");
  const { data: session } = useSession();
  const router = useRouter();
  const { readOnly } = useStewardReadOnly();
  const roles = (session?.user?.roles ?? []) as UserRole[];
  const userId = session?.user?.id ?? "";
  const canWrite = canWriteMinutes(roles) && !readOnly;
  const canApprove = canApproveMinutes(roles) && !readOnly;

  const [entry, setEntry] = useState<MeetingMinutes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/minutes/${minutesId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("fail");
        const data = (await res.json()) as { minutes: MeetingMinutes };
        if (!cancelled) {
          setEntry(data.minutes);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(t("loadError"));
          setEntry(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [minutesId, t]);

  async function refresh() {
    const res = await fetch(`/api/minutes/${minutesId}`);
    if (!res.ok) {
      setError(t("loadError"));
      setEntry(null);
      return;
    }
    const data = (await res.json()) as { minutes: MeetingMinutes };
    setEntry(data.minutes);
    setError(null);
  }

  async function handleApprove() {
    if (!entry || !canApprove || entry.status === "approved") return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/minutes/${entry.id}/approve`, {
      method: "POST",
    });
    setBusy(false);
    if (res.ok) {
      setMessage(t("approved"));
      await refresh();
    } else if (res.status === 409) {
      setError(t("alreadyApproved"));
      await refresh();
    } else {
      setError(t("approveError"));
    }
  }

  async function handleDelete() {
    if (!entry || !canDeleteMinutes(entry, userId, roles) || readOnly) return;
    setBusy(true);
    const res = await fetch(`/api/minutes/${entry.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      router.push("/app/minutes");
    } else {
      setError(t("deleteError"));
    }
  }

  async function handleExport() {
    if (!entry) return;
    setBusy(true);
    setError(null);
    try {
      const localLabel = `Local ${resolveLocalNumber()}`;
      const blob = await buildMinutesDocxBlob(entry, localLabel);
      const { saveAs } = await import("file-saver");
      saveAs(blob, minutesExportFilename(entry));
      setMessage(t("exported"));
    } catch {
      setError(t("exportError"));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label={t("loading")}>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-700" role="alert">
          {error ?? t("notFound")}
        </p>
        <Link href="/app/minutes" className="text-opseu-blue underline">
          {t("backToList")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge
              variant={entry.status === "approved" ? "success" : "muted"}
            >
              {t(`status.${entry.status}`)}
            </Badge>
            <span className="text-sm text-gray-500">
              {t(`meetingType.${entry.meetingType}`)}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-opseu-dark">
            {t("detailTitle", {
              date: new Date(entry.meetingDate).toLocaleDateString(),
            })}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {t("recordedBy", { name: entry.recordedByName })}
            {entry.approvedAt
              ? ` · ${t("approvedAt", {
                  date: new Date(entry.approvedAt).toLocaleDateString(),
                })}`
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/app/minutes"
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
          >
            {t("backToList")}
          </Link>
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => void handleExport()}
          >
            {t("exportDocx")}
          </Button>
          {canApprove && entry.status === "draft" ? (
            <Button
              type="button"
              disabled={busy}
              onClick={() => void handleApprove()}
            >
              {t("approve")}
            </Button>
          ) : null}
          {canWrite && canDeleteMinutes(entry, userId, roles) ? (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void handleDelete()}
            >
              {t("delete")}
            </Button>
          ) : null}
        </div>
      </div>

      {message ? (
        <p className="text-sm text-green-800" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <Card className="space-y-3 p-4 sm:p-6">
        <CardTitle className="text-base">{t("fields.attendees")}</CardTitle>
        <p className="text-sm text-gray-800">
          {entry.attendees.length > 0
            ? entry.attendees.join(", ")
            : t("noAttendees")}
        </p>
      </Card>

      <Card className="space-y-4 p-4 sm:p-6">
        <CardTitle className="text-base">{t("fields.motions")}</CardTitle>
        {entry.motions.length === 0 ? (
          <p className="text-sm text-gray-600">{t("noMotions")}</p>
        ) : (
          <ol className="list-decimal space-y-4 pl-5">
            {entry.motions.map((motion, index) => (
              <li key={index} className="text-sm text-gray-800">
                <p className="font-medium">{motion.text}</p>
                <p className="mt-1 text-gray-600">
                  {t("motionMeta", {
                    movedBy: motion.movedBy,
                    secondedBy: motion.secondedBy,
                  })}
                </p>
                <p className="mt-1 text-gray-600">
                  {t("voteMeta", {
                    for: motion.vote.for,
                    against: motion.vote.against,
                    abstain: motion.vote.abstain,
                    result: t(`result.${motion.result}`),
                  })}
                </p>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card className="space-y-3 p-4 sm:p-6">
        <CardTitle className="text-base">{t("fields.notes")}</CardTitle>
        <p className="whitespace-pre-wrap text-sm text-gray-800">
          {entry.notes.trim() ? entry.notes : t("noNotes")}
        </p>
      </Card>
    </div>
  );
}
