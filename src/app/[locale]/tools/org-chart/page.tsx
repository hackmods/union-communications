"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useBrandStore } from "@/store/brand-store";
import { usePublicRosterStore } from "@/store/public-roster-store";
import { useExportHandler } from "@/hooks/use-export-handler";
import { exportNodeAsPng } from "@/lib/export/image-export";
import { nodeToPdf } from "@/lib/export/pdf-export";
import { formatFilename, resolveLocalNumber } from "@/lib/utils";
import { isBrandThemeEstablished } from "@/lib/utils/brand-theme";
import { brandSetupHref } from "@/lib/utils/brand-setup";
import {
  DEFAULT_ORG_CHART_FORMAT,
  DEFAULT_ORG_CHART_LAYOUT,
  ORG_CHART_FORMAT_ORDER,
  ORG_CHART_FORMATS,
  type OrgChartFormatId,
  type OrgChartLayoutId,
} from "@/lib/constants/org-chart-formats";
import {
  emptyRosterPerson,
  parsePublicRosterCsv,
  parsePublicRosterJsonText,
  serializePublicRoster,
  serializePublicRosterCsv,
  type RosterImportCode,
} from "@/lib/org-chart";
import {
  MAX_ROSTER_PEOPLE,
  PUBLIC_ROSTER_GROUPS,
  type PublicRosterGroup,
  type PublicRosterPerson,
  type PublicRosterUnit,
} from "@/types/public-roster";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { Card } from "@/components/ui/Card";
import { Callout } from "@/components/ui/Callout";
import { SegControl } from "@/components/tools/SegControl";
import { ToolFormDetails } from "@/components/tools/ToolFormDetails";
import { ToolEditorLayout } from "@/components/tools/ToolEditorLayout";
import { ToolRelatedFooter } from "@/components/tools/ToolRelatedFooter";
import { ToolExportActions } from "@/components/tools/ToolExportActions";
import { BrandSetupPrompt } from "@/components/tools/BrandSetupPrompt";
import { OrgChartCanvas } from "@/components/tools/org-chart/OrgChartCanvas";

function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function PersonEditor({
  person,
  people,
  t,
  groupLabel,
  updatePerson,
  removePerson,
  canRemove,
}: {
  person: PublicRosterPerson;
  people: PublicRosterPerson[];
  t: ReturnType<typeof useTranslations<"orgChart">>;
  groupLabel: (group: PublicRosterGroup) => string;
  updatePerson: (id: string, patch: Partial<PublicRosterPerson>) => void;
  removePerson: (id: string) => void;
  canRemove: boolean;
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
          label={t("location")}
          value={person.location}
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
  const t = useTranslations("orgChart");
  const tc = useTranslations("common");
  const brandKit = useBrandStore((s) => s.brandKit);
  const onboardingComplete = useBrandStore((s) => s.onboardingComplete);
  const themeEstablished = isBrandThemeEstablished(brandKit, onboardingComplete);
  const roster = usePublicRosterStore((s) => s.roster);
  const setPeople = usePublicRosterStore((s) => s.setPeople);
  const importRoster = usePublicRosterStore((s) => s.importRoster);
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [formatId, setFormatId] = useState<OrgChartFormatId>(
    DEFAULT_ORG_CHART_FORMAT,
  );
  const [layoutId, setLayoutId] = useState<OrgChartLayoutId>(
    DEFAULT_ORG_CHART_LAYOUT,
  );
  const [title, setTitle] = useState(t("posterTitleDefault"));
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importTone, setImportTone] = useState<"danger" | "success">("success");
  const { exportError, exportSuccess, exporting, runExport } =
    useExportHandler();

  const localNumber = resolveLocalNumber(brandKit.local.localNumber);
  const format = ORG_CHART_FORMATS[formatId];
  const people = roster.people;

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

  const importErrorMessage = (code: RosterImportCode): string => {
    if (code === "brandKit") return t("importBrandKit");
    if (code === "invalidJson") return t("importInvalidJson");
    if (code === "invalidCsv") return t("importInvalidCsv");
    if (code === "empty") return t("importEmpty");
    return t("importInvalidSchema");
  };

  const handleImportFile = async (file: File) => {
    const text = await file.text();
    const lower = file.name.toLowerCase();
    const result = lower.endsWith(".csv")
      ? parsePublicRosterCsv(text)
      : parsePublicRosterJsonText(text);
    if (!result.ok) {
      setImportTone("danger");
      setImportMessage(importErrorMessage(result.code));
      return;
    }
    importRoster(result.roster);
    setImportTone("success");
    setImportMessage(t("importSuccess"));
  };

  const handleExportJson = () => {
    downloadText(
      `org-chart-local-${localNumber}.json`,
      serializePublicRoster(roster),
      "application/json",
    );
  };

  const handleExportCsv = () => {
    downloadText(
      `org-chart-local-${localNumber}.csv`,
      serializePublicRosterCsv(roster),
      "text/csv;charset=utf-8",
    );
  };

  const handleExportPng = async () => {
    if (!canvasRef.current) return;
    await runExport(async () => {
      await exportNodeAsPng(
        canvasRef.current!,
        formatFilename(format.filenameStem, brandKit.local.localNumber, "png"),
        { pixelRatio: 2, backgroundColor: brandKit.primaryColor },
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
        2,
        brandKit.primaryColor,
      );
    });
  };

  const groupLabel = (group: PublicRosterGroup) => t(`groups.${group}`);

  const addLabel = (group: PublicRosterGroup) => {
    if (group === "executive") return t("addExecutive");
    if (group === "stewards") return t("addSteward");
    return t("addCommittee");
  };

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
        <Card density="compact" className="space-y-3">
          <Input
            label={t("posterTitle")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <SegControl
            label={t("layout")}
            value={layoutId}
            options={[
              { value: "poster" as const, label: t("layoutPoster") },
              { value: "directory" as const, label: t("layoutDirectory") },
            ]}
            onChange={setLayoutId}
          />
          <SegControl
            label={t("format")}
            value={formatId}
            options={ORG_CHART_FORMAT_ORDER.map((id) => ({
              value: id,
              label: t(ORG_CHART_FORMATS[id].labelKey),
            }))}
            onChange={setFormatId}
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
                href="/tools/website-template"
                className="font-semibold text-opseu-blue underline underline-offset-2"
              >
                {t("websiteLink")}
              </Link>
            </p>
            <p className="mt-2">{t("docGenHint")}</p>
            <p className="mt-1">
              <Link
                href="/tools/document-generator?preset=lec-directory"
                className="font-semibold text-opseu-blue underline underline-offset-2"
              >
                {t("docGenLink")}
              </Link>
            </p>
          </Callout>

          <ToolFormDetails title={t("dataHeading")}>
            <p className="text-sm text-gray-600">{t("dataIntro")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleExportJson}>
                {t("exportJson")}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleExportCsv}>
                {t("exportCsv")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
              >
                {t("importFile")}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".json,.csv,application/json,text/csv"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void handleImportFile(file);
                }}
              />
            </div>
            {importMessage ? (
              <p
                className={
                  importTone === "danger"
                    ? "mt-2 text-sm text-red-700"
                    : "mt-2 text-sm text-green-800"
                }
                role={importTone === "danger" ? "alert" : "status"}
              >
                {importMessage}
              </p>
            ) : null}
          </ToolFormDetails>

          <ToolExportActions
            exporting={exporting}
            onPng={() => void handleExportPng()}
            onPdf={() => void handleExportPdf()}
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
        </Card>
      }
      previewActions={
        <ToolExportActions
          exporting={exporting}
          onPng={() => void handleExportPng()}
          onPdf={() => void handleExportPdf()}
        />
      }
      preview={
        <OrgChartCanvas
          canvasRef={canvasRef}
          brandKit={brandKit}
          people={people}
          formatId={formatId}
          layoutId={layoutId}
          title={title}
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
