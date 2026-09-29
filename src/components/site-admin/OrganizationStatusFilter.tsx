"use client";

type StatusFilter = "all" | "active" | "archived";

type Props = {
  filter: StatusFilter;
  onChange: (value: StatusFilter) => void;
  label: string;
  allLabel: string;
  activeLabel: string;
  archivedLabel: string;
};

/**
 * Compact All / Active / Archived control shared by organization panels.
 */
export function OrganizationStatusFilter({
  filter,
  onChange,
  label,
  allLabel,
  activeLabel,
  archivedLabel,
}: Props) {
  return (
    <div
      className="inline-flex max-w-full flex-wrap rounded-md border border-opseu-gray/20 bg-white p-0.5"
      role="group"
      aria-label={label}
    >
      {(
        [
          ["all", allLabel],
          ["active", activeLabel],
          ["archived", archivedLabel],
        ] as const
      ).map(([value, text]) => (
        <button
          key={value}
          type="button"
          className={
            filter === value
              ? "min-h-11 rounded px-3 py-1.5 text-sm font-semibold bg-opseu-dark text-white"
              : "min-h-11 rounded px-3 py-1.5 text-sm font-medium text-opseu-gray-dark hover:bg-opseu-gray/10"
          }
          aria-pressed={filter === value}
          onClick={() => onChange(value)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

export type { StatusFilter };
