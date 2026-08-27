"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ToolEditorLayout } from "@/components/tools/ToolEditorLayout";
import { ToolRelatedFooter } from "@/components/tools/ToolRelatedFooter";
import { SegControl } from "@/components/tools/SegControl";
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
  ACCOMMODATION_MEASURES,
  PROHIBITED_GROUNDS,
  buildRtwScripts,
  clearRtwDraft,
  createEmptyRtwDraft,
  exportWorkspaceMarkdown,
  exportWorkspacePdf,
  loadRtwDraft,
  rtwDraftToMarkdown,
  saveRtwDraft,
  type AccommodationMeasureId,
  type ProhibitedGroundId,
  type RtwMode,
} from "@/lib/steward-guides";

export default function RtwAccommodationPage() {
  const t = useTranslations("rtwAccommodation");
  const { draft, setDraft, clear } = useStewardGuideDraft({
    load: loadRtwDraft,
    save: saveRtwDraft,
    createEmpty: createEmptyRtwDraft,
  });
  const { exportError, exportSuccess, exporting, runExport } =
    useExportHandler();

  const scriptLabels = useMemo(
    () => ({
      dear: t("scripts.dear"),
      basedOn: t("scripts.basedOn"),
      propose: t("scripts.propose"),
      preserve: t("scripts.preserve"),
      closing: t("scripts.closing"),
      verbalLead: t("scripts.verbalLead"),
      memberFallback: t("scripts.memberFallback"),
      hrFallback: t("scripts.hrFallback"),
      measuresHeading: t("scripts.measuresHeading"),
      customMeasureLabel: t("measures.other"),
      measureLabels: Object.fromEntries(
        ACCOMMODATION_MEASURES.map((id) => [id, t(`measures.${id}`)]),
      ) as Record<AccommodationMeasureId, string>,
      groundLabels: Object.fromEntries(
        PROHIBITED_GROUNDS.map((id) => [id, t(`grounds.${id}`)]),
      ) as Record<ProhibitedGroundId, string>,
      groundLead: t("scripts.groundLead"),
    }),
    [t],
  );

  const scripts = useMemo(
    () => buildRtwScripts(draft, scriptLabels),
    [draft, scriptLabels],
  );

  const toggleMeasure = (id: AccommodationMeasureId, on: boolean) => {
    setDraft((prev) => ({
      ...prev,
      measures: on
        ? [...new Set([...prev.measures, id])]
        : prev.measures.filter((m) => m !== id),
    }));
  };

  const buildMarkdown = () =>
    rtwDraftToMarkdown(draft, {
      title: t("title"),
      modeRtw: t("mode.rtw"),
      modeAccommodation: t("mode.accommodation"),
      fields: {
        mode: t("fields.mode"),
        memberName: t("fields.memberName"),
        classification: t("fields.classification"),
        meetingDate: t("fields.meetingDate"),
        hrContact: t("fields.hrContact"),
        returnDate: t("fields.returnDate"),
        gradualHours: t("fields.gradualHours"),
        wsibLtdStatus: t("fields.wsibLtdStatus"),
        medicalRestrictions: t("fields.medicalRestrictions"),
        prohibitedGround: t("fields.prohibitedGround"),
        requestedModifications: t("fields.requestedModifications"),
        functionalLimitations: t("fields.functionalLimitations"),
        measures: t("fields.measures"),
        emailScript: t("preview.email"),
        verbalScript: t("preview.verbal"),
      },
      measureLabels: scriptLabels.measureLabels,
      groundLabels: scriptLabels.groundLabels,
      scripts: scriptLabels,
    });

  const form = (
    <Card density="compact" className="space-y-4">
      <Callout tone="warning" role="note">
        <p className="font-semibold text-amber-950">{t("privacy.title")}</p>
        <p className="mt-1">{t("privacy.body")}</p>
      </Callout>

      <SegControl<RtwMode>
        label={t("fields.mode")}
        value={draft.mode}
        onChange={(mode) => setDraft((prev) => ({ ...prev, mode }))}
        options={[
          { value: "rtw", label: t("mode.rtw") },
          { value: "accommodation", label: t("mode.accommodation") },
        ]}
      />

      <Input
        label={t("fields.memberName")}
        value={draft.memberName}
        onChange={(e) =>
          setDraft((prev) => ({ ...prev, memberName: e.target.value }))
        }
      />
      <Input
        label={t("fields.classification")}
        value={draft.classification}
        onChange={(e) =>
          setDraft((prev) => ({ ...prev, classification: e.target.value }))
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
      <Input
        label={t("fields.hrContact")}
        value={draft.hrContact}
        onChange={(e) =>
          setDraft((prev) => ({ ...prev, hrContact: e.target.value }))
        }
      />

      {draft.mode === "rtw" ? (
        <>
          <Input
            type="date"
            label={t("fields.returnDate")}
            value={draft.returnDate}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, returnDate: e.target.value }))
            }
          />
          <Textarea
            label={t("fields.gradualHours")}
            rows={3}
            value={draft.gradualHours}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, gradualHours: e.target.value }))
            }
          />
          <Input
            label={t("fields.wsibLtdStatus")}
            value={draft.wsibLtdStatus}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, wsibLtdStatus: e.target.value }))
            }
          />
          <Textarea
            label={t("fields.medicalRestrictions")}
            rows={3}
            value={draft.medicalRestrictions}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                medicalRestrictions: e.target.value,
              }))
            }
          />
        </>
      ) : (
        <>
          <Select
            label={t("fields.prohibitedGround")}
            value={draft.prohibitedGround}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                prohibitedGround: e.target.value as ProhibitedGroundId | "",
              }))
            }
          >
            <option value="">{t("grounds.placeholder")}</option>
            {PROHIBITED_GROUNDS.map((id) => (
              <option key={id} value={id}>
                {t(`grounds.${id}`)}
              </option>
            ))}
          </Select>
          <Textarea
            label={t("fields.requestedModifications")}
            rows={3}
            value={draft.requestedModifications}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                requestedModifications: e.target.value,
              }))
            }
          />
        </>
      )}

      <Textarea
        label={t("fields.functionalLimitations")}
        rows={4}
        value={draft.functionalLimitations}
        onChange={(e) =>
          setDraft((prev) => ({
            ...prev,
            functionalLimitations: e.target.value,
          }))
        }
        placeholder={t("fields.functionalLimitationsHint")}
      />

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-gray-700">
          {t("fields.measures")}
        </legend>
        {ACCOMMODATION_MEASURES.map((id) => (
          <ChecklistToggle
            key={id}
            id={`measure-${id}`}
            label={t(`measures.${id}`)}
            checked={draft.measures.includes(id)}
            onChange={(on) => toggleMeasure(id, on)}
          />
        ))}
        <Input
          label={t("measures.other")}
          value={draft.customMeasure}
          onChange={(e) =>
            setDraft((prev) => ({ ...prev, customMeasure: e.target.value }))
          }
        />
      </fieldset>
    </Card>
  );

  const preview = (
    <SuggestionPanel title={t("preview.title")}>
      <p className="text-gray-600">{t("preview.hint")}</p>
      <ScriptBlock label={t("preview.email")} text={scripts.email} />
      <ScriptBlock label={t("preview.verbal")} text={scripts.verbal} />
    </SuggestionPanel>
  );

  return (
    <ToolEditorLayout
      title={t("title")}
      description={t("subtitle")}
      purposeHint={t("whenToUse")}
      previewAccessibleName={t("preview.title")}
      miniPreview={false}
      toolbar={
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
                "rtw-accommodation-notes.md",
              );
            });
          }}
          onExportPdf={() => {
            void runExport(async () => {
              await exportWorkspacePdf(
                t("title"),
                buildMarkdown(),
                "rtw-accommodation-notes.pdf",
              );
            });
          }}
          onClear={() => {
            clearRtwDraft();
            clear();
          }}
        />
      }
      form={form}
      preview={preview}
      previewActions={
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
                "rtw-accommodation-notes.md",
              );
            });
          }}
          onExportPdf={() => {
            void runExport(async () => {
              await exportWorkspacePdf(
                t("title"),
                buildMarkdown(),
                "rtw-accommodation-notes.pdf",
              );
            });
          }}
          onClear={() => {
            clearRtwDraft();
            clear();
          }}
        />
      }
      exportError={exportError}
      exportSuccess={exportSuccess}
      footer={<ToolRelatedFooter toolSlug="rtw-accommodation" />}
    />
  );
}
