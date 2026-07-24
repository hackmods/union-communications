"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { useStewardReadOnly } from "@/hooks/use-steward-read-only";
import { canWriteMinutes } from "@/lib/minutes/access";
import type { MeetingMinutes } from "@/types/minutes";
import type { UserRole } from "@/types/tenant";

export function MinutesList() {
  const t = useTranslations("minutes");
  const th = useTranslations("hub");
  const { data: session } = useSession();
  const { readOnly } = useStewardReadOnly();
  const roles = (session?.user?.roles ?? []) as UserRole[];
  const canWrite = canWriteMinutes(roles) && !readOnly;

  const [entries, setEntries] = useState<MeetingMinutes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/minutes")
      .then(async (res) => {
        if (!res.ok) throw new Error("fail");
        const data = (await res.json()) as { minutes: MeetingMinutes[] };
        setEntries(data.minutes);
        setError(null);
      })
      .catch(() => setError(t("loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-opseu-dark">{t("title")}</h1>
          <p className="mt-1 text-sm text-gray-600">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/app"
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-opseu-dark hover:bg-gray-50"
          >
            {th("backToDashboard")}
          </Link>
          {canWrite ? (
            <Link href="/app/minutes/new">
              <Button type="button">{t("newMinutes")}</Button>
            </Link>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-label={t("loading")}>
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : entries.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <li key={entry.id}>
              <Card className="p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-base">
                      <Link
                        href={`/app/minutes/${entry.id}`}
                        className="text-opseu-blue underline-offset-2 hover:underline"
                      >
                        {t(`meetingType.${entry.meetingType}`)} —{" "}
                        {new Date(entry.meetingDate).toLocaleDateString()}
                      </Link>
                    </CardTitle>
                    <p className="mt-1 text-sm text-gray-600">
                      {t("listMeta", {
                        motions: entry.motions.length,
                        by: entry.recordedByName,
                      })}
                    </p>
                  </div>
                  <Badge
                    variant={
                      entry.status === "approved" ? "success" : "muted"
                    }
                  >
                    {t(`status.${entry.status}`)}
                  </Badge>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
