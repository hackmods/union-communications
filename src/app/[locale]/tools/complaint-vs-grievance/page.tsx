"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ToolEditorLayout } from "@/components/tools/ToolEditorLayout";
import { ToolRelatedFooter } from "@/components/tools/ToolRelatedFooter";
import { Callout } from "@/components/ui/Callout";
import { Card } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { ChecklistToggle } from "@/components/tools/steward-guides/ChecklistToggle";
import { StewardGuideExportBar } from "@/components/tools/steward-guides/StewardGuideExportBar";
import {
  ScriptBlock,
  SuggestionPanel,
} from "@/components/tools/steward-guides/SuggestionPanel";
import { useExportHandler } from "@/hooks/use-export-handler";
import { useStewardGuideDraft } from "@/hooks/use-steward-guide-draft";
import {
  ALTERNATE_ROUTES,
  DIAGNOSTIC_POINTS,
  buildAlternateRouteDrafts,
  buildGrievanceDraftText,
  clearComplaintDraft,
  complaintDraftToMarkdown,
  createEmptyComplaintDraft,
  exportWorkspaceMarkdown,
  exportWorkspacePdf,
  grievanceViabilityIndex,
  loadComplaintDraft,
  saveComplaintDraft,
  unlocksGrievanceForm,
  type AlternateRouteId,
  type DiagnosticPointId,
  type YesNoUnset,
} from "@/lib/steward-guides";

export default function ComplaintVsGrievancePage() {
  const t = useTranslations("complaintVsGrievance");
  const { draft, setDraft, clear } = useStewardGuideDraft({
    load: loadComplaintDraft,
    save: saveComplaintDraft,
    createEmpty: createEmptyComplaintDraft,
  });
  const { exportError, exportSuccess, exporting, runExport } =
    useExportHandler();

  const score = grievanceViabilityIndex(draft);
  const showGrievance = unlocksGrievanceForm(score);

  const scriptLabels = useMemo(
    () => ({
      pointLabels: Object.fromEntries(
        DIAGNOSTIC_POINTS.map((id) => [id, t(`points.${id}.label`)]),
      ) as Record<DiagnosticPointId, string>,
      routeLabels: Object.fromEntries(
        ALTERNATE_ROUTES.map((id) => [id, t(`routes.${id}.label`)]),
      ) as Record<AlternateRouteId, string>,
      routeDrafts: Object.fromEntries(
        ALTERNATE_ROUTES.map((id) => [id, t(`routes.${id}.draft`)]),
      ) as Record<AlternateRouteId, string>,
      grievanceDraftHeading: t("preview.grievanceDraft"),
      who: t("sixWs.who"),
      what: t("sixWs.what"),
      when: t("sixWs.when"),
      where: t("sixWs.where"),
      why: t("sixWs.why"),
      want: t("sixWs.want"),
      article: t("fields.articleSection"),
      indexLabel: t("score.label"),
      grievancePath: t("score.grievancePath"),
      alternatePath: t("score.alternatePath"),
    }),
    [t],
  );

  const grievanceText = useMemo(
    () => buildGrievanceDraftText(draft, scriptLabels),
    [draft, scriptLabels],
  );
  const routeDrafts = useMemo(
    () => buildAlternateRouteDrafts(draft, scriptLabels),
    [draft, scriptLabels],
  );

  const setAnswer = (id: DiagnosticPointId, value: YesNoUnset) => {
    setDraft((prev) => ({
      ...prev,
      answers: { ...prev.answers, [id]: value },
    }));
  };

  const toggleRoute = (id: AlternateRouteId, on: boolean) => {
    setDraft((prev) => ({
      ...prev,
      alternateRoutes: on
        ? [...new Set([...prev.alternateRoutes, id])]
        : prev.alternateRoutes.filter((r) => r !== id),
    }));
  };

  const buildMarkdown = () =>
    complaintDraftToMarkdown(draft, {
      title: t("title"),
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
            "complaint-vs-grievance.md",
          );
        });
      }}
      onExportPdf={() => {
        void runExport(async () => {
          await exportWorkspacePdf(
            t("title"),
            buildMarkdown(),
            "complaint-vs-grievance.pdf",
          );
        });
      }}
      onClear={() => {
        clearComplaintDraft();
        clear();
      }}
    />
  );

  const form = (
    <Card density="compact" className="space-y-4">
      <Callout tone={showGrievance ? "success" : "warning"}>
        <p className="font-semibold">
          {t("score.label")}: {score} / 5
        </p>
        <p className="mt-1">
          {showGrievance ? t("score.grievancePath") : t("score.alternatePath")}
        </p>
      </Callout>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-gray-700">
          {t("points.heading")}
        </legend>
        {DIAGNOSTIC_POINTS.map((id) => (
          <div
            key={id}
            className="space-y-2 rounded-lg border border-gray-200 p-3"
          >
            <p className="text-sm font-medium text-gray-900">
              {t(`points.${id}.label`)}
            </p>
            <p className="text-xs text-gray-600">{t(`points.${id}.hint`)}</p>
            <div
              role="radiogroup"
              aria-label={t(`points.${id}.label`)}
              className="flex flex-wrap gap-2"
            >
              {(["yes", "no", "unset"] as const).map((value) => {
                const selected = draft.answers[id] === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setAnswer(id, value)}
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
            {id === "caViolation" && draft.answers.caViolation === "yes" ? (
              <Input
                label={t("fields.articleSection")}
                value={draft.articleSection}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    articleSection: e.target.value,
                  }))
                }
                placeholder={t("fields.articleSectionHint")}
              />
            ) : null}
          </div>
        ))}
      </fieldset>

      {showGrievance ? (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-gray-700">
            {t("sixWs.heading")}
          </legend>
          {(
            [
              ["who", "who"],
              ["what", "what"],
              ["when", "when"],
              ["where", "where"],
              ["why", "why"],
              ["want", "want"],
            ] as const
          ).map(([key, field]) => (
            <Textarea
              key={key}
              label={t(`sixWs.${key}`)}
              rows={2}
              value={draft[field]}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, [field]: e.target.value }))
              }
            />
          ))}
        </fieldset>
      ) : (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-gray-700">
            {t("routes.heading")}
          </legend>
          <p className="text-xs text-gray-500">{t("routes.hint")}</p>
          {ALTERNATE_ROUTES.map((id) => (
            <ChecklistToggle
              key={id}
              id={`route-${id}`}
              label={t(`routes.${id}.label`)}
              description={t(`routes.${id}.hint`)}
              checked={draft.alternateRoutes.includes(id)}
              onChange={(on) => toggleRoute(id, on)}
            />
          ))}
        </fieldset>
      )}
    </Card>
  );

  const preview = (
    <SuggestionPanel title={t("preview.title")}>
      <p className="text-gray-600">{t("preview.hint")}</p>
      {showGrievance ? (
        <ScriptBlock
          label={t("preview.grievanceDraft")}
          text={grievanceText}
        />
      ) : routeDrafts.length > 0 ? (
        routeDrafts.map((route) => (
          <ScriptBlock
            key={route.id}
            label={route.label}
            text={route.draft}
          />
        ))
      ) : (
        <p className="text-gray-600">{t("preview.pickRoutes")}</p>
      )}
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
      footer={<ToolRelatedFooter toolSlug="complaint-vs-grievance" />}
    />
  );
}
