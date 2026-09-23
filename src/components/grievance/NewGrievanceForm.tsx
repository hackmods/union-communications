"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useHybridCaseStore } from "@/hooks/use-hybrid-case-store";
import { useBrandStore } from "@/store/brand-store";
import {
  localLabel as formatLocalLabel,
  resolveLocalNumber,
} from "@/lib/utils/local";
import type {
  GrievanceIntake,
  GrievanceLinkedSnippet,
  GrievanceType,
  GrievanceWorkflowStage,
} from "@/types/grievance";
import type { CaSnippet } from "@/types/qol";

const CATEGORIES = [
  "Contract interpretation",
  "Discipline",
  "Health and safety",
  "Harassment",
  "Scheduling",
  "Other",
];

const GRIEVANCE_TYPES: GrievanceType[] = ["individual", "group", "policy"];

type GrievanceOptions = {
  source: string;
  revision: number;
  members: Array<{ id: string; name: string }>;
  caseWorkers: Array<{ id: string; name: string }>;
  canManageAccess: boolean;
  allowRestricted: boolean;
};

export function NewGrievanceForm() {
  const t = useTranslations("grievance");
  const th = useTranslations("hybrid");
  const router = useRouter();
  const { createGrievance, needsUnlock, source, revision } = useHybridCaseStore();
  const brandKit = useBrandStore((s) => s.brandKit);
  const hydrateBrand = useBrandStore((s) => s.hydrate);
  const [grievanceOptions, setGrievanceOptions] = useState<GrievanceOptions | null>(null);
  const currentOptions = grievanceOptions?.source === source && grievanceOptions.revision === revision
    ? grievanceOptions
    : null;
  const memberOptions = currentOptions?.members ?? [];
  const caseWorkerOptions = currentOptions?.caseWorkers ?? [];
  const canManageAccess = currentOptions?.canManageAccess ?? false;
  const allowRestricted = currentOptions?.allowRestricted ?? false;
  const [memberPseudonym, setMemberPseudonym] = useState("");
  const [memberUserId, setMemberUserId] = useState("");
  const [assignedStewardId, setAssignedStewardId] = useState("");
  const [privacyMode, setPrivacyMode] = useState<"standard" | "restricted">("standard");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [filedAt, setFiledAt] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [workflowStage, setWorkflowStage] =
    useState<GrievanceWorkflowStage>("intake");
  const [grievanceType, setGrievanceType] = useState<GrievanceType>("individual");
  const [memberNamesText, setMemberNamesText] = useState("");
  const [summary, setSummary] = useState("");
  /** null = still using live Brand Kit default (not yet edited). */
  const [localLabelOverride, setLocalLabelOverride] = useState<string | null>(null);
  const [unitLabelOverride, setUnitLabelOverride] = useState<string | null>(null);
  const [intake, setIntake] = useState<GrievanceIntake>({});
  const [snippets, setSnippets] = useState<CaSnippet[]>([]);
  const [selectedSnippetIds, setSelectedSnippetIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const brandLocalDefault = formatLocalLabel(
    brandKit.local.localNumber,
    brandKit.local.subText,
  );
  const brandUnitDefault =
    brandKit.local.bargainingUnitCode?.trim() ||
    brandKit.local.subText?.trim() ||
    "";
  const localLabelValue = localLabelOverride ?? brandLocalDefault;
  const unitLabelValue = unitLabelOverride ?? brandUnitDefault;

  useEffect(() => {
    void hydrateBrand();
  }, [hydrateBrand]);

  useEffect(() => {
    if (revision === 0 || source !== "central") return;
    let active = true;
    void fetch("/api/grievances/options")
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{
          members?: Array<{ id: string; name: string }>;
          caseWorkers?: Array<{ id: string; name: string }>;
          canManageAccess?: boolean;
          allowRestricted?: boolean;
        }>;
      })
      .then((options) => {
        if (!active || !options) return;
        setGrievanceOptions({
          source,
          revision,
          members: options.members ?? [],
          caseWorkers: options.caseWorkers ?? [],
          canManageAccess: Boolean(options.canManageAccess),
          allowRestricted: Boolean(options.allowRestricted),
        });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [revision, source]);

  useEffect(() => {
    let active = true;
    void fetch("/api/snippets")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (active && json?.snippets) setSnippets(json.snippets as CaSnippet[]);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  function toggleSnippet(id: string) {
    setSelectedSnippetIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (needsUnlock) {
      setError(th("needsUnlockBanner"));
      return;
    }
    setSubmitting(true);
    setError(null);

    const memberNames = memberNamesText
      .split(/[\n,]/)
      .map((n) => n.trim())
      .filter(Boolean);
    const linkedSnippets: GrievanceLinkedSnippet[] = selectedSnippetIds
      .map((snippetId) => snippets.find((s) => s.id === snippetId))
      .filter((s): s is CaSnippet => Boolean(s))
      .map((s) => ({
        snippetId: s.id,
        clauseRef: s.clauseRef,
        title: s.title,
        bodySnapshot: s.body,
      }));

    const intakePayload: GrievanceIntake = Object.fromEntries(
      Object.entries(intake).filter(([, v]) => Boolean(v?.trim())),
    ) as GrievanceIntake;

    try {
      const data = await createGrievance({
        memberPseudonym: memberPseudonym || undefined,
        ...(source === "central" && memberUserId ? { memberUserId } : {}),
        ...(source === "central" ? { privacyMode } : {}),
        ...(source === "central" && assignedStewardId
          ? { assignedStewardId }
          : {}),
        category,
        filedAt: new Date(filedAt).toISOString(),
        workflowStage,
        grievanceType,
        ...(memberNames.length ? { memberNames } : {}),
        ...(summary.trim() ? { summary: summary.trim() } : {}),
        ...(Object.keys(intakePayload).length ? { intake: intakePayload } : {}),
        ...(linkedSnippets.length ? { linkedSnippets } : {}),
        ...(localLabelValue.trim()
          ? { localLabel: localLabelValue.trim() }
          : {
              localLabel: formatLocalLabel(
                brandKit.local.localNumber,
                brandKit.local.subText,
              ),
            }),
        ...(unitLabelValue.trim()
          ? { unitLabel: unitLabelValue.trim() }
          : {}),
      });
      router.push(`/app/grievances/${data.grievance.id}`);
    } catch {
      setError(t("createError"));
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardTitle>{t("newGrievance")}</CardTitle>
      <p className="mt-1 text-sm text-gray-600">{t("newGrievanceHint")}</p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <Select
          label={t("workflowStageLabel")}
          value={workflowStage}
          onChange={(e) =>
            setWorkflowStage(e.target.value as GrievanceWorkflowStage)
          }
        >
          <option value="intake">{t("workflowStage.intake")}</option>
          <option value="formal">{t("workflowStage.formal")}</option>
        </Select>
        <p className="text-sm text-gray-600">{t("workflowStageHint")}</p>

        <Input
          label={t("localLabel")}
          name="localLabel"
          value={localLabelValue}
          onChange={(e) => setLocalLabelOverride(e.target.value)}
        />
        <p className="text-sm text-gray-600">
          {t("localLabelHint", {
            number: resolveLocalNumber(brandKit.local.localNumber),
          })}
        </p>
        <Input
          label={t("unitLabel")}
          name="unitLabel"
          value={unitLabelValue}
          onChange={(e) => setUnitLabelOverride(e.target.value)}
        />
        <p className="text-sm text-gray-600">{t("unitLabelHint")}</p>

        <Select
          label={t("grievanceType")}
          value={grievanceType}
          onChange={(e) => setGrievanceType(e.target.value as GrievanceType)}
        >
          {GRIEVANCE_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`grievanceTypes.${type}`)}
            </option>
          ))}
        </Select>

        <Input
          label={t("memberPseudonym")}
          name="memberPseudonym"
          value={memberPseudonym}
          onChange={(e) => setMemberPseudonym(e.target.value)}
          placeholder={t("memberPseudonymHint")}
        />
        <Textarea
          label={t("memberNames")}
          value={memberNamesText}
          onChange={(e) => setMemberNamesText(e.target.value)}
          rows={2}
        />
        <p className="text-sm text-gray-600">{t("memberNamesHint")}</p>
        {source === "central" && revision > 0 && memberOptions.length > 0 && (
          <div className="space-y-1">
            <label htmlFor="memberUserId" className="block text-sm font-medium text-gray-700">
              {t("registeredMember")}
            </label>
            <select
              id="memberUserId"
              value={memberUserId}
              onChange={(e) => setMemberUserId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-opseu-blue focus:ring-2 focus:ring-opseu-blue/20"
            >
              <option value="">{t("pseudonymOnly")}</option>
              {memberOptions.map((member) => (
                <option key={member.id} value={member.id}>{member.name}</option>
              ))}
            </select>
            <p className="text-sm text-gray-600">{t("registeredMemberHint")}</p>
          </div>
        )}
        {source === "central" && revision > 0 && allowRestricted && (
          <div className="space-y-1">
            <label htmlFor="privacyMode" className="block text-sm font-medium text-gray-700">
              {t("privacyLabel")}
            </label>
            <select
              id="privacyMode"
              value={privacyMode}
              onChange={(e) => setPrivacyMode(e.target.value as "standard" | "restricted")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-opseu-blue focus:ring-2 focus:ring-opseu-blue/20"
            >
              <option value="standard">{t("standardPrivacy")}</option>
              <option value="restricted">{t("restrictedPrivacy")}</option>
            </select>
            {privacyMode === "restricted" && <p className="text-sm text-gray-600">{t("restrictedPrivacyHint")}</p>}
          </div>
        )}
        {source === "central" && revision > 0 && canManageAccess && caseWorkerOptions.length > 0 && (
          <div className="space-y-1">
            <label htmlFor="assignedStewardId" className="block text-sm font-medium text-gray-700">
              {t("primaryCaseWorker")}
            </label>
            <select
              id="assignedStewardId"
              value={assignedStewardId}
              onChange={(e) => setAssignedStewardId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-opseu-blue focus:ring-2 focus:ring-opseu-blue/20"
            >
              <option value="">{t("assignToMe")}</option>
              {caseWorkerOptions.map((worker) => (
                <option key={worker.id} value={worker.id}>{worker.name}</option>
              ))}
            </select>
            <p className="text-sm text-gray-600">{t("primaryCaseWorkerHint")}</p>
          </div>
        )}
        <div className="space-y-1">
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">
            {t("category")}
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:border-opseu-blue focus:ring-2 focus:ring-opseu-blue/20"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <Textarea
          label={t("summary")}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
        />
        <Input
          label={t("filedAt")}
          name="filedAt"
          type="date"
          value={filedAt}
          onChange={(e) => setFiledAt(e.target.value)}
          required
        />

        <fieldset className="space-y-3 rounded-lg border border-gray-200 p-3">
          <legend className="px-1 text-sm font-semibold text-opseu-dark">
            {t("intakeHeading")}
          </legend>
          {(
            [
              ["who", "intakeWho"],
              ["what", "intakeWhat"],
              ["when", "intakeWhen"],
              ["where", "intakeWhere"],
              ["why", "intakeWhy"],
              ["how", "intakeHow"],
              ["remedy", "intakeRemedy"],
            ] as const
          ).map(([key, labelKey]) => (
            <Textarea
              key={key}
              label={t(labelKey)}
              value={intake[key] ?? ""}
              onChange={(e) =>
                setIntake((prev) => ({ ...prev, [key]: e.target.value }))
              }
              rows={2}
            />
          ))}
        </fieldset>

        {snippets.length > 0 && (
          <fieldset className="space-y-2 rounded-lg border border-gray-200 p-3">
            <legend className="px-1 text-sm font-semibold text-opseu-dark">
              {t("linkedSnippets")}
            </legend>
            <p className="text-sm text-gray-600">{t("linkedSnippetsHint")}</p>
            <ul className="max-h-48 space-y-2 overflow-y-auto">
              {snippets.map((snip) => (
                <li key={snip.id}>
                  <label className="flex cursor-pointer items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selectedSnippetIds.includes(snip.id)}
                      onChange={() => toggleSnippet(snip.id)}
                    />
                    <span>
                      <span className="font-medium">
                        {snip.clauseRef} — {snip.title}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? t("creating") : t("create")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/app/grievances")}
          >
            {t("cancel")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
