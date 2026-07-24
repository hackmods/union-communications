"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import type {
  ElectionCycle,
  NominationStatus,
} from "@/types/elections";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function buildTallyDraft(cycle: ElectionCycle | null) {
  if (!cycle) return [];
  if (cycle.tallies.length > 0) {
    return cycle.tallies.map((row) => ({
      position: row.position,
      nomineeName: row.nomineeName,
      votes: String(row.votes),
    }));
  }
  return cycle.nominations
    .filter((n) => n.status === "accepted")
    .map((n) => ({
      position: n.position,
      nomineeName: n.nomineeName,
      votes: "0",
    }));
}

export function ElectionsBoard() {
  const t = useTranslations("elections");
  const [cycles, setCycles] = useState<ElectionCycle[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [positionsRaw, setPositionsRaw] = useState("");
  const [termStart, setTermStart] = useState("");
  const [nomPosition, setNomPosition] = useState("");
  const [nomName, setNomName] = useState("");
  const [nomNominator, setNomNominator] = useState("");
  const [tallyDraft, setTallyDraft] = useState<
    { position: string; nomineeName: string; votes: string }[]
  >([]);
  const [exportError, setExportError] = useState<string | null>(null);

  const selected = cycles.find((c) => c.id === selectedId) ?? null;

  function selectCycle(cycle: ElectionCycle | null) {
    setSelectedId(cycle?.id ?? null);
    setTallyDraft(buildTallyDraft(cycle));
    setNomPosition(cycle?.positions[0] ?? "");
  }

  async function refresh(preferId?: string | null) {
    const res = await fetch("/api/elections");
    if (!res.ok) {
      setError(t("loadError"));
      return;
    }
    const data = (await res.json()) as { cycles: ElectionCycle[] };
    setCycles(data.cycles);
    setError(null);
    const id = preferId ?? selectedId;
    const next =
      (id ? data.cycles.find((c) => c.id === id) : undefined) ??
      data.cycles[0] ??
      null;
    selectCycle(next);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/elections");
        if (!res.ok) throw new Error("fail");
        const data = (await res.json()) as { cycles: ElectionCycle[] };
        if (!cancelled) {
          setCycles(data.cycles);
          const first = data.cycles[0] ?? null;
          setSelectedId(first?.id ?? null);
          setTallyDraft(buildTallyDraft(first));
          setNomPosition(first?.positions[0] ?? "");
        }
      } catch {
        if (!cancelled) setError(t("loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  async function handleCreateCycle(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const positions = positionsRaw
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (positions.length === 0) {
      setError(t("createError"));
      return;
    }
    const res = await fetch("/api/elections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        positions,
        termStart: termStart.trim() || undefined,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { cycle: ElectionCycle };
      setMessage(t("created"));
      setShowForm(false);
      setTitle("");
      setPositionsRaw("");
      setTermStart("");
      await refresh(data.cycle.id);
    } else {
      setError(t("createError"));
    }
  }

  async function handleAddNomination(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/elections/${selected.id}/nominations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        position: nomPosition.trim(),
        nomineeName: nomName.trim(),
        nominator: nomNominator.trim() || undefined,
      }),
    });
    if (res.ok) {
      setMessage(t("nominationAdded"));
      setNomName("");
      setNomNominator("");
      await refresh();
    } else {
      setError(t("nominationError"));
    }
  }

  async function setNominationStatus(
    nominationId: string,
    status: NominationStatus,
  ) {
    if (!selected) return;
    setError(null);
    const res = await fetch(
      `/api/elections/${selected.id}/nominations/${nominationId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      },
    );
    if (res.ok) {
      setMessage(t("nominationUpdated"));
      await refresh();
    } else {
      setError(t("nominationError"));
    }
  }

  async function handleSaveTallies(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    setMessage(null);
    const tallies = tallyDraft.map((row) => ({
      position: row.position,
      nomineeName: row.nomineeName,
      votes: Number(row.votes) || 0,
    }));
    const res = await fetch(`/api/elections/${selected.id}/tallies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tallies, markTallied: true }),
    });
    if (res.ok) {
      setMessage(t("talliesSaved"));
      await refresh();
    } else {
      setError(t("talliesError"));
    }
  }

  async function exportBallot() {
    if (!selected) return;
    setExportError(null);
    try {
      const res = await fetch(`/api/elections/${selected.id}/ballot`);
      if (!res.ok) throw new Error("fail");
      const blob = await res.blob();
      downloadBlob(blob, `ballot-${selected.id}.docx`);
      setMessage(t("ballotExported"));
    } catch {
      setExportError(t("ballotError"));
    }
  }

  async function promoteWinner(position: string, nomineeName: string) {
    if (!selected) return;
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/elections/${selected.id}/promote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        position,
        nomineeName,
        role: position,
        termStart: selected.termStart,
      }),
    });
    if (res.ok) {
      setMessage(t("promoted"));
    } else {
      setError(t("promoteError"));
    }
  }

  async function handleDeleteCycle(id: string) {
    setError(null);
    const res = await fetch(`/api/elections/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMessage(t("deleted"));
      await refresh();
    } else {
      setError(t("deleteError"));
    }
  }

  function statusLabel(status: ElectionCycle["status"]) {
    if (status === "open") return t("statusOpen");
    if (status === "closed") return t("statusClosed");
    return t("statusTallied");
  }

  function nomStatusLabel(status: NominationStatus) {
    if (status === "pending") return t("nomPending");
    if (status === "accepted") return t("nomAccepted");
    return t("nomDeclined");
  }

  return (
    <PageShell size="wide" className="py-6 md:py-8">
      <h1 className="text-2xl font-semibold text-opseu-dark">{t("title")}</h1>
      <p className="mt-1 text-sm text-gray-600">{t("subtitle")}</p>
      <p className="mt-2 text-xs text-gray-500">{t("noOnlineVoting")}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? t("cancel") : t("newCycle")}
        </Button>
        {selected && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void exportBallot()}
          >
            {t("exportBallot")}
          </Button>
        )}
      </div>

      {exportError && (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {exportError}
        </p>
      )}
      {message && (
        <p className="mt-3 text-sm text-green-800" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {showForm && (
        <form
          onSubmit={(e) => void handleCreateCycle(e)}
          className="mt-4 grid gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2"
        >
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-gray-700">
              {t("colTitle")}
            </span>
            <Input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-gray-700">
              {t("colPositions")}
            </span>
            <Input
              required
              value={positionsRaw}
              onChange={(e) => setPositionsRaw(e.target.value)}
              placeholder={t("positionsHint")}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">
              {t("colTermStart")}
            </span>
            <Input
              type="date"
              value={termStart}
              onChange={(e) => setTermStart(e.target.value)}
            />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit">{t("saveCycle")}</Button>
          </div>
        </form>
      )}

      {loading && (
        <div
          className="mt-6 space-y-3"
          role="status"
          aria-busy="true"
          aria-label={t("loading")}
        >
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {!loading && cycles.length === 0 && (
        <EmptyState className="mt-6" title={t("empty")} />
      )}

      {cycles.length > 0 && (
        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,14rem)_1fr]">
          <ul className="space-y-2" aria-label={t("cycleList")}>
            {cycles.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                    c.id === selectedId
                      ? "border-opseu-red bg-white"
                      : "border-gray-200 bg-gray-50 hover:bg-white"
                  }`}
                  onClick={() => selectCycle(c)}
                >
                  <span className="font-medium text-opseu-dark">{c.title}</span>
                  <span className="mt-0.5 block text-xs text-gray-500">
                    {statusLabel(c.status)}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {selected && (
            <div className="space-y-6 rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-opseu-dark">
                    {selected.title}
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    {selected.positions.join(" · ")} · {statusLabel(selected.status)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleDeleteCycle(selected.id)}
                >
                  {t("delete")}
                </Button>
              </div>

              <section>
                <h3 className="text-sm font-semibold text-gray-800">
                  {t("nominationsHeading")}
                </h3>
                {selected.nominations.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500">{t("noNominations")}</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {selected.nominations.map((n) => (
                      <li
                        key={n.id}
                        className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 py-2 text-sm"
                      >
                        <div>
                          <span className="font-medium">{n.nomineeName}</span>
                          <span className="text-gray-500">
                            {" "}
                            · {n.position} · {nomStatusLabel(n.status)}
                          </span>
                          {n.nominator && (
                            <span className="block text-xs text-gray-400">
                              {t("nominatedBy", { name: n.nominator })}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {n.status !== "accepted" && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                void setNominationStatus(n.id, "accepted")
                              }
                            >
                              {t("accept")}
                            </Button>
                          )}
                          {n.status !== "declined" && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                void setNominationStatus(n.id, "declined")
                              }
                            >
                              {t("decline")}
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <form
                  onSubmit={(e) => void handleAddNomination(e)}
                  className="mt-3 grid gap-2 sm:grid-cols-2"
                >
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-gray-700">
                      {t("colPosition")}
                    </span>
                    <select
                      className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      value={nomPosition}
                      onChange={(e) => setNomPosition(e.target.value)}
                      required
                    >
                      {selected.positions.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-gray-700">
                      {t("colNominee")}
                    </span>
                    <Input
                      required
                      value={nomName}
                      onChange={(e) => setNomName(e.target.value)}
                    />
                  </label>
                  <label className="block text-sm sm:col-span-2">
                    <span className="mb-1 block font-medium text-gray-700">
                      {t("colNominator")}
                    </span>
                    <Input
                      value={nomNominator}
                      onChange={(e) => setNomNominator(e.target.value)}
                    />
                  </label>
                  <div className="sm:col-span-2">
                    <Button type="submit" size="sm">
                      {t("addNomination")}
                    </Button>
                  </div>
                </form>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-gray-800">
                  {t("talliesHeading")}
                </h3>
                <p className="mt-1 text-xs text-gray-500">{t("talliesHint")}</p>
                <form
                  onSubmit={(e) => void handleSaveTallies(e)}
                  className="mt-3 space-y-2"
                >
                  {tallyDraft.length === 0 ? (
                    <p className="text-sm text-gray-500">{t("noTalliesYet")}</p>
                  ) : (
                    tallyDraft.map((row, idx) => (
                      <div
                        key={`${row.position}-${row.nomineeName}-${idx}`}
                        className="grid grid-cols-[1fr_1fr_6rem] gap-2 text-sm"
                      >
                        <span className="self-center truncate">{row.position}</span>
                        <span className="self-center truncate">
                          {row.nomineeName}
                        </span>
                        <Input
                          type="number"
                          min={0}
                          value={row.votes}
                          onChange={(e) => {
                            const next = [...tallyDraft];
                            next[idx] = { ...row, votes: e.target.value };
                            setTallyDraft(next);
                          }}
                          aria-label={t("colVotes")}
                        />
                      </div>
                    ))
                  )}
                  {tallyDraft.length > 0 && (
                    <Button type="submit" size="sm">
                      {t("saveTallies")}
                    </Button>
                  )}
                </form>
              </section>

              {selected.tallies.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-800">
                    {t("promoteHeading")}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">{t("promoteHint")}</p>
                  <ul className="mt-2 space-y-2">
                    {selected.tallies.map((row) => (
                      <li
                        key={`${row.position}-${row.nomineeName}`}
                        className="flex flex-wrap items-center justify-between gap-2 text-sm"
                      >
                        <span>
                          {row.nomineeName} · {row.position} · {row.votes}{" "}
                          {t("votes")}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            void promoteWinner(row.position, row.nomineeName)
                          }
                        >
                          {t("promote")}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
