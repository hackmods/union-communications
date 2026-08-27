"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
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
import { ViabilityScorecard } from "@/components/tools/steward-guides/ViabilityScorecard";
import { FivePointFilterDiagram } from "@/components/comms/StewardGuideDiagrams";
import { StewardPocketSheetButton } from "@/components/tools/steward-guides/StewardPocketSheetButton";
import { useExportHandler } from "@/hooks/use-export-handler";
import { useStewardGuideDraft } from "@/hooks/use-steward-guide-draft";
import { COMMS_SOURCES } from "@/lib/constants/comms-sources";
import {
  ALTERNATE_ROUTES,
  DIAGNOSTIC_POINTS,
  buildAllAlternateRouteDrafts,
  buildAlternateRouteDrafts,
  buildFarDraftText,
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
  const { draft, setDraft, clear, saveFailed } = useStewardGuideDraft({
    load: loadComplaintDraft,
    save: saveComplaintDraft,
    createEmpty: createEmptyComplaintDraft,
    clearStorage: clearComplaintDraft,
  });
  const { exportError, exportSuccess, exporting, runExport } =
    useExportHandler();

  const score = grievanceViabilityIndex(draft);
  const showGrievance = unlocksGrievanceForm(score);
  const caSource = COMMS_SOURCES["opseu-collective-agreements"];

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
      farDraftHeading: t("preview.farDraft"),
      who: t("sixWs.who"),
      what: t("sixWs.what"),
      when: t("sixWs.when"),
      where: t("sixWs.where"),
      why: t("sixWs.why"),
      want: t("sixWs.want"),
      facts: t("far.facts"),
      argument: t("far.argument"),
      resolution: t("far.resolution"),
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
  const farText = useMemo(
    () => buildFarDraftText(draft, scriptLabels),
    [draft, scriptLabels],
  );
  const routeDrafts = useMemo(
    () =>
      showGrievance
        ? buildAlternateRouteDrafts(draft, scriptLabels)
        : buildAllAlternateRouteDrafts(scriptLabels),
    [draft, scriptLabels, showGrievance],
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

  const printChecklist = () => {
    window.print();
  };

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
        onPrintChecklist={printChecklist}
        onClear={clear}
      />
      <StewardPocketSheetButton
        kind="far"
        moduleTitle={t("pocketSheetModuleTitle")}
      />
    </div>
  );

  const filterLabels = DIAGNOSTIC_POINTS.map((id) =>
    t(`points.${id}.label`),
  ) as [string, string, string, string, string];

  const scorecard = (
    <ViabilityScorecard
      answers={draft.answers}
      labels={scriptLabels.pointLabels}
      scoreLabel={t("score.label")}
      score={score}
    />
  );

  const form = (
    <Card density="compact" className="space-y-4">
      {saveFailed ? (
        <Callout tone="warning" role="status">
          {t("saveFailed")}
        </Callout>
      ) : null}

      <Callout tone="muted">
        <Link
          href="/guide/officer-learning/contract-enforcement"
          className="font-semibold text-opseu-blue underline underline-offset-2"
        >
          {t("moduleLink")}
        </Link>
      </Callout>

      <div className="space-y-3">
        <div className="rounded-lg border border-gray-200 border-l-2 border-l-opseu-blue/30 p-3">
          <p className="text-sm font-medium text-gray-900">
            {t("diagrams.filterTitle")}
          </p>
          <FivePointFilterDiagram
            labels={filterLabels}
            caption={t("diagrams.filterCaption")}
            className="mt-2"
          />
        </div>
        <Callout tone={showGrievance ? "success" : "warning"}>
          <p className="font-semibold">
            {showGrievance ? t("score.grievancePath") : t("score.alternatePath")}
          </p>
        </Callout>
        {scorecard}
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-gray-700">
          {t("points.heading")}
        </legend>
        {DIAGNOSTIC_POINTS.map((id) => (
          <div
            key={id}
            className="space-y-2 rounded-lg border border-gray-200 border-l-2 border-l-opseu-blue/30 p-3"
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
              <div className="space-y-2">
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
                <Callout tone="muted">
                  <p className="font-medium text-gray-900">
                    {t("caGuidance.title")}
                  </p>
                  <p className="mt-1">{t("caGuidance.body")}</p>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
                    <li>
                      <Link
                        href="/guide/grievance-process"
                        className="font-semibold text-opseu-blue underline underline-offset-2"
                      >
                        {t("caGuidance.grievanceGuide")}
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/app/snippets"
                        className="font-semibold text-opseu-blue underline underline-offset-2"
                      >
                        {t("caGuidance.snippets")}
                      </Link>
                    </li>
                    {caSource ? (
                      <li>
                        <a
                          href={caSource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-opseu-blue underline underline-offset-2"
                        >
                          {t("caGuidance.caFinder")}
                        </a>
                      </li>
                    ) : null}
                  </ul>
                </Callout>
              </div>
            ) : null}
          </div>
        ))}
      </fieldset>

      {showGrievance ? (
        <>
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
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-gray-700">
              {t("far.heading")}
            </legend>
            <p className="text-xs text-gray-500">{t("far.hint")}</p>
            <Textarea
              label={t("far.facts")}
              rows={3}
              value={draft.facts}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, facts: e.target.value }))
              }
            />
            <Textarea
              label={t("far.argument")}
              rows={3}
              value={draft.argument}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, argument: e.target.value }))
              }
            />
            <Textarea
              label={t("far.resolution")}
              rows={3}
              value={draft.resolution}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, resolution: e.target.value }))
              }
            />
          </fieldset>
        </>
      ) : (
        <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/60 p-4">
          <div>
            <p className="text-sm font-semibold text-amber-950">
              {t("actionPlan.title")}
            </p>
            <p className="mt-1 text-sm text-amber-900">{t("actionPlan.body")}</p>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-gray-700">
              {t("routes.heading")}
            </legend>
            <p className="text-xs text-gray-600">{t("actionPlan.routesHint")}</p>
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
            {draft.alternateRoutes.includes("informalSupervisor") ? (
              <Callout tone="brand">
                <Link
                  href="/app/informal-log"
                  className="font-semibold text-opseu-blue underline underline-offset-2"
                >
                  {t("routes.informalLogCta")}
                </Link>
              </Callout>
            ) : null}
          </fieldset>
        </div>
      )}
    </Card>
  );

  const preview = (
    <SuggestionPanel title={t("preview.title")}>
      <p className="text-gray-600">{t("preview.hint")}</p>
      {scorecard}
      {showGrievance ? (
        <>
          <ScriptBlock
            label={t("preview.grievanceDraft")}
            text={grievanceText}
          />
          <ScriptBlock label={t("preview.farDraft")} text={farText} />
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-gray-900">
            {t("actionPlan.previewHeading")}
          </p>
          {routeDrafts.map((route) => (
            <ScriptBlock
              key={route.id}
              label={route.label}
              text={route.draft}
            />
          ))}
        </>
      )}
    </SuggestionPanel>
  );

  return (
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
      footer={<ToolRelatedFooter toolSlug="complaint-vs-grievance" />}
    />
  );
}
