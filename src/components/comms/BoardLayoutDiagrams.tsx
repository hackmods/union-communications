import { cn } from "@/lib/utils";
import type { BoardZoneId } from "@/lib/constants/board-layouts";

const ZONE_STYLES: Record<
  BoardZoneId,
  { bg: string; border: string; labelClass: string }
> = {
  header: {
    bg: "bg-opseu-blue",
    border: "border-opseu-dark",
    labelClass: "text-white",
  },
  socials: {
    bg: "bg-sky-50",
    border: "border-sky-300",
    labelClass: "text-sky-950",
  },
  healthSafety: {
    bg: "bg-amber-50",
    border: "border-amber-300",
    labelClass: "text-amber-950",
  },
  lec: {
    bg: "bg-emerald-50",
    border: "border-emerald-300",
    labelClass: "text-emerald-950",
  },
  events: {
    bg: "bg-teal-50",
    border: "border-teal-300",
    labelClass: "text-teal-950",
  },
  filler: {
    bg: "bg-slate-100",
    border: "border-slate-300",
    labelClass: "text-slate-800",
  },
};

interface ZoneLabels {
  header: string;
  socials: string;
  healthSafety: string;
  lec: string;
  events: string;
  filler: string;
}

interface BareMinimumBoardDiagramProps {
  labels: ZoneLabels;
  className?: string;
}

/** Schematic of the bare-minimum workplace board zones. */
export function BareMinimumBoardDiagram({
  labels,
  className,
}: BareMinimumBoardDiagramProps) {
  const cells: { id: BoardZoneId; className: string }[] = [
    { id: "header", className: "col-span-2" },
    { id: "socials", className: "" },
    { id: "healthSafety", className: "" },
    { id: "lec", className: "col-span-2" },
    { id: "events", className: "col-span-2 min-h-[4.5rem]" },
  ];

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-3",
        className,
      )}
      role="img"
      aria-label={`${labels.header}; ${labels.socials}; ${labels.healthSafety}; ${labels.lec}; ${labels.events}`}
    >
      {cells.map((cell) => {
        const style = ZONE_STYLES[cell.id];
        return (
          <div
            key={cell.id}
            className={cn(
              "flex items-center justify-center rounded-md border-2 px-2 py-4 text-center text-xs font-bold uppercase tracking-wide sm:text-sm",
              style.bg,
              style.border,
              style.labelClass,
              cell.className,
            )}
          >
            {labels[cell.id]}
          </div>
        );
      })}
    </div>
  );
}

interface LayoutReferenceDiagramProps {
  areas: string[];
  zones: { id: BoardZoneId; area: string }[];
  labels: ZoneLabels;
  className?: string;
}

/** Compact CSS-grid schematic for a reference board layout. */
export function LayoutReferenceDiagram({
  areas,
  zones,
  labels,
  className,
}: LayoutReferenceDiagramProps) {
  const cols = Math.max(...areas.map((row) => row.trim().split(/\s+/).length));

  return (
    <div
      className={cn(
        "grid gap-1.5 rounded-md border border-gray-200 bg-gray-50 p-2",
        className,
      )}
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridTemplateAreas: areas.map((row) => `"${row}"`).join(" "),
      }}
      role="img"
      aria-hidden
    >
      {zones.map((zone) => {
        const style = ZONE_STYLES[zone.id];
        return (
          <div
            key={zone.area}
            className={cn(
              "flex min-h-[2.75rem] items-center justify-center rounded px-1 py-2 text-center text-[10px] font-bold uppercase leading-tight tracking-wide sm:text-xs",
              style.bg,
              style.border,
              style.labelClass,
              "border",
            )}
            style={{ gridArea: zone.area }}
          >
            {labels[zone.id]}
          </div>
        );
      })}
    </div>
  );
}
