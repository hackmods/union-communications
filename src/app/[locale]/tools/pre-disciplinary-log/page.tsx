"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ToolEditorLayout } from "@/components/tools/ToolEditorLayout";
import { ToolRelatedFooter } from "@/components/tools/ToolRelatedFooter";
import { Callout } from "@/components/ui/Callout";
import { Card } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ChecklistToggle } from "@/components/tools/steward-guides/ChecklistToggle";
import { StewardGuideExportBar } from "@/components/tools/steward-guides/StewardGuideExportBar";
import {
  ScriptBlock,
  SuggestionPanel,
} from "@/components/tools/steward-guides/SuggestionPanel";
import { useExportHandler } from "@/hooks/use-export-handler";
import { useStewardGuideDraft } from "@/hooks/use-steward-guide-draft";
import {
  ALLEGATION_TYPES,
  MITIGATING_FACTORS,
  RIGHTS_CHECKS,
  buildPreDisciplinaryScripts,
  clearPreDisciplinaryDraft,
  createEmptyPreDisciplinaryDraft,
  exportWorkspaceMarkdown,
  exportWorkspacePdf,
  isCriminalAllegation,
  loadPreDisciplinaryDraft,
  preDisciplinaryDraftToMarkdown,
  savePreDisciplinaryDraft,
  type AllegationTypeId,
  type MitigatingFactorId,
  type RightsCheckId,
  type TriState,
} from "@/lib/steward-guides";

export default function PreDisciplinaryLogPage() {
  const t = useTranslations("preDisciplinaryLog");
  const { draft, setDraft, clear } = useStewardGuideDraft({
    load: loadPreDisciplinaryDraft,
    save: savePreDisciplinaryDraft,
    createEmpty: createEmptyPreDisciplinaryDraft,
  });
  const { exportError, exportSuccess, exporting, runExport } =
    useExportHandler();

  const criminal = isCriminalAllegation(draft.allegationType);

  const scriptLabels = useMemo(
    () => ({
      counselProposal: t("scripts.counselProposal"),
      representationPoints: t("scripts.representationPoints"),
      checklistGapsLead: t("scripts.checklistGapsLead"),
      none: t("scripts.none"),
      rightsLabels: Object.fromEntries(
        RIGHTS_CHECKS.map((id) => [id, t(`rights.${id}`)]),
      ) as Record<RightsCheckId, string>,
      mitigatorLabels: Object.fromEntries(
        MITIGATING_FACTORS.map((id) => [id, t(`mitigators.${id}`)]),
      ) as Record<MitigatingFactorId, string>,
      allegationTypeLabels: Object.fromEntries(
        ALLEGATION_TYPES.map((id) => [id, t(`allegationTypes.${id}`)]),
      ) as Record<AllegationTypeId, string>,
    }),
    [t],
  );

  const scripts = useMemo(
    () => buildPreDisciplinaryScripts(draft, scriptLabels),
    [draft, scriptLabels],
  );

  const setRight = (id: RightsCheckId, value: TriState) => {
    setDraft((prev) => ({
      ...prev,
      rights: { ...prev.rights, [id]: value },
    }));
  };

  const toggleMitigator = (id: MitigatingFactorId, on: boolean) => {
    setDraft((prev) => ({
      ...prev,
      mitigators: on
        ? [...new Set([...prev.mitigators, id])]
        : prev.mitigators.filter((m) => m !== id),
    }));
  };

  const buildMarkdown = () =>
    preDisciplinaryDraftToMarkdown(draft, {
      title: t("title"),
      fields: {
        memberName: t("fields.memberName"),
        meetingDate: t("fields.meetingDate"),
        allegationType: t("fields.allegationType"),
        rights: t("fields.rights"),
        allegations: t("fields.allegations"),
        memberNarrative: t("fields.memberNarrative"),
        mitigators: t("fields.mitigators"),
        suggestion: t("preview.suggestion"),
      },
      scripts: scriptLabels,
    });

  const exportBar = (
    <StewardGuideExportBar
      exporting={exporting}
      labels={{
        exportMarkdown: t("export.markdown"),
        exportPdf: t("export.pdf"),
        clearDraft: t("export.clear"),
      }}
      onExportMarkdown={() => {
        void runExport(async () => {
          await exportWorkspaceMarkdown(
            buildMarkdown(),
            "pre-disciplinary-log.md",
          );
        });
      }}
      onExportPdf={() => {
        void runExport(async () => {
          await exportWorkspacePdf(
            t("title"),
            buildMarkdown(),
            "pre-disciplinary-log.pdf",
          );
        });
      }}
      onClear={() => {
        clearPreDisciplinaryDraft();
        clear();
      }}
    />
  );

  const form = (
    <Card density="compact" className="space-y-4">
      {criminal ? (
        <Callout tone="danger" role="alert" className="sticky top-2 z-10">
          <p className="font-semibold">{t("escalation.title")}</p>
          <p className="mt-1">{t("escalation.body")}</p>
        </Callout>
      ) : null}

      <Callout tone="muted">
        <p className="font-medium text-gray-900">{t("confidentiality.title")}</p>
        <p className="mt-1">{t("confidentiality.body")}</p>
      </Callout>

      <Input
        label={t("fields.memberName")}
        value={draft.memberName}
        onChange={(e) =>
          setDraft((prev) => ({ ...prev, memberName: e.target.value }))
        }
      />
      <Input
        type="date"
        label={t("fields.meetingDate")}
        value={draft.meetingDate}
        onChange={(e) =>
          setDraft((prev) => ({ ...prev, meetingDate: e.target.value }))
        }
      />
      <Select
        label={t("fields.allegationType")}
        value={draft.allegationType}
        onChange={(e) =>
          setDraft((prev) => ({
            ...prev,
            allegationType: e.target.value as AllegationTypeId | "",
          }))
        }
      >
        <option value="">{t("allegationTypes.placeholder")}</option>
        {ALLEGATION_TYPES.map((id) => (
          <option key={id} value={id}>
            {t(`allegationTypes.${id}`)}
          </option>
        ))}
      </Select>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-gray-700">
          {t("fields.rights")}
        </legend>
        <p className="text-xs text-gray-500">{t("fields.rightsHint")}</p>
        {RIGHTS_CHECKS.map((id) => (
          <div key={id} className="space-y-1.5 rounded-lg border border-gray-200 p-3">
            <p className="text-sm font-medium text-gray-900">{t(`rights.${id}`)}</p>
            <div
              role="radiogroup"
              aria-label={t(`rights.${id}`)}
              className="flex flex-wrap gap-2"
            >
              {(["yes", "no", "unset"] as const).map((value) => {
                const selected = draft.rights[id] === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setRight(id, value)}
                    className={`min-h-11 rounded-lg border px-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-opseu-blue/40 ${
                      selected
                        ? "border-opseu-blue bg-opseu-blue/10 text-opseu-dark"
                        : "border-gray-200 bg-white text-gray-700"
                    }`}
                  >
                    {t(`triState.${value}`)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </fieldset>

      <Textarea
        label={t("fields.allegations")}
        rows={4}
        value={draft.allegations}
        onChange={(e) =>
          setDraft((prev) => ({ ...prev, allegations: e.target.value }))
        }
      />
      <Textarea
        label={t("fields.memberNarrative")}
        rows={5}
        value={draft.memberNarrative}
        onChange={(e) =>
          setDraft((prev) => ({ ...prev, memberNarrative: e.target.value }))
        }
      />

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-gray-700">
          {t("fields.mitigators")}
        </legend>
        {MITIGATING_FACTORS.map((id) => (
          <ChecklistToggle
            key={id}
            id={`mitigator-${id}`}
            label={t(`mitigators.${id}`)}
            checked={draft.mitigators.includes(id)}
            onChange={(on) => toggleMitigator(id, on)}
          />
        ))}
      </fieldset>
    </Card>
  );

  const preview = (
    <SuggestionPanel title={t("preview.title")}>
      <p className="text-gray-600">{t("preview.hint")}</p>
      <ScriptBlock label={t("preview.suggestion")} text={scripts.primary} />
      <ScriptBlock label={t("preview.gaps")} text={scripts.gaps} />
    </SuggestionPanel>
  );

  return (
    <ToolEditorLayout
      title={t("title")}
      description={t("subtitle")}
      purposeHint={t("whenToUse")}
      previewAccessibleName={t("preview.title")}
      miniPreview={false}
      toolbar={exportBar}
      form={form}
      preview={preview}
      previewActions={exportBar}
      exportError={exportError}
      exportSuccess={exportSuccess}
      footer={<ToolRelatedFooter toolSlug="pre-disciplinary-log" />}
    />
  );
}
