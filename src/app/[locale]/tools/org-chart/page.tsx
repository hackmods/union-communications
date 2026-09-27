"use client";

import { Suspense, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { documentGeneratorPresetHref } from "@/lib/constants/document-generator-links";
import { useBrandStore } from "@/store/brand-store";
import { usePublicRosterStore } from "@/store/public-roster-store";
import { useExportHandler } from "@/hooks/use-export-handler";
import { useUndoRedo } from "@/hooks/use-undo-redo";
import { useOneShotBrandSeed } from "@/hooks/use-one-shot-brand-seed";
import { exportNodeAsPng, downloadBlob } from "@/lib/export/image-export";
import { nodeToPdf } from "@/lib/export/pdf-export";
import { formatFilename, resolveLocalNumber } from "@/lib/utils";
import { isBrandThemeEstablished } from "@/lib/utils/brand-theme";
import { brandSetupHref } from "@/lib/utils/brand-setup";
import {
  DEFAULT_ORG_CHART_FORMAT,
  DEFAULT_ORG_CHART_LAYOUT,
  ORG_CHART_FORMAT_ORDER,
  ORG_CHART_FORMATS,
  ORG_CHART_LAYOUT_ORDER,
  orgChartExportPixelRatio,
  orgChartLayoutShowsLocation,
  type OrgChartFormatId,
  type OrgChartLayoutId,
} from "@/lib/constants/org-chart-formats";
import {
  directoryRowsFromPeople,
  emptyRosterPerson,
} from "@/lib/org-chart";
import {
  MAX_ROSTER_PEOPLE,
  PUBLIC_ROSTER_GROUPS,
  type PublicRosterGroup,
  type PublicRosterPerson,
  type PublicRosterUnit,
} from "@/types/public-roster";
import type { DesignTreatment } from "@/types/entities";
import { resolveDesignTreatment } from "@/lib/brand/design-treatment";
import { resolveCanvasTokens } from "@/lib/utils/canvas-tokens";
import {
  EMPTY_CANVAS_TOKEN_OVERRIDES,
  resolveCanvasTokensWithOverrides,
  type CanvasTokenOverrides,
} from "@/lib/comms/canvas-token-overrides";
import type { BoardLogoMode } from "@/lib/constants/board-banner-ornaments";
import {
  INITIAL_LOGO_MODE,
  defaultLogoMode,
  defaultShowLocalNumber,
} from "@/lib/comms/canvas-logo-mode";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { Callout } from "@/components/ui/Callout";
import { SegControl } from "@/components/tools/SegControl";
import { DesignTreatmentControl } from "@/components/tools/DesignTreatmentControl";
import { CanvasBrandingControls } from "@/components/tools/CanvasBrandingControls";
import { CanvasTokenOverridesControls } from "@/components/tools/CanvasTokenOverridesControls";
import { UndoRedoBar } from "@/components/tools/UndoRedoBar";
import { ToolFormDetails } from "@/components/tools/ToolFormDetails";
import { ToolEditorLayout } from "@/components/tools/ToolEditorLayout";
import { ToolLoadingFallback } from "@/components/tools/ToolLoadingFallback";
import { ToolRelatedFooter } from "@/components/tools/ToolRelatedFooter";
import { ToolExportActions } from "@/components/tools/ToolExportActions";
import { BrandSetupPrompt } from "@/components/tools/BrandSetupPrompt";
import {
  OrgChartCanvas,
  resolveOrgChartSheetFill,
  type OrgChartSheetBackground,
} from "@/components/tools/org-chart/OrgChartCanvas";

interface OrgChartChromeState {
  treatment: DesignTreatment;
  sheetBackground: OrgChartSheetBackground;
  title: string;
  formatId: OrgChartFormatId;
  layoutId: OrgChartLayoutId;
  logoMode: BoardLogoMode;
  showLocalNumber: boolean;
  canvasOverrides: CanvasTokenOverrides;
}

function PersonEditor({
  person,
  people,
  t,
  groupLabel,
  updatePerson,
  removePerson,
  canRemove,
  showLocationColumn,
}: {
  person: PublicRosterPerson;
  people: PublicRosterPerson[];
  t: ReturnType<typeof useTranslations<"orgChart">>;
  groupLabel: (group: PublicRosterGroup) => string;
  updatePerson: (id: string, patch: Partial<PublicRosterPerson>) => void;
  removePerson: (id: string) => void;
  canRemove: boolean;
  showLocationColumn: boolean;
}) {
  return (
    <div className="space-y-2 rounded-md border border-gray-200 p-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <Input
          label={t("name")}
          value={person.name}
          onChange={(e) => updatePerson(person.id, { name: e.target.value })}
        />
        <Input
          label={t("role")}
          value={person.role}
          onChange={(e) => updatePerson(person.id, { role: e.target.value })}
        />
        <Input
          label={showLocationColumn ? t("location") : t("locationOptional")}
          value={person.location}
          placeholder={t("locationPlaceholder")}
          maxLength={8}
          autoComplete="off"
          onChange={(e) =>
            updatePerson(person.id, { location: e.target.value })
          }
        />
      </div>
      <ToolFormDetails title={t("personMore")}>
        <div className="space-y-2">
          <Select
            label={t("group")}
            value={person.group}
            onChange={(e) =>
              updatePerson(person.id, {
                group: e.target.value as PublicRosterGroup,
                showOnWebsite:
                  e.target.value === "executive"
                    ? person.showOnWebsite
                    : person.group === "executive"
                      ? false
                      : person.showOnWebsite,
              })
            }
          >
            <option value="executive">{groupLabel("executive")}</option>
            <option value="stewards">{groupLabel("stewards")}</option>
            <option value="committee">{groupLabel("committee")}</option>
          </Select>
          {person.group === "committee" ? (
            <Input
              label={t("committeeName")}
              value={person.committeeName ?? ""}
              onChange={(e) =>
                updatePerson(person.id, {
                  committeeName: e.target.value,
                })
              }
            />
          ) : null}
          <Select
            label={t("unit")}
            value={person.unit ?? ""}
            onChange={(e) =>
              updatePerson(person.id, {
                unit: (e.target.value || null) as PublicRosterUnit | null,
              })
            }
          >
            <option value="">{t("unitNone")}</option>
            <option value="ft">{t("unitFt")}</option>
            <option value="pt">{t("unitPt")}</option>
          </Select>
          <Checkbox
            label={t("showOnWebsite")}
            checked={person.showOnWebsite}
            onChange={(e) =>
              updatePerson(person.id, {
                showOnWebsite: e.target.checked,
              })
            }
          />
          <Select
            label={t("reportsTo")}
            value={person.reportsToId ?? ""}
            onChange={(e) =>
              updatePerson(person.id, {
                reportsToId: e.target.value || null,
              })
            }
          >
            <option value="">{t("reportsToNone")}</option>
            {people
              .filter((other) => other.id !== person.id)
              .map((other) => (
                <option key={other.id} value={other.id}>
                  {other.name.trim() || other.role.trim() || other.id}
                </option>
              ))}
          </Select>
        </div>
      </ToolFormDetails>
      {canRemove ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => removePerson(person.id)}
        >
          {t("removePerson")}
        </Button>
      ) : null}
    </div>
  );
}

export default function OrgChartPage() {
  return (
    <Suspense fallback={<ToolLoadingFallback />}>
      <OrgChartPageContent />
    </Suspense>
  );
}

function OrgChartPageContent() {
  const t = useTranslations("orgChart");
  const tc = useTranslations("common");
  const brandKit = useBrandStore((s) => s.brandKit);
  const onboardingComplete = useBrandStore((s) => s.onboardingComplete);
  const hydrated = useBrandStore((s) => s.hydrated);
  const themeEstablished = isBrandThemeEstablished(brandKit, onboardingComplete);
  const roster = usePublicRosterStore((s) => s.roster);
  const setPeople = usePublicRosterStore((s) => s.setPeople);
  const canvasRef = useRef<HTMLDivElement>(null);

  const initial: OrgChartChromeState = {
    treatment: resolveDesignTreatment(brandKit),
    sheetBackground: "white",
    title: t("posterTitleDefault"),
    formatId: DEFAULT_ORG_CHART_FORMAT,
    layoutId: DEFAULT_ORG_CHART_LAYOUT,
    logoMode: INITIAL_LOGO_MODE,
    showLocalNumber: defaultShowLocalNumber(),
    canvasOverrides: { ...EMPTY_CANVAS_TOKEN_OVERRIDES },
  };

  const { state, setState, undo, redo, canUndo, canRedo, reset } =
    useUndoRedo<OrgChartChromeState>(initial);
  const { exportError, exportSuccess, exporting, runExport } =
    useExportHandler();

  useOneShotBrandSeed(hydrated, () => {
    reset({
      ...initial,
      treatment: resolveDesignTreatment(brandKit),
      logoMode: defaultLogoMode(themeEstablished),
      showLocalNumber: defaultShowLocalNumber(),
      sheetBackground: "white",
    });
  });

  const format = ORG_CHART_FORMATS[state.formatId];
  const exportPixelRatio = orgChartExportPixelRatio(format);
  const people = roster.people;
  const brandCanvasTokens = resolveCanvasTokens(brandKit);
  const tokens = resolveCanvasTokensWithOverrides(
    brandKit,
    state.canvasOverrides,
  );
  const sheet = resolveOrgChartSheetFill({
    treatment: state.treatment,
    sheetBackground: state.sheetBackground,
    primary: brandKit.primaryColor,
    secondary: brandKit.secondaryColor,
    accent: brandKit.accentColor,
  });
  const exportBackground = sheet.outerFill;

  const updatePerson = (
    id: string,
    patch: Partial<PublicRosterPerson>,
  ) => {
    setPeople(
      people.map((person) =>
        person.id === id ? { ...person, ...patch } : person,
      ),
    );
  };

  const addPerson = (group: PublicRosterGroup) => {
    if (people.length >= MAX_ROSTER_PEOPLE) return;
    setPeople([...people, emptyRosterPerson(group)]);
  };

  const removePerson = (id: string) => {
    if (people.length <= 1) return;
    setPeople(
      people
        .filter((person) => person.id !== id)
        .map((person) =>
          person.reportsToId === id ? { ...person, reportsToId: null } : person,
        ),
    );
  };

  const handleExportPng = async () => {
    if (!canvasRef.current) return;
    await runExport(async () => {
      await exportNodeAsPng(
        canvasRef.current!,
        formatFilename(format.filenameStem, brandKit.local.localNumber, "png"),
        { pixelRatio: exportPixelRatio, backgroundColor: exportBackground },
      );
    });
  };

  const handleExportPdf = async () => {
    if (!canvasRef.current) return;
    await runExport(async () => {
      await nodeToPdf(
        canvasRef.current!,
        formatFilename(format.filenameStem, brandKit.local.localNumber, "pdf"),
        format.widthInches,
        format.heightInches,
        exportPixelRatio,
        exportBackground,
      );
    });
  };

  const handleExportDocx = async () => {
    await runExport(async () => {
      const { buildLecDirectoryDocx } = await import(
        "@/lib/export/office-docx-builders"
      );
      const rows = directoryRowsFromPeople(people, t("stewardsPosition"));
      const blob = await buildLecDirectoryDocx({
        treatment: state.treatment,
        palette: {
          primary: brandKit.primaryColor,
          secondary: brandKit.secondaryColor,
          accent: brandKit.accentColor,
        },
        localLabel: `Local ${resolveLocalNumber(brandKit.local.localNumber)}`,
        sheetTitle: state.title.trim() || undefined,
        rows,
        fields: {
          subtitle: brandKit.local.subText?.trim() || "",
          officeEmail: brandKit.contactEmail?.trim() || "",
          officePhone: brandKit.contactPhone?.trim() || "",
          officeAddress: brandKit.contactAddress?.trim() || "",
        },
      });
      await downloadBlob(
        blob,
        formatFilename(format.filenameStem, brandKit.local.localNumber, "docx"),
      );
    });
  };

  const groupLabel = (group: PublicRosterGroup) => t(`groups.${group}`);

  const addLabel = (group: PublicRosterGroup) => {
    if (group === "executive") return t("addExecutive");
    if (group === "stewards") return t("addSteward");
    return t("addCommittee");
  };

  const resetChrome = () =>
    reset({
      ...initial,
      treatment: resolveDesignTreatment(brandKit),
      logoMode: themeEstablished ? "lockup" : "none",
      showLocalNumber: defaultShowLocalNumber(),
      sheetBackground: "white",
      canvasOverrides: { ...EMPTY_CANVAS_TOKEN_OVERRIDES },
    });

  return (
    <ToolEditorLayout
      title={t("title")}
      description={t("subtitle")}
      purposeHint={t("whenToUse")}
      toolbar={
        !themeEstablished ? (
          <BrandSetupPrompt themeEstablished={themeEstablished} />
        ) : undefined
      }
      exportError={exportError}
      exportSuccess={exportSuccess}
      previewAccessibleName={t("previewAccessibleName")}
      form={
        <div className="space-y-3">
          <Input
            label={t("posterTitle")}
            value={state.title}
            onChange={(e) => setState({ ...state, title: e.target.value })}
          />
          <DesignTreatmentControl
            value={state.treatment}
            primaryColor={brandKit.primaryColor}
            onChange={(treatment) => setState({ ...state, treatment })}
          />
          <SegControl
            label={t("sheetBackground")}
            value={state.sheetBackground}
            options={[
              { value: "white", label: t("sheetBackgroundWhite") },
              { value: "brand", label: t("sheetBackgroundBrand") },
            ]}
            onChange={(sheetBackground) =>
              setState({
                ...state,
                sheetBackground: sheetBackground as OrgChartSheetBackground,
              })
            }
          />
          <p className="text-sm text-gray-600">{t("sheetBackgroundHint")}</p>

          <ToolFormDetails title={tc("sectionLayout")}>
            <SegControl
              label={t("layout")}
              value={state.layoutId}
              options={ORG_CHART_LAYOUT_ORDER.map((id) => ({
                value: id,
                label: t(
                  id === "poster"
                    ? "layoutPoster"
                    : id === "list"
                      ? "layoutList"
                      : "layoutListLocation",
                ),
              }))}
              onChange={(layoutId) => setState({ ...state, layoutId })}
            />
            <p className="text-sm text-gray-600">{t("layoutHint")}</p>
            <SegControl
              label={t("format")}
              value={state.formatId}
              options={ORG_CHART_FORMAT_ORDER.map((id) => ({
                value: id,
                label: t(ORG_CHART_FORMATS[id].labelKey),
              }))}
              onChange={(formatId) => setState({ ...state, formatId })}
            />
            <CanvasBrandingControls
              logoMode={state.logoMode}
              onLogoModeChange={(logoMode) => setState({ ...state, logoMode })}
              showLocalNumber={state.showLocalNumber}
              onShowLocalNumberChange={(showLocalNumber) =>
                setState({ ...state, showLocalNumber })
              }
            />
          </ToolFormDetails>

          <CanvasTokenOverridesControls
            brandDefaults={{
              typeScale: brandCanvasTokens.typeScale,
              density: brandCanvasTokens.density,
              alignmentBias: brandCanvasTokens.alignmentBias,
              qrPlate: brandCanvasTokens.qrPlate,
              surface: brandCanvasTokens.surface,
            }}
            overrides={state.canvasOverrides}
            onChange={(canvasOverrides) =>
              setState({ ...state, canvasOverrides })
            }
          />

          <p className="text-sm font-medium text-gray-800">{t("peopleHeading")}</p>
          <p className="text-sm text-gray-600">{t("peopleIntro")}</p>

          <div className="space-y-4">
            {PUBLIC_ROSTER_GROUPS.map((group) => {
              const sectionPeople = people.filter((row) => row.group === group);
              return (
                <section key={group} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                    {groupLabel(group)}
                  </p>
                  {sectionPeople.map((person) => (
                    <PersonEditor
                      key={person.id}
                      person={person}
                      people={people}
                      t={t}
                      groupLabel={groupLabel}
                      updatePerson={updatePerson}
                      removePerson={removePerson}
                      canRemove={people.length > 1}
                      showLocationColumn={orgChartLayoutShowsLocation(
                        state.layoutId,
                      )}
                    />
                  ))}
                  {people.length < MAX_ROSTER_PEOPLE ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addPerson(group)}
                    >
                      {addLabel(group)}
                    </Button>
                  ) : null}
                </section>
              );
            })}
          </div>

          <Callout tone="muted">
            <p>{t("websiteHint")}</p>
            <p className="mt-2">
              <Link
                href="/create/website-template"
                className="font-semibold text-opseu-blue underline underline-offset-2"
              >
                {t("websiteLink")}
              </Link>
            </p>
            <p className="mt-2">{t("docGenHint")}</p>
            <p className="mt-1">
              <Link
                href={documentGeneratorPresetHref("lec-directory")}
                className="font-semibold text-opseu-blue underline underline-offset-2"
              >
                {t("docGenLink")}
              </Link>
            </p>
          </Callout>

          <Callout tone="muted">
            <p>{t("packCallout")}</p>
            <p className="mt-2">
              <Link
                href="/create/local-pack"
                className="font-semibold text-opseu-blue underline underline-offset-2"
              >
                {t("packLink")}
              </Link>
            </p>
          </Callout>

          <UndoRedoBar
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
            onReset={resetChrome}
          />

          <ToolExportActions
            exporting={exporting}
            onPng={() => void handleExportPng()}
            onPdf={() => void handleExportPdf()}
            onDocx={() => void handleExportDocx()}
            docxLabel={t("downloadWordList")}
          />
          {!themeEstablished ? (
            <p className="text-sm text-gray-600">
              <Link
                href={brandSetupHref(false)}
                className="font-medium text-opseu-blue underline underline-offset-2"
              >
                {tc("setupBrandLink")}
              </Link>
            </p>
          ) : null}
        </div>
      }
      previewActions={
        <ToolExportActions
          exporting={exporting}
          onPng={() => void handleExportPng()}
          onPdf={() => void handleExportPdf()}
          onDocx={() => void handleExportDocx()}
          docxLabel={t("downloadWordList")}
        />
      }
      preview={
        <OrgChartCanvas
          canvasRef={canvasRef}
          brandKit={brandKit}
          treatment={state.treatment}
          sheetBackground={state.sheetBackground}
          tokens={tokens}
          logoMode={state.logoMode}
          showLocalNumber={state.showLocalNumber}
          people={people}
          formatId={state.formatId}
          layoutId={state.layoutId}
          title={state.title}
          executiveLabel={t("bandExecutive")}
          stewardsLabel={t("bandStewards")}
          committeeLabel={t("bandCommittee")}
          emptyLabel={t("canvasEmpty")}
          positionColumnLabel={t("columnPosition")}
          nameColumnLabel={t("columnName")}
          locationColumnLabel={t("columnLocation")}
          stewardsPositionLabel={t("stewardsPosition")}
        />
      }
      footer={<ToolRelatedFooter toolSlug="org-chart" />}
    />
  );
}
