"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ToolEditorLayout } from "@/components/tools/ToolEditorLayout";
import { ToolRelatedFooter } from "@/components/tools/ToolRelatedFooter";
import { HubDraftSyncPanel } from "@/components/tools/HubDraftSyncPanel";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Input, Textarea } from "@/components/ui/Input";
import { useStewardGuideDraft } from "@/hooks/use-steward-guide-draft";
import {
  clearStewardQuickLogDraft,
  createEmptyStewardQuickLogDraft,
  loadStewardQuickLogDraft,
  newStewardQuickLogEntry,
  saveStewardQuickLogDraft,
  type StewardQuickLogEntry,
} from "@/lib/comms/steward-quick-log-draft";
import { guideCtaOutlineClassSm } from "@/components/comms/guideCtaClasses";

const TOPIC_MAX = 120;

function truncateTopic(what: string): string {
  const compact = what.trim().replace(/\s+/g, " ");
  if (compact.length <= TOPIC_MAX) return compact;
  return `${compact.slice(0, TOPIC_MAX - 1)}…`;
}

function occurredAtIso(when: string): string {
  const trimmed = when.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T12:00:00`).toISOString();
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  return new Date().toISOString();
}

/** Map on-device quick-log rows to Informal Log POST bodies (topic requires `what`). */
function quickLogToInformalPayloads(
  entries: StewardQuickLogEntry[],
): Record<string, unknown>[] | null {
  const syncable = entries.filter((e) => e.what.trim());
  if (syncable.length === 0) return null;

  return syncable.map((entry) => {
    const what = entry.what.trim();
    const next = entry.nextStep.trim();
    const summary = [what, next].filter(Boolean).join("\n\n").slice(0, 5000);
    const who = entry.who.trim().slice(0, 200);
    return {
      topic: truncateTopic(what).slice(0, 500),
      summary,
      channel: "other",
      visibility: "local_executive",
      occurredAt: occurredAtIso(entry.when),
      ...(who ? { memberPseudonym: who } : {}),
    };
  });
}

export default function StewardQuickLogPage() {
  const t = useTranslations("stewardQuickLog");
  const { draft, setDraft, clear, saveFailed } = useStewardGuideDraft({
    load: loadStewardQuickLogDraft,
    save: saveStewardQuickLogDraft,
    createEmpty: createEmptyStewardQuickLogDraft,
    clearStorage: clearStewardQuickLogDraft,
  });

  const syncableCount = draft.entries.filter((e) => e.what.trim()).length;

  const form = (
    <div className="space-y-4">
      <Callout tone="muted" measure="fill">
        <p>{t("hubHint")}</p>
        <Link
          href="/app/informal-log"
          className={`${guideCtaOutlineClassSm} mt-3`}
        >
          {t("openHub")}
        </Link>
      </Callout>
      {saveFailed ? (
        <Callout tone="muted" role="status">
          {t("draftSaveFailed")}
        </Callout>
      ) : null}
      <HubDraftSyncPanel
        kind="informalLog"
        syncLabel={t("syncLabel", { count: syncableCount })}
        getPayloads={() => quickLogToInformalPayloads(draft.entries)}
      />
      <Button
        type="button"
        onClick={() =>
          setDraft((prev) => ({
            entries: [newStewardQuickLogEntry(), ...prev.entries],
          }))
        }
      >
        {t("add")}
      </Button>
      {draft.entries.length === 0 ? (
        <p className="text-sm text-gray-600">{t("empty")}</p>
      ) : (
        draft.entries.map((row) => (
          <div
            key={row.id}
            className="space-y-2 rounded-lg border border-gray-200 p-3"
          >
            <Input
              type="date"
              label={t("fields.when")}
              value={row.when}
              onChange={(e) =>
                setDraft((prev) => ({
                  entries: prev.entries.map((s) =>
                    s.id === row.id ? { ...s, when: e.target.value } : s,
                  ),
                }))
              }
            />
            <Input
              label={t("fields.who")}
              value={row.who}
              onChange={(e) =>
                setDraft((prev) => ({
                  entries: prev.entries.map((s) =>
                    s.id === row.id ? { ...s, who: e.target.value } : s,
                  ),
                }))
              }
            />
            <Textarea
              label={t("fields.what")}
              rows={3}
              value={row.what}
              onChange={(e) =>
                setDraft((prev) => ({
                  entries: prev.entries.map((s) =>
                    s.id === row.id ? { ...s, what: e.target.value } : s,
                  ),
                }))
              }
            />
            <Input
              label={t("fields.nextStep")}
              value={row.nextStep}
              onChange={(e) =>
                setDraft((prev) => ({
                  entries: prev.entries.map((s) =>
                    s.id === row.id ? { ...s, nextStep: e.target.value } : s,
                  ),
                }))
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setDraft((prev) => ({
                  entries: prev.entries.filter((s) => s.id !== row.id),
                }))
              }
            >
              {t("remove")}
            </Button>
          </div>
        ))
      )}
      <Button type="button" variant="outline" onClick={clear}>
        {t("clearAll")}
      </Button>
    </div>
  );

  return (
    <ToolEditorLayout
      title={t("title")}
      description={t("subtitle")}
      purposeHint={t("whenToUse")}
      form={form}
      preview={
        <div className="space-y-3 text-sm text-gray-700">
          <p className="font-semibold text-opseu-dark">{t("previewTitle")}</p>
          <p>{t("previewBody", { count: draft.entries.length })}</p>
        </div>
      }
      footer={<ToolRelatedFooter toolSlug="steward-quick-log" />}
    />
  );
}
