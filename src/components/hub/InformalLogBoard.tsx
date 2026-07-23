"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useStewardReadOnly } from "@/hooks/use-steward-read-only";
import {
  canConvertInformalLog,
  canCreateInformalLog,
  canDeleteInformalLog,
} from "@/lib/informal-log/access";
import type { InformalLogEntry } from "@/types/informal-log";
import type { CommunicationChannel } from "@/types/qol";
import type { UserRole } from "@/types/tenant";

const CHANNELS: CommunicationChannel[] = [
  "in_person",
  "email",
  "phone",
  "letter",
  "other",
];

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function InformalLogBoard() {
  const t = useTranslations("informalLog");
  const th = useTranslations("hub");
  const { data: session } = useSession();
  const { readOnly } = useStewardReadOnly();
  const roles = (session?.user?.roles ?? []) as UserRole[];
  const userId = session?.user?.id ?? "";
  const canWrite = canCreateInformalLog(roles) && !readOnly;
  const canConvert = canConvertInformalLog(roles) && !readOnly;

  const [entries, setEntries] = useState<InformalLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [unconvertedOnly, setUnconvertedOnly] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const [topic, setTopic] = useState("");
  const [summary, setSummary] = useState("");
  const [channel, setChannel] = useState<CommunicationChannel>("in_person");
  const [memberPseudonym, setMemberPseudonym] = useState("");
  const [occurredAt, setOccurredAt] = useState(() =>
    toLocalInputValue(new Date().toISOString()),
  );

  async function refresh(filterUnconverted = unconvertedOnly) {
    const params = new URLSearchParams();
    if (filterUnconverted) params.set("unconverted", "1");
    const res = await fetch(`/api/informal-log?${params.toString()}`);
    if (!res.ok) {
      setError(t("loadError"));
      return;
    }
    const data = (await res.json()) as { entries: InformalLogEntry[] };
    setEntries(data.entries);
    setError(null);
  }

  useEffect(() => {
    void fetch(
      `/api/informal-log${unconvertedOnly ? "?unconverted=1" : ""}`,
    )
      .then(async (res) => {
        if (!res.ok) throw new Error("fail");
        const data = (await res.json()) as { entries: InformalLogEntry[] };
        setEntries(data.entries);
        setError(null);
      })
      .catch(() => setError(t("loadError")))
      .finally(() => setLoading(false));
  }, [unconvertedOnly, t]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    setError(null);
    const res = await fetch("/api/informal-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic,
        summary,
        channel,
        occurredAt: new Date(occurredAt).toISOString(),
        ...(memberPseudonym.trim()
          ? { memberPseudonym: memberPseudonym.trim() }
          : {}),
      }),
    });
    if (res.ok) {
      setTopic("");
      setSummary("");
      setChannel("in_person");
      setMemberPseudonym("");
      setOccurredAt(toLocalInputValue(new Date().toISOString()));
      setShowForm(false);
      setMessage(t("created"));
      await refresh();
    } else {
      setError(t("createError"));
    }
  }

  async function handleConvert(entry: InformalLogEntry) {
    if (!canConvert || entry.convertedToGrievanceId) return;
    setConvertingId(entry.id);
    setError(null);
    const res = await fetch(`/api/informal-log/${entry.id}/convert`, {
      method: "POST",
    });
    setConvertingId(null);
    if (res.ok) {
      const data = (await res.json()) as {
        grievance: { id: string };
      };
      setMessage(t("converted", { id: data.grievance.id }));
      await refresh();
    } else if (res.status === 409) {
      setError(t("alreadyConverted"));
      await refresh();
    } else {
      setError(t("convertError"));
    }
  }

  async function handleDelete(entry: InformalLogEntry) {
    if (!canDeleteInformalLog(entry, userId, roles) || readOnly) return;
    const res = await fetch(`/api/informal-log/${entry.id}`, {
      method: "DELETE",
    });
    if (res.ok) await refresh();
    else setError(t("deleteError"));
  }

  if (loading && entries.length === 0) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label={t("loading")}>
        <Skeleton className="h-8 w-56 max-w-full" />
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  return (
    <div>
      {readOnly && (
        <p
          className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
          role="status"
        >
          {t("readOnlyBanner")}
        </p>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-opseu-dark">{t("title")}</h1>
          <p className="mt-1 text-gray-600">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canWrite && (
            <Button type="button" onClick={() => setShowForm((v) => !v)}>
              {showForm ? t("cancel") : t("newEntry")}
            </Button>
          )}
          <Link href="/app">
            <Button variant="outline">{th("backToDashboard")}</Button>
          </Link>
        </div>
      </div>

      <div
        className="mt-6 flex flex-wrap gap-2"
        role="group"
        aria-label={t("filterLabel")}
      >
        <Button
          type="button"
          variant={!unconvertedOnly ? "primary" : "outline"}
          onClick={() => {
            setLoading(true);
            setUnconvertedOnly(false);
          }}
        >
          {t("filter.all")}
        </Button>
        <Button
          type="button"
          variant={unconvertedOnly ? "primary" : "outline"}
          onClick={() => {
            setLoading(true);
            setUnconvertedOnly(true);
          }}
        >
          {t("filter.unconverted")}
        </Button>
      </div>

      {message && (
        <p className="mt-4 text-sm text-green-700" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {showForm && canWrite && (
        <Card className="mt-6 space-y-3">
          <CardTitle>{t("newEntry")}</CardTitle>
          <form onSubmit={handleCreate} className="space-y-3">
            <Input
              label={t("fields.topic")}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
            />
            <Input
              label={t("fields.memberPseudonym")}
              value={memberPseudonym}
              onChange={(e) => setMemberPseudonym(e.target.value)}
              placeholder={t("fields.memberPseudonymHint")}
            />
            <Select
              label={t("fields.channel")}
              value={channel}
              onChange={(e) =>
                setChannel(e.target.value as CommunicationChannel)
              }
              required
            >
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {t(`channel.${c}`)}
                </option>
              ))}
            </Select>
            <Input
              label={t("fields.occurredAt")}
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              required
            />
            <Textarea
              label={t("fields.summary")}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={4}
              required
            />
            <Button type="submit">{t("save")}</Button>
          </form>
        </Card>
      )}

      {entries.length === 0 ? (
        <div className="mt-6">
          <EmptyState title={t("empty")} />
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {entries.map((entry) => {
            const converted = !!entry.convertedToGrievanceId;
            const canRemove = canDeleteInformalLog(entry, userId, roles);
            return (
              <li key={entry.id}>
                <Card density="compact" className="space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-semibold text-opseu-dark">
                        {entry.topic}
                      </h2>
                      <p className="text-sm text-gray-600">
                        {t("meta", {
                          channel: t(`channel.${entry.channel}`),
                          when: new Date(entry.occurredAt).toLocaleString(),
                          by: entry.loggedByName,
                        })}
                      </p>
                      {entry.memberPseudonym && (
                        <p className="text-sm text-gray-700">
                          {t("memberLabel", {
                            name: entry.memberPseudonym,
                          })}
                        </p>
                      )}
                    </div>
                    {converted && entry.convertedToGrievanceId && (
                      <Link
                        href={`/app/grievances/${entry.convertedToGrievanceId}`}
                        className="text-sm font-medium text-opseu-blue hover:underline"
                      >
                        {t("viewGrievance")}
                      </Link>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-gray-800">
                    {entry.summary}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {canConvert && !converted && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={convertingId === entry.id}
                        onClick={() => void handleConvert(entry)}
                      >
                        {convertingId === entry.id
                          ? t("converting")
                          : t("convert")}
                      </Button>
                    )}
                    {canRemove && !readOnly && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleDelete(entry)}
                      >
                        {t("delete")}
                      </Button>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
