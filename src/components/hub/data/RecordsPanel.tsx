"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import type { PersonListItem, PersonProfile } from "@/lib/data-workbench/types";
import { PersonProfilePanel } from "./PersonProfilePanel";

const inputClass = "min-h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm";

type Props = {
  request: <T>(url: string, init?: RequestInit) => Promise<T>;
  datasets: Array<{ id: string; name: string; kind: string }>;
  busy: boolean;
  setBusy: (value: boolean) => void;
  setMessage: (value: string) => void;
};

export function RecordsPanel({ request, datasets, busy, setBusy, setMessage }: Props) {
  const t = useTranslations("dataWorkbench");
  const [people, setPeople] = useState<PersonListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [asOf, setAsOf] = useState("");
  const [query, setQuery] = useState("");
  const [duesStanding, setDuesStanding] = useState("");
  const [offset, setOffset] = useState(0);
  const [profile, setProfile] = useState<PersonProfile | null>(null);
  const [records, setRecords] = useState<Array<{ rowIndex: number; values: Record<string, unknown> }>>([]);
  const [tableDatasetId, setTableDatasetId] = useState("");
  const limit = 50;

  const loadPeople = useCallback(async (nextOffset = 0, filters?: { q: string; asOf: string; duesStanding: string }) => {
    const q = filters?.q ?? query;
    const asOfValue = filters?.asOf ?? asOf;
    const standing = filters?.duesStanding ?? duesStanding;
    setBusy(true);
    setMessage("");
    try {
      const params = new URLSearchParams({
        offset: String(nextOffset),
        limit: String(limit),
      });
      if (q.trim()) params.set("q", q.trim());
      if (asOfValue.trim()) params.set("asOf", asOfValue.trim());
      if (standing) params.set("duesStanding", standing);
      const result = await request<{ people: PersonListItem[]; total: number; asOf: string }>(
        `/api/data/records/people?${params}`,
      );
      setPeople(result.people);
      setTotal(result.total);
      setOffset(nextOffset);
      if (!asOfValue.trim() && result.asOf) setAsOf(result.asOf);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("requestFailed"));
    } finally {
      setBusy(false);
    }
  }, [asOf, duesStanding, query, request, setBusy, setMessage, t]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ offset: "0", limit: String(limit) });
    void request<{ people: PersonListItem[]; total: number; asOf: string }>(
      `/api/data/records/people?${params}`,
    ).then((result) => {
      if (cancelled) return;
      setPeople(result.people);
      setTotal(result.total);
      setOffset(0);
      setAsOf((current) => current || result.asOf);
    }).catch((error: unknown) => {
      if (!cancelled) setMessage(error instanceof Error ? error.message : t("requestFailed"));
    });
    return () => { cancelled = true; };
  }, [request, setMessage, t]);

  async function openProfile(personId: string) {
    setBusy(true);
    setMessage("");
    try {
      const params = asOf.trim() ? `?asOf=${encodeURIComponent(asOf.trim())}` : "";
      const result = await request<{ profile: PersonProfile }>(`/api/data/records/people/${personId}${params}`);
      setProfile(result.profile);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("requestFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function showRecords(datasetId: string) {
    setTableDatasetId(datasetId);
    if (!datasetId) {
      setRecords([]);
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const result = await request<{ records: typeof records }>(`/api/data/datasets/${datasetId}/records`);
      setRecords(result.records);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("requestFailed"));
    } finally {
      setBusy(false);
    }
  }

  const tableHeaders = records[0] ? Object.keys(records[0].values) : [];

  return (
    <div className="space-y-5">
      <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        {t("activeLocalBanner")}
      </p>
      <p className="text-sm text-gray-700">{t("recordsSensitivity")}</p>

      {profile ? (
        <PersonProfilePanel
          profile={profile}
          onClose={() => setProfile(null)}
          onOpenPerson={(id) => void openProfile(id)}
        />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.75fr)]">
          <Card density="compact" className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <CardTitle>{t("people")}</CardTitle>
              <p className="text-sm text-gray-600">{t("peopleCount", { count: total, asOf: asOf || "—" })}</p>
            </div>
            <form
              className="grid gap-3 sm:grid-cols-[1fr_10rem_10rem_auto]"
              onSubmit={(event) => {
                event.preventDefault();
                void loadPeople(0);
              }}
            >
              <label className="block space-y-1 text-sm">
                <span>{t("searchPeople")}</span>
                <input
                  className={inputClass}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("searchPeoplePlaceholder")}
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span>{t("asOfDate")}</span>
                <input
                  className={inputClass}
                  type="date"
                  value={asOf}
                  onChange={(event) => setAsOf(event.target.value)}
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span>{t("filterDuesStanding")}</span>
                <select
                  className={inputClass}
                  value={duesStanding}
                  onChange={(event) => setDuesStanding(event.target.value)}
                >
                  <option value="">{t("anyStanding")}</option>
                  <option value="good">{t("standing.good")}</option>
                  <option value="arrears">{t("standing.arrears")}</option>
                  <option value="unknown">{t("standing.unknown")}</option>
                  <option value="exempt">{t("standing.exempt")}</option>
                </select>
              </label>
              <div className="flex items-end">
                <Button type="submit" disabled={busy}>{t("applyFilters")}</Button>
              </div>
            </form>

            {people.length === 0 ? (
              <p className="rounded-md bg-gray-50 p-4 text-sm text-gray-700">{t("noPeople")}</p>
            ) : (
              <>
                <div className="overflow-x-auto rounded-md border border-gray-200">
                  <table className="min-w-full text-left text-sm">
                    <caption className="sr-only">{t("people")}</caption>
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="p-2">{t("name")}</th>
                        <th scope="col" className="p-2">{t("memberNumber")}</th>
                        <th scope="col" className="p-2">{t("duesStandingLabel")}</th>
                        <th scope="col" className="p-2">{t("openJobs")}</th>
                        <th scope="col" className="p-2">{t("profile")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {people.map((person) => (
                        <tr key={person.id} className="border-t border-gray-100 align-top">
                          <td className="p-2 font-medium text-opseu-dark">{person.displayName}</td>
                          <td className="p-2">{person.memberNumber || "—"}</td>
                          <td className="p-2">
                            {person.duesStanding
                              ? t(`standing.${person.duesStanding}` as "standing.good")
                              : "—"}
                          </td>
                          <td className="p-2">
                            <span className="font-medium">{person.openJobCount}</span>
                            {person.assignments.length > 0 && (
                              <ul className="mt-1 space-y-0.5 text-xs text-gray-600">
                                {person.assignments.map((job) => (
                                  <li key={job.id}>
                                    {[job.jobTitle, job.employer].filter(Boolean).join(" · ") || job.positionKey}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                          <td className="p-2">
                            <button
                              type="button"
                              className="min-h-11 text-opseu-blue underline"
                              onClick={() => void openProfile(person.id)}
                            >
                              {t("openProfile")}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={offset === 0 || busy}
                    onClick={() => void loadPeople(Math.max(0, offset - limit))}
                  >
                    {t("previousPage")}
                  </Button>
                  <span className="text-sm text-gray-600">
                    {t("page", {
                      current: Math.floor(offset / limit) + 1,
                      total: Math.max(1, Math.ceil(total / limit)),
                    })}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={offset + people.length >= total || busy}
                    onClick={() => void loadPeople(offset + limit)}
                  >
                    {t("nextPage")}
                  </Button>
                </div>
              </>
            )}
          </Card>

          <Card density="compact" className="space-y-3">
            <CardTitle>{t("tableRecords")}</CardTitle>
            <p className="text-sm text-gray-700">{t("tableRecordsHelp")}</p>
            <label className="block space-y-1 text-sm">
              <span>{t("chooseDataset")}</span>
              <select
                className={inputClass}
                value={tableDatasetId}
                onChange={(event) => void showRecords(event.target.value)}
              >
                <option value="">{t("chooseDataset")}</option>
                {datasets.filter((dataset) => dataset.kind === "table").map((dataset) => (
                  <option key={dataset.id} value={dataset.id}>{dataset.name}</option>
                ))}
              </select>
            </label>
            {records.length === 0 ? (
              <p className="text-sm text-gray-600">{t("noTableRecords")}</p>
            ) : (
              <div className="max-h-96 overflow-auto rounded-md border border-gray-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2">{t("row")}</th>
                      {tableHeaders.map((header) => (
                        <th key={header} className="p-2">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr key={record.rowIndex} className="border-t border-gray-100">
                        <td className="p-2">{record.rowIndex}</td>
                        {tableHeaders.map((header) => (
                          <td key={header} className="max-w-40 truncate p-2" title={String(record.values[header] ?? "")}>
                            {String(record.values[header] ?? "—")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
