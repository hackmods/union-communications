"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ToolEditorLayout } from "@/components/tools/ToolEditorLayout";
import { ToolRelatedFooter } from "@/components/tools/ToolRelatedFooter";
import { SegControl } from "@/components/tools/SegControl";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ChecklistToggle } from "@/components/tools/steward-guides/ChecklistToggle";
import { StewardGuideExportBar } from "@/components/tools/steward-guides/StewardGuideExportBar";
import {
  ScriptBlock,
  SuggestionPanel,
} from "@/components/tools/steward-guides/SuggestionPanel";
import {
  MeiorinStepsDiagram,
  RtwWorkHardeningDiagram,
} from "@/components/comms/StewardGuideDiagrams";
import { StewardPocketSheetButton } from "@/components/tools/steward-guides/StewardPocketSheetButton";
import { useStewardGuideDraft } from "@/hooks/use-steward-guide-draft";
import {
  ACCOMMODATION_MEASURES,
  PROHIBITED_GROUNDS,
  buildRtwEarlyResolutionSuggestions,
  buildRtwScripts,
  clearRtwDraft,
  createEmptyRtwDraft,
  exportWorkspaceMarkdown,
  exportWorkspacePdf,
  loadRtwDraft,
  maybePrefillGradualHours,
  maybeSuggestTaskBundlingMeasure,
  rtwDraftToMarkdown,
  saveRtwDraft,
  type AccommodationMeasureId,
  type ProhibitedGroundId,
  type RtwMode,
} from "@/lib/steward-guides";

export default function RtwAccommodationPage() {
  const t = useTranslations("rtwAccommodation");
  const { draft, setDraft, clear, saveFailed } = useStewardGuideDraft({
    load: loadRtwDraft,
    save: saveRtwDraft,
    createEmpty: createEmptyRtwDraft,
    clearStorage: clearRtwDraft,
  });
  const { exportError, exportSuccess, exporting, runExport } =
    useExportHandler();
  const [meiorinOpen, setMeiorinOpen] = useState(false);
  const primacyId = useId();

  useEffect(() => {
    setDraft((prev) => {
      const next = maybeSuggestTaskBundlingMeasure(
        maybePrefillGradualHours(prev),
      );
      if (
        next.gradualHours === prev.gradualHours &&
        next.measures.length === prev.measures.length &&
        next.measures.every((id, i) => id === prev.measures[i])
      ) {
        return prev;
      }
      return next;
    });
  }, [
    draft.wsibLtdStatus,
    draft.functionalLimitations,
    draft.medicalRestrictions,
    setDraft,
  ]);

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

  const suggestionLabels = useMemo(
    () => ({
      workHardening: t("suggestions.workHardening"),
      taskBundling: t("suggestions.taskBundling"),
      jointReview: t("suggestions.jointReview"),
    }),
    [t],
  );

  const earlySuggestions = useMemo(
    () => buildRtwEarlyResolutionSuggestions(draft, suggestionLabels),
    [draft, suggestionLabels],
  );

  const toggleMeasure = (id: AccommodationMeasureId, on: boolean) => {
    setDraft((prev) => ({
      ...prev,
      measures: on
        ? [...new Set([...prev.measures, id])]
        : prev.measures.filter((m) => m !== id),
    }));
  };

  const meiorinSteps = useMemo(
    () =>
      [
        t("legal.meiorinStep1Title"),
        t("legal.meiorinStep2Title"),
        t("legal.meiorinStep3Title"),
      ] as [string, string, string],
    [t],
  );

  const workHardeningPhases = useMemo(
    () =>
      [
        { label: t("diagrams.phase1Label"), hours: t("diagrams.phase1Hours") },
        { label: t("diagrams.phase2Label"), hours: t("diagrams.phase2Hours") },
        { label: t("diagrams.phase3Label"), hours: t("diagrams.phase3Hours") },
        { label: t("diagrams.phase4Label"), hours: t("diagrams.phase4Hours") },
      ] as const,
    [t],
  );

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
      earlyResolutionHeading: t("suggestions.heading"),
      suggestionLabels,
    });

  const exportBar = (
    <div className="flex flex-wrap items-end gap-3">
      <StewardGuideExportBar
        exporting={exporting}
        labels={{
          exportMarkdown: t("export.markdown"),
          exportPdf: t("export.pdf"),
          clearDraft: t("export.clear"),
          printChecklist: t("export.printChecklist"),
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
        onPrintChecklist={() => window.print()}
        onClear={clear}
      />
      <StewardPocketSheetButton
        kind="meiorin"
        moduleTitle={t("pocketSheetModuleTitle")}
      />
    </div>
  );

  const form = (
    <Card density="compact" className="space-y-4">
      {saveFailed ? (
        <Callout tone="warning" role="status">
          {t("saveFailed")}
        </Callout>
      ) : null}

      <Callout tone="brand" role="note" aria-describedby={primacyId}>
        <p className="font-semibold text-opseu-dark">{t("legal.primacyTitle")}</p>
        <p id={primacyId} className="mt-1">
          {t("legal.primacyBody")}
        </p>
        <p className="mt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11"
            onClick={() => setMeiorinOpen(true)}
          >
            {t("legal.meiorinOpen")}
          </Button>
        </p>
      </Callout>

      <Callout tone="muted" role="note">
        <p className="font-semibold text-gray-900">
          {t("legal.undueHardshipTitle")}
        </p>
        <p className="mt-1">{t("legal.undueHardshipBody")}</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>{t("legal.undueHardshipCost")}</li>
          <li>{t("legal.undueHardshipFunding")}</li>
          <li>{t("legal.undueHardshipSafety")}</li>
        </ul>
        <p className="mt-2 font-medium text-gray-900">
          {t("legal.undueHardshipNotTitle")}
        </p>
        <p className="mt-1">{t("legal.undueHardshipNotBody")}</p>
      </Callout>

      <div className="space-y-3 rounded-lg border border-gray-200 border-l-2 border-l-teal-500/40 p-3">
        <p className="text-sm font-medium text-gray-900">
          {t("diagrams.meiorinTitle")}
        </p>
        <MeiorinStepsDiagram
          steps={meiorinSteps}
          caption={t("diagrams.meiorinCaption")}
        />
        <p className="text-sm font-medium text-gray-900">
          {t("diagrams.workHardeningTitle")}
        </p>
        <RtwWorkHardeningDiagram
          phases={workHardeningPhases}
          caption={t("diagrams.workHardeningCaption")}
        />
      </div>

      <Callout tone="muted" role="note">
        <Link
          href="/guide/officer-learning/human-rights-accommodation"
          className="font-semibold text-opseu-blue underline underline-offset-2"
        >
          {t("moduleLink")}
        </Link>
      </Callout>

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
      {earlySuggestions.length > 0 ? (
        <div className="space-y-2 rounded-lg border border-opseu-blue/20 bg-opseu-blue/5 p-3">
          <p className="text-sm font-semibold text-opseu-dark">
            {t("suggestions.heading")}
          </p>
          <ul className="list-inside list-disc space-y-2 text-sm text-gray-800">
            {earlySuggestions.map((s) => (
              <li key={s.id}>{s.text}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <ScriptBlock label={t("preview.email")} text={scripts.email} />
      <ScriptBlock label={t("preview.verbal")} text={scripts.verbal} />
    </SuggestionPanel>
  );

  return (
    <>
    <ToolEditorLayout
      className="steward-guide-print"
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
      footer={<ToolRelatedFooter toolSlug="rtw-accommodation" />}
    />
    <Dialog
      open={meiorinOpen}
      onClose={() => setMeiorinOpen(false)}
      title={t("legal.meiorinTitle")}
      closeLabel={t("legal.meiorinClose")}
      className="max-w-lg"
    >
      <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed">
        <li>
          <span className="font-semibold">{t("legal.meiorinStep1Title")}</span>
          {" — "}
          {t("legal.meiorinStep1Body")}
        </li>
        <li>
          <span className="font-semibold">{t("legal.meiorinStep2Title")}</span>
          {" — "}
          {t("legal.meiorinStep2Body")}
        </li>
        <li>
          <span className="font-semibold">{t("legal.meiorinStep3Title")}</span>
          {" — "}
          {t("legal.meiorinStep3Body")}
        </li>
      </ol>
    </Dialog>
    </>
  );
}
