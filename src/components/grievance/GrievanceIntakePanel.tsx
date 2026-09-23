"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type {
  Grievance,
  GrievanceIntake,
  GrievanceLinkedSnippet,
  GrievanceType,
  UpdateGrievanceInput,
} from "@/types/grievance";
import type { CaSnippet } from "@/types/qol";

const GRIEVANCE_TYPES: GrievanceType[] = ["individual", "group", "policy"];

const INTAKE_KEYS = [
  "who",
  "what",
  "when",
  "where",
  "why",
  "how",
  "remedy",
] as const;

type IntakeKey = (typeof INTAKE_KEYS)[number];

const INTAKE_LABEL_KEYS: Record<IntakeKey, string> = {
  who: "intakeWho",
  what: "intakeWhat",
  when: "intakeWhen",
  where: "intakeWhere",
  why: "intakeWhy",
  how: "intakeHow",
  remedy: "intakeRemedy",
};

export function GrievanceIntakePanel({
  grievance,
  readOnly,
  onSave,
}: {
  grievance: Grievance;
  readOnly: boolean;
  onSave: (input: UpdateGrievanceInput) => Promise<boolean>;
}) {
  const t = useTranslations("grievance");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [grievanceType, setGrievanceType] = useState<GrievanceType | "">("");
  const [summary, setSummary] = useState("");
  const [memberNamesText, setMemberNamesText] = useState("");
  const [intake, setIntake] = useState<GrievanceIntake>({});
  const [linked, setLinked] = useState<GrievanceLinkedSnippet[]>([]);
  const [snippets, setSnippets] = useState<CaSnippet[]>([]);

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

  function beginEdit() {
    setGrievanceType(grievance.grievanceType ?? "");
    setSummary(grievance.summary ?? "");
    setMemberNamesText((grievance.memberNames ?? []).join("\n"));
    setIntake(grievance.intake ?? {});
    setLinked(grievance.linkedSnippets ?? []);
    setError(null);
    setEditing(true);
  }

  function toggleSnippet(snip: CaSnippet) {
    setLinked((prev) => {
      const exists = prev.some((p) => p.snippetId === snip.id);
      if (exists) return prev.filter((p) => p.snippetId !== snip.id);
      return [
        ...prev,
        {
          snippetId: snip.id,
          clauseRef: snip.clauseRef,
          title: snip.title,
          bodySnapshot: snip.body,
        },
      ];
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    setSaving(true);
    setError(null);
    const memberNames = memberNamesText
      .split(/[\n,]/)
      .map((n) => n.trim())
      .filter(Boolean);
    const intakePayload = Object.fromEntries(
      Object.entries(intake).filter(([, v]) => Boolean(v?.trim())),
    ) as GrievanceIntake;
    const ok = await onSave({
      grievanceType: grievanceType ? (grievanceType as GrievanceType) : null,
      summary: summary.trim() || null,
      memberNames: memberNames.length ? memberNames : null,
      intake: Object.keys(intakePayload).length ? intakePayload : null,
      linkedSnippets: linked.length ? linked : null,
    });
    setSaving(false);
    if (ok) setEditing(false);
    else setError(t("intakeSaveError"));
  }

  const hasContent =
    Boolean(grievance.summary) ||
    Boolean(grievance.grievanceType) ||
    Boolean(grievance.memberNames?.length) ||
    Boolean(grievance.intake && Object.values(grievance.intake).some(Boolean)) ||
    Boolean(grievance.linkedSnippets?.length);

  return (
    <Card className="mt-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <CardTitle>{t("intakePanelTitle")}</CardTitle>
          <p className="mt-1 text-xs text-gray-500">{t("intakePanelHint")}</p>
        </div>
        {!readOnly && !editing && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => beginEdit()}
          >
            {hasContent ? t("editIntake") : t("addIntake")}
          </Button>
        )}
      </div>

      {!editing ? (
        <div className="mt-3 space-y-2 text-sm text-gray-800">
          {!hasContent ? (
            <p className="text-gray-500">{t("intakeEmpty")}</p>
          ) : (
            <>
              {grievance.grievanceType && (
                <p>
                  <span className="font-medium">{t("grievanceType")}: </span>
                  {t(`grievanceTypes.${grievance.grievanceType}`)}
                </p>
              )}
              {grievance.summary && (
                <p>
                  <span className="font-medium">{t("summary")}: </span>
                  {grievance.summary}
                </p>
              )}
              {grievance.memberNames?.length ? (
                <p>
                  <span className="font-medium">{t("memberNames")}: </span>
                  {grievance.memberNames.join(", ")}
                </p>
              ) : null}
              {INTAKE_KEYS.map((key) => {
                const value = grievance.intake?.[key];
                if (!value) return null;
                return (
                  <p key={key}>
                    <span className="font-medium">{t(INTAKE_LABEL_KEYS[key])}: </span>
                    {value}
                  </p>
                );
              })}
              {grievance.linkedSnippets?.length ? (
                <div>
                  <p className="font-medium">{t("linkedSnippets")}</p>
                  <ul className="mt-1 list-inside list-disc space-y-1">
                    {grievance.linkedSnippets.map((s) => (
                      <li key={s.snippetId}>
                        {s.clauseRef} — {s.title}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : (
        <form onSubmit={handleSave} className="mt-3 space-y-3">
          <Select
            label={t("grievanceType")}
            value={grievanceType}
            onChange={(e) =>
              setGrievanceType(e.target.value as GrievanceType | "")
            }
          >
            <option value="">{t("grievanceTypeUnset")}</option>
            {GRIEVANCE_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`grievanceTypes.${type}`)}
              </option>
            ))}
          </Select>
          <Textarea
            label={t("summary")}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
          />
          <Textarea
            label={t("memberNames")}
            value={memberNamesText}
            onChange={(e) => setMemberNamesText(e.target.value)}
            rows={2}
          />
          <p className="text-sm text-gray-600">{t("memberNamesHint")}</p>
          <fieldset className="space-y-2 rounded-lg border border-gray-200 p-3">
            <legend className="px-1 text-sm font-semibold text-opseu-dark">
              {t("intakeHeading")}
            </legend>
            {INTAKE_KEYS.map((key) => (
              <Textarea
                key={key}
                label={t(INTAKE_LABEL_KEYS[key])}
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
                        checked={linked.some((l) => l.snippetId === snip.id)}
                        onChange={() => toggleSnippet(snip)}
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
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? t("saving") : t("saveIntake")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
            >
              {t("cancel")}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
