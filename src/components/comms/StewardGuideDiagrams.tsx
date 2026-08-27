import { cn } from "@/lib/utils";

const HAT_STYLES = {
  enforcer: {
    bg: "bg-amber-50",
    border: "border-amber-400",
    label: "text-amber-950",
  },
  communicator: {
    bg: "bg-sky-50",
    border: "border-sky-400",
    label: "text-sky-950",
  },
  organizer: {
    bg: "bg-emerald-50",
    border: "border-emerald-400",
    label: "text-emerald-950",
  },
} as const;

type HatId = keyof typeof HAT_STYLES;

interface ThreeHatsDiagramProps {
  labels: {
    enforcer: string;
    communicator: string;
    organizer: string;
  };
  className?: string;
}

/** Three-column schematic of the steward roles. */
export function ThreeHatsDiagram({ labels, className }: ThreeHatsDiagramProps) {
  const hats: HatId[] = ["enforcer", "communicator", "organizer"];

  return (
    <div
      className={cn(
        "grid gap-2 sm:grid-cols-3 sm:gap-3",
        className,
      )}
      role="img"
      aria-label={`${labels.enforcer}; ${labels.communicator}; ${labels.organizer}`}
    >
      {hats.map((id) => {
        const style = HAT_STYLES[id];
        return (
          <div
            key={id}
            className={cn(
              "rounded-lg border-2 px-3 py-4 text-center",
              style.bg,
              style.border,
            )}
          >
            <p
              className={cn(
                "text-xs font-bold uppercase tracking-wide sm:text-sm",
                style.label,
              )}
            >
              {labels[id]}
            </p>
          </div>
        );
      })}
    </div>
  );
}

interface WhichHatFlowDiagramProps {
  labels: {
    start: string;
    desk: string;
    discipline: string;
    mobilize: string;
  };
  className?: string;
}

/** Decision flow: member issue → which hat to wear. */
export function WhichHatFlowDiagram({
  labels,
  className,
}: WhichHatFlowDiagramProps) {
  return (
    <div
      className={cn(
        "max-w-lg rounded-lg border border-gray-200 bg-white p-4",
        className,
      )}
      role="img"
      aria-label={`${labels.start}; ${labels.desk}; ${labels.discipline}; ${labels.mobilize}`}
    >
      <div className="mx-auto max-w-xs rounded-md border-2 border-opseu-blue bg-opseu-blue/10 px-3 py-2 text-center text-sm font-semibold text-opseu-dark">
        {labels.start}
      </div>
      <div className="mx-auto my-2 h-4 w-px bg-gray-300" aria-hidden="true" />
      <div className="grid gap-2 sm:grid-cols-3">
        {(
          [
            { key: "desk", style: HAT_STYLES.communicator },
            { key: "discipline", style: HAT_STYLES.enforcer },
            { key: "mobilize", style: HAT_STYLES.organizer },
          ] as const
        ).map(({ key, style }) => (
          <div
            key={key}
            className={cn(
              "rounded-md border px-2 py-3 text-center text-xs font-semibold leading-snug sm:text-sm",
              style.bg,
              style.border,
              style.label,
            )}
          >
            {labels[key]}
          </div>
        ))}
      </div>
    </div>
  );
}

interface RepresentationStepsDiagramProps {
  labels: {
    before: string;
    during: string;
    after: string;
  };
  className?: string;
}

/** Before → during → after representation meeting flow. */
export function RepresentationStepsDiagram({
  labels,
  className,
}: RepresentationStepsDiagramProps) {
  const steps = [
    { key: "before", label: labels.before },
    { key: "during", label: labels.during },
    { key: "after", label: labels.after },
  ] as const;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3",
        className,
      )}
      role="img"
      aria-label={`${labels.before}; ${labels.during}; ${labels.after}`}
    >
      {steps.map((step, index) => (
        <div key={step.key} className="flex flex-1 items-center gap-2 sm:gap-3">
          <div className="flex-1 rounded-lg border-2 border-opseu-blue/40 bg-opseu-blue/5 px-3 py-3 text-center text-sm font-semibold text-opseu-dark">
            {step.label}
          </div>
          {index < steps.length - 1 ? (
            <span
              className="hidden shrink-0 text-lg text-gray-400 sm:inline"
              aria-hidden="true"
            >
              →
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

interface TrainingPathDiagramProps {
  steps: readonly string[];
  className?: string;
}

/** Ordered steward training path — Steward 101 through topic playbooks. */
export function TrainingPathDiagram({
  steps,
  className,
}: TrainingPathDiagramProps) {
  return (
    <ol
      className={cn(
        "flex flex-wrap gap-2",
        className,
      )}
      aria-label={steps.join(", ")}
    >
      {steps.map((label, index) => (
        <li
          key={label}
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-opseu-dark"
        >
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-opseu-blue text-xs font-bold text-white"
            aria-hidden="true"
          >
            {index + 1}
          </span>
          {label}
        </li>
      ))}
    </ol>
  );
}

interface ProgressiveDisciplineLadderDiagramProps {
  steps: readonly string[];
  className?: string;
}

/** Progressive discipline ladder: coaching → termination (Hub pastel tokens). */
export function ProgressiveDisciplineLadderDiagram({
  steps,
  className,
}: ProgressiveDisciplineLadderDiagramProps) {
  const tones = [
    "border-sky-400 bg-sky-50 text-sky-950",
    "border-amber-400 bg-amber-50 text-amber-950",
    "border-orange-400 bg-orange-50 text-orange-950",
    "border-red-400 bg-red-50 text-red-950",
  ];

  return (
    <ol
      className={cn("flex flex-col gap-2 sm:flex-row sm:items-stretch", className)}
      aria-label={steps.join("; ")}
    >
      {steps.map((label, index) => (
        <li key={label} className="flex flex-1 items-center gap-2">
          <div
            className={cn(
              "flex-1 rounded-lg border-2 px-3 py-3 text-center text-xs font-semibold leading-snug sm:text-sm",
              tones[Math.min(index, tones.length - 1)],
            )}
          >
            <span className="mb-1 block text-[0.65rem] uppercase tracking-wide opacity-80">
              {index + 1}
            </span>
            {label}
          </div>
          {index < steps.length - 1 ? (
            <span
              className="hidden shrink-0 text-lg text-gray-400 sm:inline"
              aria-hidden="true"
            >
              →
            </span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
