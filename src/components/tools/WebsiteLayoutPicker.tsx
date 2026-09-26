"use client";

import { cn } from "@/lib/utils";
import type { WebsiteLayoutId } from "@/lib/templates/website/layouts/registry";
import { WEBSITE_LAYOUT_IDS } from "@/lib/templates/website/layouts/registry";

type LayoutPickerProps = {
  value: WebsiteLayoutId;
  onChange: (id: WebsiteLayoutId) => void;
  labels: Record<WebsiteLayoutId, { title: string; blurb: string }>;
  legend: string;
};

const SWATCH: Record<WebsiteLayoutId, string> = {
  solidarity: "from-[#003DA5] via-[#0B203D] to-[#003DA5]",
  bulletin: "from-[#111] via-[#f4f0e8] to-[#e85d04]",
  hall: "from-[#f8fafc] via-[#e2e8f0] to-[#1e3a5f]",
};

/**
 * Visual layout chooser — switching layouts never clears website copy.
 */
export function WebsiteLayoutPicker({
  value,
  onChange,
  labels,
  legend,
}: LayoutPickerProps) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-opseu-dark">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {WEBSITE_LAYOUT_IDS.map((id) => {
          const selected = value === id;
          const meta = labels[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-pressed={selected}
              className={cn(
                "flex min-h-11 flex-col overflow-hidden rounded-lg border text-left transition",
                selected
                  ? "border-opseu-orange ring-2 ring-opseu-orange/40"
                  : "border-gray-200 hover:border-opseu-blue/40",
              )}
            >
              <span
                className={cn(
                  "block h-12 w-full bg-gradient-to-br",
                  SWATCH[id],
                )}
                aria-hidden
              />
              <span className="space-y-0.5 p-2.5">
                <span className="block text-sm font-bold text-opseu-dark">
                  {meta.title}
                </span>
                <span className="block text-xs leading-snug text-gray-600">
                  {meta.blurb}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
