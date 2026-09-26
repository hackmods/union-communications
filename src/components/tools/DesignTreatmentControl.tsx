"use client";

import { useTranslations } from "next-intl";
import { SegControl } from "@/components/tools/SegControl";
import { DESIGN_TREATMENTS } from "@/lib/brand/design-treatment";
import type { DesignTreatment } from "@/types/entities";

export function DesignTreatmentControl({
  value,
  onChange,
}: {
  value: DesignTreatment;
  onChange: (value: DesignTreatment) => void;
}) {
  const t = useTranslations("designTreatment");
  return (
    <div className="space-y-2">
      <SegControl
        label={t("label")}
        value={value}
        options={DESIGN_TREATMENTS.map((id) => ({
          value: id,
          label: t(id),
        }))}
        onChange={(id) => onChange(id as DesignTreatment)}
      />
      <div className="grid max-w-sm grid-cols-3 gap-2" aria-hidden="true">
        {DESIGN_TREATMENTS.map((id) => (
          <div key={id} className={`h-12 overflow-hidden rounded border ${value === id ? "border-blue-700 ring-1 ring-blue-700" : "border-slate-300"}`}>
            <div className="h-2 bg-rose-600" />
            <div className={id === "full" ? "h-10 bg-rose-600 p-1" : id === "balanced" ? "h-10 bg-rose-600 p-1" : "h-10 bg-white p-1"}>
              <div className={`h-5 rounded-sm ${id === "full" ? "bg-rose-300" : "bg-white"}`} />
              {id === "paper" ? <div className="mt-1 h-0.5 w-2/3 bg-rose-600" /> : null}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-600">{t(`hint.${value}`)}</p>
    </div>
  );
}
