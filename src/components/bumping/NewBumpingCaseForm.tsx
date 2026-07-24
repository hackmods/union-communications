"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PdfUploadField } from "@/components/bumping/PdfUploadField";
import { useHybridCaseStore } from "@/hooks/use-hybrid-case-store";
import type { PositionDescription } from "@/types/bumping";

const emptyPosition = (): PositionDescription => ({
  title: "",
  duties: "",
  qualifications: "",
  seniorityNotes: "",
});

export function NewBumpingCaseForm() {
  const t = useTranslations("bumping");
  const th = useTranslations("hybrid");
  const router = useRouter();
  const { createBumpingCase, needsUnlock } = useHybridCaseStore();
  const [memberRef, setMemberRef] = useState("");
  const [seniorityDate, setSeniorityDate] = useState("");
  const [currentPosition, setCurrentPosition] = useState("");
  const [targetPosition, setTargetPosition] = useState("");
  const [scenario, setScenario] = useState("");
  const [incumbentPosition, setIncumbentPosition] = useState(emptyPosition());
  const [bumpingPosition, setBumpingPosition] = useState(emptyPosition());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (needsUnlock) {
      setError(th("needsUnlockBanner"));
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const data = await createBumpingCase({
        memberRef,
        seniorityDate,
        currentPosition,
        targetPosition,
        scenario,
        incumbentPosition,
        bumpingPosition,
      });
      router.push(`/app/bumping/${data.bumpingCase.id}`);
    } catch {
      setError(t("createError"));
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardTitle>{t("newCase")}</CardTitle>
      <p className="mt-1 text-xs text-gray-500">{t("disclaimer")}</p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <Input
          label={t("memberRef")}
          value={memberRef}
          onChange={(e) => setMemberRef(e.target.value)}
          required
        />
        <Input
          label={t("seniorityDate")}
          type="date"
          value={seniorityDate}
          onChange={(e) => setSeniorityDate(e.target.value)}
          required
        />
        <Input
          label={t("currentPositionLabel")}
          value={currentPosition}
          onChange={(e) => setCurrentPosition(e.target.value)}
          required
        />
        <Input
          label={t("targetPositionLabel")}
          value={targetPosition}
          onChange={(e) => setTargetPosition(e.target.value)}
          required
        />
        <div className="space-y-1">
          <label htmlFor="scenario" className="block text-sm font-medium text-gray-700">
            {t("scenario")}
          </label>
          <textarea
            id="scenario"
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            required
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base"
          />
        </div>

        <PdfUploadField
          label={t("incumbentPosition")}
          position={incumbentPosition}
          onChange={setIncumbentPosition}
        />
        <PdfUploadField
          label={t("bumpingPosition")}
          position={bumpingPosition}
          onChange={setBumpingPosition}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? t("creating") : t("create")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/app/bumping")}
          >
            {t("cancel")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
