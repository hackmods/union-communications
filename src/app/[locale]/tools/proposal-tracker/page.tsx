"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useStewardGuideDraft } from "@/hooks/use-steward-guide-draft";
import { useExportHandler } from "@/hooks/use-export-handler";
import {
  clearProposalTrackerDraft,
  createEmptyProposalRow,
  createEmptyProposalTrackerDraft,
  loadProposalTrackerDraft,
  PROPOSAL_STATUSES,
  saveProposalTrackerDraft,
  serializeProposalTrackerCsv,
  type ProposalRow,
  type ProposalStatus,
} from "@/lib/proposal-tracker";
import { PageShell } from "@/components/layout/PageShell";
import { Callout } from "@/components/ui/Callout";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { ToolRelatedFooter } from "@/components/tools/ToolRelatedFooter";
import { HubDraftSyncPanel } from "@/components/tools/HubDraftSyncPanel";

function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const STATUS_BADGE: Record<
  ProposalStatus,
  "default" | "success" | "warning" | "danger" | "muted"
> = {
  open: "default",
  tentativelyAgreed: "success",
  unionWithdrew: "warning",
  employerWithdrew: "warning",
  impasse: "danger",
};

export default function ProposalTrackerPage() {
  const t = useTranslations("proposalTracker");
  const { draft, setDraft, saveFailed, clear } = useStewardGuideDraft({
    load: loadProposalTrackerDraft,
    save: saveProposalTrackerDraft,
    createEmpty: createEmptyProposalTrackerDraft,
    clearStorage: clearProposalTrackerDraft,
  });
  const { exportError, exportSuccess, exporting, runExport } =
    useExportHandler();

  const summary = useMemo(() => {
    const counts: Record<ProposalStatus, number> = {
      open: 0,
      tentativelyAgreed: 0,
      unionWithdrew: 0,
      employerWithdrew: 0,
      impasse: 0,
    };
    for (const row of draft.rows) counts[row.status] += 1;
    return counts;
  }, [draft.rows]);

  const updateRow = (id: string, patch: Partial<ProposalRow>) => {
    setDraft((prev) => ({
      rows: prev.rows.map((row) =>
        row.id === id ? { ...row, ...patch } : row,
      ),
    }));
  };

  const addRow = () => {
    setDraft((prev) => ({
      rows: [...prev.rows, createEmptyProposalRow()],
    }));
  };

  const removeRow = (id: string) => {
    setDraft((prev) => {
      if (prev.rows.length <= 1) {
        return { rows: [createEmptyProposalRow()] };
      }
      return { rows: prev.rows.filter((row) => row.id !== id) };
    });
  };

  const handleExportCsv = () => {
    void runExport(async () => {
      downloadText(
        "proposal-tracker.csv",
        serializeProposalTrackerCsv(draft.rows),
        "text/csv;charset=utf-8",
      );
    });
  };

  const nonEmptyRows = draft.rows.filter(
    (row) => row.article.trim() || row.unionProposal.trim(),
  ).length;

  return (
    <PageShell className="py-6 md:py-8 lg:py-10">
      <header className="max-w-3xl">
        <Eyebrow tone="brand">{t("eyebrow")}</Eyebrow>
        <h1 className="mt-2 text-2xl font-bold text-opseu-dark md:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-1 max-w-prose text-gray-700">{t("subtitle")}</p>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">{t("whenToUse")}</p>
        <p className="mt-3">
          <Link
            href="/guide/bargaining"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-opseu-blue underline underline-offset-2"
          >
            {t("guideLink")} →
          </Link>
        </p>
      </header>

      <Callout tone="muted" className="mt-6 max-w-3xl">
        <p className="font-medium text-gray-900">{t("trust.title")}</p>
        <p className="mt-1">{t("trust.body")}</p>
      </Callout>

      {nonEmptyRows > 0 ? (
        <div
          className="mt-4 flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-white p-3"
          aria-label={t("summaryLabel")}
        >
          {PROPOSAL_STATUSES.map((status) => (
            <Badge key={status} variant={STATUS_BADGE[status]}>
              {t(`status.${status}`)} · {summary[status]}
            </Badge>
          ))}
        </div>
      ) : null}

      <HubDraftSyncPanel
        kind="proposals"
        syncLabel={`${t("draftName")} ${new Date().toLocaleDateString()}`}
        getPayload={() => {
          if (nonEmptyRows === 0) return null;
          return {
            name: `${t("draftName")} ${new Date().toLocaleDateString()}`,
            rows: draft.rows
              .filter(
                (row) =>
                  row.article.trim() || row.unionProposal.trim(),
              )
              .map((row) => ({
                id: row.id,
                article: row.article,
                currentLanguage: row.currentLanguage,
                unionProposal: row.unionProposal,
                employerCounter: row.employerCounter,
                status: row.status,
                notes: row.notes,
              })),
          };
        }}
        className="mt-4 max-w-3xl"
      />

      {saveFailed && (
        <Callout tone="warning" className="mt-4 max-w-3xl">
          <p>{t("saveFailed")}</p>
        </Callout>
      )}
      {exportError && (
        <Callout tone="warning" className="mt-4 max-w-3xl">
          <p>{exportError}</p>
        </Callout>
      )}
      {exportSuccess && (
        <Callout className="mt-4 max-w-3xl">
          <p>{exportSuccess}</p>
        </Callout>
      )}

      <div className="button-row mt-6 flex flex-wrap gap-2">
        <Button type="button" onClick={addRow}>
          {t("addProposal")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleExportCsv}
          disabled={exporting}
        >
          {t("exportCsv")} (CSV)
        </Button>
        <Button type="button" variant="ghost" onClick={clear}>
          {t("clearDraft")}
        </Button>
      </div>

      <div className="mt-4 min-w-0 w-full max-w-full overflow-x-auto overscroll-x-contain rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-[72rem] w-full border-collapse text-left text-sm">
          <thead className="bg-gray-50 text-opseu-dark">
            <tr>
              <th scope="col" className="min-w-[9rem] px-3 py-2 font-semibold">
                {t("columns.article")}
              </th>
              <th scope="col" className="min-w-[14rem] px-3 py-2 font-semibold">
                {t("columns.currentLanguage")}
              </th>
              <th scope="col" className="min-w-[14rem] px-3 py-2 font-semibold">
                {t("columns.unionProposal")}
              </th>
              <th scope="col" className="min-w-[14rem] px-3 py-2 font-semibold">
                {t("columns.employerCounter")}
              </th>
              <th scope="col" className="min-w-[11rem] px-3 py-2 font-semibold">
                {t("columns.status")}
              </th>
              <th scope="col" className="min-w-[12rem] px-3 py-2 font-semibold">
                {t("columns.notes")}
              </th>
              <th scope="col" className="w-24 px-3 py-2 font-semibold">
                <span className="sr-only">{t("columns.actions")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {draft.rows.map((row, index) => (
              <tr key={row.id} className="border-t border-gray-200 align-top">
                <td className="px-2 py-2">
                  <Input
                    aria-label={`${t("columns.article")} ${index + 1}`}
                    value={row.article}
                    placeholder={t("placeholders.article")}
                    onChange={(e) =>
                      updateRow(row.id, { article: e.target.value })
                    }
                  />
                </td>
                <td className="px-2 py-2">
                  <Textarea
                    aria-label={`${t("columns.currentLanguage")} ${index + 1}`}
                    value={row.currentLanguage}
                    rows={3}
                    onChange={(e) =>
                      updateRow(row.id, { currentLanguage: e.target.value })
                    }
                  />
                </td>
                <td className="px-2 py-2">
                  <Textarea
                    aria-label={`${t("columns.unionProposal")} ${index + 1}`}
                    value={row.unionProposal}
                    rows={3}
                    onChange={(e) =>
                      updateRow(row.id, { unionProposal: e.target.value })
                    }
                  />
                </td>
                <td className="px-2 py-2">
                  <Textarea
                    aria-label={`${t("columns.employerCounter")} ${index + 1}`}
                    value={row.employerCounter}
                    rows={3}
                    onChange={(e) =>
                      updateRow(row.id, { employerCounter: e.target.value })
                    }
                  />
                </td>
                <td className="px-2 py-2">
                  <div className="space-y-1">
                    <Badge variant={STATUS_BADGE[row.status]}>
                      {t(`status.${row.status}`)}
                    </Badge>
                    <Select
                      aria-label={`${t("columns.status")} ${index + 1}`}
                      value={row.status}
                      onChange={(e) =>
                        updateRow(row.id, {
                          status: e.target.value as ProposalStatus,
                        })
                      }
                    >
                      {PROPOSAL_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {t(`status.${status}`)}
                        </option>
                      ))}
                    </Select>
                  </div>
                </td>
                <td className="px-2 py-2">
                  <Textarea
                    aria-label={`${t("columns.notes")} ${index + 1}`}
                    value={row.notes}
                    rows={3}
                    onChange={(e) =>
                      updateRow(row.id, { notes: e.target.value })
                    }
                  />
                </td>
                <td className="px-2 py-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-sm"
                    onClick={() => removeRow(row.id)}
                  >
                    {t("removeRow")}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-gray-500">{t("privacyNote")}</p>

      <ToolRelatedFooter toolSlug="proposal-tracker" className="mt-10" />
    </PageShell>
  );
}