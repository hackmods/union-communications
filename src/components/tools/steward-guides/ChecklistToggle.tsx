"use client";

import { cn } from "@/lib/utils";

type ChecklistToggleProps = {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
};

/** Accessible checkbox row for steward guide measure / route lists. */
export function ChecklistToggle({
  id,
  label,
  checked,
  onChange,
  description,
}: ChecklistToggleProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition",
        checked
          ? "border-opseu-blue/40 bg-opseu-blue/5"
          : "border-gray-200 bg-white hover:border-gray-300",
      )}
    >
      <input
        id={id}
        type="checkbox"
        className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-opseu-blue focus-visible:ring-2 focus-visible:ring-opseu-blue/40"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="min-w-0">
        <span className="font-medium text-gray-900">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-gray-600">{description}</span>
        ) : null}
      </span>
    </label>
  );
}
