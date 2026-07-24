"use client";

import { useState } from "react";
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

export function NewGrievanceForm() {
  const t = useTranslations("grievance");
  const th = useTranslations("hybrid");
  const router = useRouter();
  const { createGrievance, needsUnlock } = useHybridCaseStore();
  const [memberPseudonym, setMemberPseudonym] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [filedAt, setFiledAt] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
