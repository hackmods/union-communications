"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { useMfaEnabled, useSessionMfaOk } from "@/components/hub/MfaPolicyProvider";
import type {
  HubProposalPackage,
  HubProposalPackageStatus,
} from "@/types/hub-proposals";

const STATUSES: HubProposalPackageStatus[] = ["active", "closed", "archived"];

const STATUS_BADGE: Record<
  HubProposalPackageStatus,
  "default" | "warning" | "muted"
> = {
  active: "default",
  closed: "warning",
  archived: "muted",
};

export function ProposalsBoard() {
  const t = useTranslations("hubProposals");
  const { data: session } = useSession();
  const mfaEnabled = useMfaEnabled();
  const mfaOk = useSessionMfaOk();
  const mfaBlocked = mfaEnabled && !mfaOk;
  const [packages, setPackages] = useState<HubProposalPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [roundLabel, setRoundLabel] = useState("");
  const [status, setStatus] = useState<HubProposalPackageStatus>("active");
  const [caucusNote, setCaucusNote] = useState("");

  async function refresh() {
    const res = await fetch("/api/proposals");
    if (!res.ok) {
      setError(t("loadError"));
      return;
    }
    const data = (await res.json()) as { packages: HubProposalPackage[] };
    setPackages(data.packages);
    setError(null);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/proposals");
        if (!res.ok) throw new Error("fail");
        const data = (await res.json()) as { packages: HubProposalPackage[] };
        if (!cancelled) setPackages(data.packages);
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setMessage(null);
    const res = await fetch("/api/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        roundLabel: roundLabel.trim(),
        status,
        caucusNote: caucusNote.trim(),
      }),
    });
    if (res.ok) {
      setMessage(t("created"));
      setName("");
      setRoundLabel("");
      setCaucusNote("");
      setShowForm(false);
      await refresh();
    } else {
      setError(t("createError"));
    }
  }

  const canWrite = Boolean(session?.user) && !mfaBlocked;

  return (
    <>
      <h1 className="text-2xl font-semibold text-opseu-dark">{t("title")}</h1>
      <p className="mt-1 text-sm text-gray-600">{t("subtitle")}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={!canWrite}
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? t("cancel") : t("newPackage")}
        </Button>
      </div>

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
          onSubmit={(e) => void handleCreate(e)}
          className="mt-4 grid gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2"
        >
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">
              {t("colName")}
            </span>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">
              {t("colRound")}
            </span>
            <Input
              value={roundLabel}
              onChange={(e) => setRoundLabel(e.target.value)}
              placeholder={t("roundPlaceholder")}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">
              {t("colStatus")}
            </span>
            <Select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as HubProposalPackageStatus)
              }
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`packageStatus.${s}`)}
                </option>
              ))}
            </Select>
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-gray-700">
              {t("colCaucusNote")}
            </span>
            <Textarea
              rows={2}
              value={caucusNote}
              onChange={(e) => setCaucusNote(e.target.value)}
              placeholder={t("caucusPlaceholder")}
            />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit">{t("save")}</Button>
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

      {!loading && !error && packages.length === 0 && (
        <EmptyState className="mt-6" title={t("empty")} />
      )}

      {packages.length > 0 && (
        <ul className="mt-6 space-y-3">
          {packages.map((pkg) => (
            <li
              key={pkg.id}
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-opseu-dark">
                      {pkg.name}
                    </h2>
                    <Badge variant={STATUS_BADGE[pkg.status]}>
                      {t(`packageStatus.${pkg.status}`)}
                    </Badge>
                    {pkg.publishedSummary ? (
                      <Badge variant="success">{t("liveOnPortal")}</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {pkg.roundLabel
                      ? t("roundLabel", { round: pkg.roundLabel })
                      : t("noRound")}
                    {" · "}
                    {t("updatedLabel", {
                      date: new Date(pkg.updatedAt).toLocaleString(),
                    })}
                  </p>
                  {pkg.caucusNote.trim() ? (
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                      {pkg.caucusNote}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/app/proposals/${pkg.id}`}
                    className="inline-flex min-h-9 items-center rounded-md border border-gray-300 px-3 text-sm font-medium text-opseu-dark hover:bg-gray-50"
                  >
                    {t("openPackage")}
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}