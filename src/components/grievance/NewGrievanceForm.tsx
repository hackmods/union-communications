"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useHybridCaseStore } from "@/hooks/use-hybrid-case-store";

const CATEGORIES = [
  "Contract interpretation",
  "Discipline",
  "Health and safety",
  "Harassment",
  "Scheduling",
  "Other",
];

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
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    return () => { active = false; };
  }, [revision, source]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (needsUnlock) {
      setError(th("needsUnlockBanner"));
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const data = await createGrievance({
        memberPseudonym: memberPseudonym || undefined,
        ...(source === "central" && memberUserId ? { memberUserId } : {}),
        ...(source === "central" ? { privacyMode } : {}),
        ...(source === "central" && assignedStewardId ? { assignedStewardId } : {}),
        category,
        filedAt: new Date(filedAt).toISOString(),
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
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <Input
          label={t("memberPseudonym")}
          name="memberPseudonym"
          value={memberPseudonym}
          onChange={(e) => setMemberPseudonym(e.target.value)}
          placeholder={t("memberPseudonymHint")}
        />
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
        <Input
          label={t("filedAt")}
          name="filedAt"
          type="date"
          value={filedAt}
          onChange={(e) => setFiledAt(e.target.value)}
          required
        />
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
