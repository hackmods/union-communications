"use client";

import { useId } from "react";
import {
  UNION_PRESETS,
  type UnionBranding,
} from "@/lib/constants/unionPresets";

interface UnionPresetSelectProps {
  label: string;
  value: string;
  onSelect: (preset: UnionBranding) => void;
  placeholder?: string;
  className?: string;
}

export function UnionPresetSelect({
  label,
  value,
  onSelect,
  placeholder = "Choose a union…",
  className,
}: UnionPresetSelectProps) {
  const id = useId();

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => {
          const preset = UNION_PRESETS.find((p) => p.id === e.target.value);
          if (preset) onSelect(preset);
        }}
        className="w-full rounded-md border border-gray-300 px-3 py-2"
      >
        <option value="">{placeholder}</option>
        {UNION_PRESETS.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.name}
          </option>
        ))}
      </select>
    </div>
  );
}
