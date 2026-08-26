import { cn } from "@/lib/utils";

const SCALE_STYLES = {
  one: {
    bg: "bg-emerald-50",
    border: "border-emerald-500",
    label: "text-emerald-950",
    badge: "bg-emerald-600 text-white",
  },
  two: {
    bg: "bg-sky-50",
    border: "border-sky-400",
    label: "text-sky-950",
    badge: "bg-sky-600 text-white",
  },
  three: {
    bg: "bg-slate-100",
    border: "border-slate-400",
    label: "text-slate-900",
    badge: "bg-slate-500 text-white",
  },
  four: {
    bg: "bg-amber-50",
    border: "border-amber-500",
    label: "text-amber-950",
    badge: "bg-amber-600 text-white",
  },
  five: {
    bg: "bg-white",
    border: "border-dashed border-slate-400",
    label: "text-slate-700",
    badge: "bg-slate-200 text-slate-800",
  },
} as const;

type ScaleId = keyof typeof SCALE_STYLES;

export interface SupportScaleDiagramProps {
  items: { id: ScaleId; number: string; label: string }[];
  ariaLabel: string;
  className?: string;
}

/** Colour-coded 1-to-5 organizing scale for the mapping playbook. */
export function SupportScaleDiagram({
  items,
  ariaLabel,
  className,
}: SupportScaleDiagramProps) {
  return (
    <div
      className={cn("grid gap-2 sm:grid-cols-5", className)}
      role="img"
      aria-label={ariaLabel}
    >
      {items.map((item) => {
        const style = SCALE_STYLES[item.id];
        return (
          <div
            key={item.id}
            className={cn(
              "flex flex-col items-center rounded-lg border-2 px-2 py-3 text-center",
              style.bg,
              style.border,
            )}
          >
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold",
                style.badge,
              )}
            >
              {item.number}
            </span>
            <p
              className={cn(
                "mt-2 text-xs font-semibold leading-snug sm:text-sm",
                style.label,
              )}
            >
              {item.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export interface PhysicalShiftDiagramProps {
  columns: { id: string; title: string; items: string[] }[];
  ariaLabel: string;
  className?: string;
}

/** Department chips grouped by shift — a wall-chart physical map. */
export function PhysicalShiftDiagram({
  columns,
  ariaLabel,
  className,
}: PhysicalShiftDiagramProps) {
  return (
    <div
      className={cn(
        "grid gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-3 sm:grid-cols-3",
        className,
      )}
      role="img"
      aria-label={ariaLabel}
    >
      {columns.map((column) => (
        <div
          key={column.id}
          className="rounded-md border border-gray-200 bg-white p-3"
        >
          <p className="text-center text-xs font-bold uppercase tracking-wide text-opseu-dark sm:text-sm">
            {column.title}
          </p>
          <ul className="mt-2 space-y-1.5">
            {column.items.map((item) => (
              <li
                key={item}
                className="rounded border border-opseu-blue/30 bg-opseu-blue/5 px-2 py-1.5 text-center text-xs font-medium text-opseu-dark"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export interface SocialMapDiagramProps {
  leader: string;
  around: string[];
  blindSpot: string;
  ariaLabel: string;
  className?: string;
}

/** Cluster of coworkers around an organic leader, plus a night-shift blind spot. */
export function SocialMapDiagram({
  leader,
  around,
  blindSpot,
  ariaLabel,
  className,
}: SocialMapDiagramProps) {
  const [top, left, right, bottom] = around;

  return (
    <div
      className={cn(
        "rounded-lg border border-gray-200 bg-white p-4",
        className,
      )}
      role="img"
      aria-label={ariaLabel}
    >
      <div className="mx-auto grid max-w-xs grid-cols-3 items-center justify-items-center gap-2">
        <span className="col-start-2">
          <PersonChip label={top} tone="neutral" />
        </span>
        <span className="col-start-1 row-start-2">
          <PersonChip label={left} tone="supporter" />
        </span>
        <span className="col-start-2 row-start-2">
          <PersonChip label={leader} tone="leader" />
        </span>
        <span className="col-start-3 row-start-2">
          <PersonChip label={right} tone="neutral" />
        </span>
        <span className="col-start-2 row-start-3">
          <PersonChip label={bottom} tone="organizer" />
        </span>
      </div>
      <p className="mt-4 rounded-md border-2 border-dashed border-slate-400 bg-slate-50 px-3 py-2 text-center text-xs font-semibold text-slate-700 sm:text-sm">
        {blindSpot}
      </p>
    </div>
  );
}

function PersonChip({
  label,
  tone,
}: {
  label: string;
  tone: "leader" | "organizer" | "supporter" | "neutral";
}) {
  const styles = {
    leader:
      "border-emerald-600 bg-emerald-100 px-3 py-2 text-sm font-bold text-emerald-950",
    organizer:
      "border-emerald-400 bg-emerald-50 px-2 py-1.5 text-xs font-semibold text-emerald-950",
    supporter:
      "border-sky-400 bg-sky-50 px-2 py-1.5 text-xs font-semibold text-sky-950",
    neutral:
      "border-slate-300 bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-800",
  } as const;

  return (
    <span
      className={cn(
        "inline-block rounded-full border-2 text-center leading-snug",
        styles[tone],
      )}
    >
      {label}
    </span>
  );
}
