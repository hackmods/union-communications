"use client";

import { useTranslations } from "next-intl";
import { SegControl } from "@/components/tools/SegControl";
import { DESIGN_TREATMENTS } from "@/lib/brand/design-treatment";
import type { DesignTreatment } from "@/types/entities";

export function DesignTreatmentControl({
  value,
  onChange,
  primaryColor = "#D65B60",
}: {
  value: DesignTreatment;
  onChange: (value: DesignTreatment) => void;
  /** Live Brand Kit primary so swatches match the steward palette. */
  primaryColor?: string;
}) {
  const t = useTranslations("designTreatment");
  const brand = primaryColor.trim() || "#D65B60";
  const soft = `color-mix(in srgb, ${brand} 45%, white)`;

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
          <div
            key={id}
            className={`h-12 overflow-hidden rounded border ${
              value === id
                ? "border-blue-700 ring-1 ring-blue-700"
                : "border-slate-300"
            }`}
          >
            <div className="h-2" style={{ backgroundColor: brand }} />
            <div
              className="h-10 p-1"
              style={{
                backgroundColor: id === "paper" ? "#FFFFFF" : brand,
              }}
            >
              <div
                className="h-5 rounded-sm"
                style={{
                  backgroundColor: id === "full" ? soft : "#FFFFFF",
                }}
              />
              {id === "paper" ? (
                <div
                  className="mt-1 h-0.5 w-2/3"
                  style={{ backgroundColor: brand }}
                />
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-600">{t(`hint.${value}`)}</p>
    </div>
  );
}
