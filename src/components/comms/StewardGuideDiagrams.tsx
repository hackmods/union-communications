import { Link } from "@/i18n/navigation";
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

export type TrainingPathStep =
  | string
  | {
      label: string;
      href?: string;
    };

function stepLabel(step: TrainingPathStep): string {
  return typeof step === "string" ? step : step.label;
}

function stepHref(step: TrainingPathStep): string | undefined {
  return typeof step === "string" ? undefined : step.href;
}

interface TrainingPathDiagramProps {
  steps: readonly TrainingPathStep[];
  className?: string;
}

/** Ordered steward training path — Steward 101 through topic playbooks. */
export function TrainingPathDiagram({
  steps,
  className,
}: TrainingPathDiagramProps) {
  return (
    <ol
      className={cn("flex flex-wrap gap-2", className)}
      aria-label={steps.map(stepLabel).join(", ")}
    >
      {steps.map((step, index) => {
        const label = stepLabel(step);
        const href = stepHref(step);
        const pill = (
          <>
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-opseu-blue text-xs font-bold text-white"
              aria-hidden="true"
            >
              {index + 1}
            </span>
            {label}
          </>
        );

        return (
          <li
            key={`${label}-${index}`}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-opseu-dark"
          >
            {href ? (
              <Link
                href={href}
                className="inline-flex items-center gap-2 underline-offset-2 hover:text-opseu-blue hover:underline"
              >
                {pill}
              </Link>
            ) : (
              pill
            )}
          </li>
        );
      })}
    </ol>
  );
}

interface ProgressiveDisciplineLadderDiagramProps {
  steps: readonly string[];
  className?: string;
}

interface FivePointFilterDiagramProps {
  labels: readonly [string, string, string, string, string];
  caption?: string;
  className?: string;
}

/** Five-point grievance viability filter (matches Officer Learning module 1). */
export function FivePointFilterDiagram({
  labels,
  caption,
  className,
}: FivePointFilterDiagramProps) {
  return (
    <figure className={cn("space-y-2", className)}>
      <div
        className="grid gap-2 sm:grid-cols-5"
        role="img"
        aria-label={labels.join("; ")}
      >
        {labels.map((label, index) => (
          <div
            key={label}
            className="rounded-lg border-2 border-opseu-blue/30 bg-opseu-blue/5 px-2 py-3 text-center text-xs font-semibold leading-snug text-opseu-dark sm:text-sm"
          >
            <span className="mb-1 block text-[0.65rem] uppercase tracking-wide opacity-70">
              {index + 1}
            </span>
            {label}
          </div>
        ))}
      </div>
      {caption ? (
        <figcaption className="text-xs text-gray-600">{caption}</figcaption>
      ) : null}
    </figure>
  );
}

interface MeiorinStepsDiagramProps {
  steps: readonly [string, string, string];
  caption?: string;
  className?: string;
}

/** Inline Meiorin BFOR three-step test for accommodation meetings. */
export function MeiorinStepsDiagram({
  steps,
  caption,
  className,
}: MeiorinStepsDiagramProps) {
  return (
    <figure className={cn("space-y-2", className)}>
      <ol
        className="grid gap-2 sm:grid-cols-3"
        aria-label={steps.join("; ")}
      >
        {steps.map((label, index) => (
          <li
            key={label}
            className="rounded-lg border-2 border-teal-500/40 bg-teal-50 px-3 py-3 text-center text-xs font-semibold leading-snug text-teal-950 sm:text-sm"
          >
            <span className="mb-1 block text-[0.65rem] uppercase tracking-wide opacity-80">
              {index + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>
      {caption ? (
        <figcaption className="text-xs text-gray-600">{caption}</figcaption>
      ) : null}
    </figure>
  );
}

export type WorkHardeningPhase = {
  label: string;
  hours: string;
};

interface RtwWorkHardeningDiagramProps {
  phases: readonly WorkHardeningPhase[];
  caption?: string;
  className?: string;
}

/** Gradual return schedule grid (15 → 22.5 → 30 → full hours). */
export function RtwWorkHardeningDiagram({
  phases,
  caption,
  className,
}: RtwWorkHardeningDiagramProps) {
  return (
    <figure className={cn("space-y-2", className)}>
      <ol
        className="grid gap-2 sm:grid-cols-4"
        aria-label={phases.map((p) => `${p.label}: ${p.hours}`).join("; ")}
      >
        {phases.map((phase, index) => (
          <li
            key={phase.label}
            className="rounded-lg border-2 border-emerald-500/40 bg-emerald-50 px-2 py-3 text-center"
          >
            <p className="text-[0.65rem] font-bold uppercase tracking-wide text-emerald-900/80">
              {phase.label}
            </p>
            <p className="mt-1 text-sm font-semibold text-emerald-950">
              {phase.hours}
            </p>
            <span className="sr-only">Phase {index + 1}</span>
          </li>
        ))}
      </ol>
      {caption ? (
        <figcaption className="text-xs text-gray-600">{caption}</figcaption>
      ) : null}
    </figure>
  );
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

interface DocumentHierarchyDiagramProps {
  labels: {
    constitution: string;
    bylaws: string;
    policy: string;
    ca: string;
  };
  caption?: string;
  className?: string;
}

/** Stack: national constitution governs local bylaws; policy and CA are siblings below. */
export function DocumentHierarchyDiagram({
  labels,
  caption,
  className,
}: DocumentHierarchyDiagramProps) {
  const layers = [
    {
      key: "constitution",
      label: labels.constitution,
      className: "border-opseu-dark bg-opseu-dark text-white",
    },
    {
      key: "bylaws",
      label: labels.bylaws,
      className: "border-opseu-blue bg-opseu-blue/10 text-opseu-dark",
    },
    {
      key: "policy",
      label: labels.policy,
      className: "border-amber-400 bg-amber-50 text-amber-950",
    },
    {
      key: "ca",
      label: labels.ca,
      className: "border-emerald-500 bg-emerald-50 text-emerald-950",
    },
  ] as const;

  return (
    <figure className={cn("max-w-lg space-y-2", className)}>
      <div
        className="space-y-2"
        role="img"
        aria-label={`${labels.constitution}; ${labels.bylaws}; ${labels.policy}; ${labels.ca}`}
      >
        {layers.map((layer, index) => (
          <div key={layer.key}>
            <div
              className={cn(
                "rounded-lg border-2 px-3 py-3 text-center text-sm font-semibold",
                layer.className,
              )}
            >
              {layer.label}
            </div>
            {index < layers.length - 1 ? (
              <div
                className="mx-auto my-1 h-3 w-px bg-gray-300"
                aria-hidden="true"
              />
            ) : null}
          </div>
        ))}
      </div>
      {caption ? (
        <figcaption className="text-xs text-gray-600">{caption}</figcaption>
      ) : null}
    </figure>
  );
}

interface AmendmentFlowDiagramProps {
  labels: {
    notice: string;
    gmm: string;
    approval: string;
    publish: string;
  };
  caption?: string;
  className?: string;
}

/** Notice → quorate GMM → national approval → publish to members. */
export function AmendmentFlowDiagram({
  labels,
  caption,
  className,
}: AmendmentFlowDiagramProps) {
  const steps = [
    labels.notice,
    labels.gmm,
    labels.approval,
    labels.publish,
  ] as const;

  return (
    <figure className={cn("space-y-2", className)}>
      <ol
        className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-2"
        aria-label={steps.join("; ")}
      >
        {steps.map((label, index) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <div className="flex-1 rounded-lg border-2 border-opseu-blue/40 bg-opseu-blue/5 px-3 py-3 text-center text-xs font-semibold leading-snug text-opseu-dark sm:text-sm">
              <span className="mb-1 block text-[0.65rem] uppercase tracking-wide opacity-70">
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
      {caption ? (
        <figcaption className="text-xs text-gray-600">{caption}</figcaption>
      ) : null}
    </figure>
  );
}

interface QuorumTiersDiagramProps {
  tiers: readonly [
    { label: string; body: string },
    { label: string; body: string },
    { label: string; body: string },
  ];
  caption?: string;
  className?: string;
}

/** Public light-theme port of Officer Learning module 4 quorum scales. */
export function QuorumTiersDiagram({
  tiers,
  caption,
  className,
}: QuorumTiersDiagramProps) {
  return (
    <figure className={cn("space-y-2", className)}>
      <div
        className="grid gap-2 sm:grid-cols-3"
        role="img"
        aria-label={tiers.map((t) => `${t.label}: ${t.body}`).join("; ")}
      >
        {tiers.map((tier) => (
          <div
            key={tier.label}
            className="rounded-lg border-2 border-teal-500/40 bg-teal-50 px-3 py-3 text-center"
          >
            <p className="text-xs font-bold uppercase tracking-wide text-teal-800">
              {tier.label}
            </p>
            <p className="mt-2 text-sm font-semibold leading-snug text-teal-950">
              {tier.body}
            </p>
          </div>
        ))}
      </div>
      {caption ? (
        <figcaption className="text-xs text-gray-600">{caption}</figcaption>
      ) : null}
    </figure>
  );
}

interface StrikeCommandDiagramProps {
  labels: { executive: string; committee: string; captains: string; members: string };
  caption?: string;
  className?: string;
}

export function StrikeCommandDiagram({ labels, caption, className }: StrikeCommandDiagramProps) {
  const steps = [labels.executive, labels.committee, labels.captains, labels.members] as const;
  return (
    <figure className={cn("space-y-2", className)}>
      <ol className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-2" aria-label={steps.join("; ")}>
        {steps.map((label, index) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <div className="flex-1 rounded-lg border-2 border-opseu-blue/40 bg-opseu-blue/5 px-3 py-3 text-center text-xs font-semibold leading-snug text-opseu-dark sm:text-sm">
              <span className="mb-1 block text-[0.65rem] uppercase tracking-wide opacity-70">{index + 1}</span>
              {label}
            </div>
            {index < steps.length - 1 ? (
              <span className="hidden shrink-0 text-lg text-gray-400 sm:inline" aria-hidden="true">→</span>
            ) : null}
          </li>
        ))}
      </ol>
      {caption ? <figcaption className="text-xs text-gray-600">{caption}</figcaption> : null}
    </figure>
  );
}

interface StrikeRhythmsDiagramProps {
  labels: { internal: string; captainsFirst: string; public: string };
  caption?: string;
  className?: string;
}

/** Internal huddle → captains first → sparse public note. */
export function StrikeRhythmsDiagram({ labels, caption, className }: StrikeRhythmsDiagramProps) {
  const steps = [labels.internal, labels.captainsFirst, labels.public] as const;
  return (
    <figure className={cn("space-y-2", className)}>
      <ol
        className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-2"
        aria-label={steps.join("; ")}
      >
        {steps.map((label, index) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "flex-1 rounded-lg border-2 px-3 py-3 text-center text-xs font-semibold leading-snug sm:text-sm",
                index === 1
                  ? "border-opseu-dark bg-opseu-dark text-white"
                  : "border-opseu-blue/40 bg-opseu-blue/5 text-opseu-dark",
              )}
            >
              <span
                className={cn(
                  "mb-1 block text-[0.65rem] uppercase tracking-wide",
                  index === 1 ? "opacity-80" : "opacity-70",
                )}
              >
                {index + 1}
              </span>
              {label}
            </div>
            {index < steps.length - 1 ? (
              <span className="hidden shrink-0 text-lg text-gray-400 sm:inline" aria-hidden="true">
                →
              </span>
            ) : null}
          </li>
        ))}
      </ol>
      {caption ? <figcaption className="text-xs text-gray-600">{caption}</figcaption> : null}
    </figure>
  );
}

interface StrikeGatesDiagramProps {
  labels: { main: string; side: string; dock: string };
  caption?: string;
  className?: string;
}

/** Main door, side door, and dock/lot — staff the door the employer is actually using. */
export function StrikeGatesDiagram({ labels, caption, className }: StrikeGatesDiagramProps) {
  const gates = [
    { key: "main", label: labels.main },
    { key: "side", label: labels.side },
    { key: "dock", label: labels.dock },
  ] as const;
  return (
    <figure className={cn("space-y-2", className)}>
      <ul
        className="grid gap-2 sm:grid-cols-3"
        aria-label={gates.map((g) => g.label).join("; ")}
      >
        {gates.map((gate) => (
          <li
            key={gate.key}
            className="rounded-lg border-2 border-opseu-blue/40 bg-opseu-blue/5 px-3 py-3 text-center text-xs font-semibold leading-snug text-opseu-dark sm:text-sm"
          >
            {gate.label}
          </li>
        ))}
      </ul>
      {caption ? <figcaption className="text-xs text-gray-600">{caption}</figcaption> : null}
    </figure>
  );
}

interface BargainingLifecycleDiagramProps {
  labels: {
    prep: string;
    table: string;
    dispute: string;
    ratify: string;
  };
  caption?: string;
  className?: string;
}

/** Prep → Table → Dispute → Ratification for Local Bargaining Committees. */
export function BargainingLifecycleDiagram({
  labels,
  caption,
  className,
}: BargainingLifecycleDiagramProps) {
  const steps = [
    labels.prep,
    labels.table,
    labels.dispute,
    labels.ratify,
  ] as const;

  return (
    <figure className={cn("space-y-2", className)}>
      <ol
        className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-2"
        aria-label={steps.join("; ")}
      >
        {steps.map((label, index) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <div className="flex-1 rounded-lg border-2 border-opseu-blue/40 bg-opseu-blue/5 px-3 py-3 text-center text-xs font-semibold leading-snug text-opseu-dark sm:text-sm">
              <span className="mb-1 block text-[0.65rem] uppercase tracking-wide opacity-70">
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
      {caption ? (
        <figcaption className="text-xs text-gray-600">{caption}</figcaption>
      ) : null}
    </figure>
  );
}

interface NoBoardCountdownDiagramProps {
  labels: {
    conciliation: string;
    noBoard: string;
    countdown: string;
    legal: string;
  };
  caption?: string;
  className?: string;
}

/** Conciliation → No Board → countdown → lawful strike/lockout window. */
export function NoBoardCountdownDiagram({
  labels,
  caption,
  className,
}: NoBoardCountdownDiagramProps) {
  const steps = [
    { label: labels.conciliation, tone: "sky" as const },
    { label: labels.noBoard, tone: "amber" as const },
    { label: labels.countdown, tone: "amber" as const },
    { label: labels.legal, tone: "rose" as const },
  ];

  const toneClass = {
    sky: "border-sky-400/50 bg-sky-50 text-sky-950",
    amber: "border-amber-400/50 bg-amber-50 text-amber-950",
    rose: "border-rose-400/50 bg-rose-50 text-rose-950",
  } as const;

  return (
    <figure className={cn("space-y-2", className)}>
      <ol
        className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
        aria-label={steps.map((s) => s.label).join("; ")}
      >
        {steps.map((step, index) => (
          <li
            key={step.label}
            className={cn(
              "rounded-lg border-2 px-3 py-3 text-center text-xs font-semibold leading-snug sm:text-sm",
              toneClass[step.tone],
            )}
          >
            <span className="mb-1 block text-[0.65rem] uppercase tracking-wide opacity-70">
              {index + 1}
            </span>
            {step.label}
          </li>
        ))}
      </ol>
      {caption ? (
        <figcaption className="text-xs text-gray-600">{caption}</figcaption>
      ) : null}
    </figure>
  );
}

interface MotionPrecedenceStep {
  label: string;
  body: string;
}

interface MotionPrecedenceDiagramProps {
  steps: readonly MotionPrecedenceStep[];
  caption?: string;
  className?: string;
}

/** Subsidiary motions in typical Robert's Rules precedence (top = decided first). */
export function MotionPrecedenceDiagram({
  steps,
  caption,
  className,
}: MotionPrecedenceDiagramProps) {
  return (
    <figure className={cn("space-y-2", className)}>
      <ol
        className="space-y-2"
        aria-label={steps.map((s) => `${s.label}: ${s.body}`).join("; ")}
      >
        {steps.map((step, index) => (
          <li
            key={step.label}
            className="flex gap-3 rounded-lg border border-opseu-blue/20 bg-opseu-blue/5 px-3 py-3"
          >
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-opseu-blue text-xs font-bold text-white"
              aria-hidden="true"
            >
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-opseu-dark">{step.label}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-gray-700">
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
      {caption ? (
        <figcaption className="text-xs text-gray-600">{caption}</figcaption>
      ) : null}
    </figure>
  );
}

interface AffiliationTracksDiagramProps {
  familyTitle: string;
  geoTitle: string;
  family: readonly string[];
  geo: readonly string[];
  caption?: string;
  className?: string;
}

function TrackColumn({
  title,
  steps,
}: {
  title: string;
  steps: readonly string[];
}) {
  return (
    <div className="min-w-0 space-y-2">
      <p className="text-center text-xs font-bold uppercase tracking-wide text-opseu-blue">
        {title}
      </p>
      <ol className="space-y-2">
        {steps.map((label, index) => (
          <li key={`${title}-${label}`}>
            <div className="rounded-lg border-2 border-opseu-blue/40 bg-opseu-blue/5 px-3 py-3 text-center text-sm font-semibold leading-snug text-opseu-dark">
              {label}
            </div>
            {index < steps.length - 1 ? (
              <div
                className="mx-auto my-1 h-3 w-px bg-gray-300"
                aria-hidden="true"
              />
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Two parallel tracks that share the CLC: union family vs geographic house. */
export function AffiliationTracksDiagram({
  familyTitle,
  geoTitle,
  family,
  geo,
  caption,
  className,
}: AffiliationTracksDiagramProps) {
  return (
    <figure className={cn("space-y-3", className)}>
      <div
        className="grid gap-6 sm:grid-cols-2"
        role="img"
        aria-label={`${familyTitle}: ${family.join(", ")}. ${geoTitle}: ${geo.join(", ")}.`}
      >
        <TrackColumn title={familyTitle} steps={family} />
        <TrackColumn title={geoTitle} steps={geo} />
      </div>
      {caption ? (
        <figcaption className="text-xs text-gray-600">{caption}</figcaption>
      ) : null}
    </figure>
  );
}

interface AffiliationExampleDiagramProps {
  local: string;
  area: string;
  council: string;
  union: string;
  ofl: string;
  nupge: string;
  clc: string;
  caption?: string;
  className?: string;
}

function ExampleNode({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "emphasis";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border-2 px-3 py-3 text-center text-sm font-semibold leading-snug",
        tone === "emphasis"
          ? "border-opseu-dark bg-opseu-dark text-white"
          : "border-opseu-blue/40 bg-opseu-blue/5 text-opseu-dark",
      )}
    >
      {label}
    </div>
  );
}

/** Local 243 diamond: area vs labour council, then OFL vs NUPGE, both into the CLC. */
export function AffiliationExampleDiagram({
  local,
  area,
  council,
  union,
  ofl,
  nupge,
  clc,
  caption,
  className,
}: AffiliationExampleDiagramProps) {
  return (
    <figure className={cn("space-y-3", className)}>
      <div
        className="mx-auto grid max-w-xl grid-cols-2 gap-x-3 gap-y-2"
        role="img"
        aria-label={`${local}; ${area}; ${council}; ${union}; ${ofl}; ${nupge}; ${clc}`}
      >
        <div className="col-span-2">
          <ExampleNode label={local} tone="emphasis" />
        </div>
        <ExampleNode label={area} />
        <ExampleNode label={council} />
        <div className="col-span-2">
          <ExampleNode label={union} />
        </div>
        <ExampleNode label={ofl} />
        <ExampleNode label={nupge} />
        <div className="col-span-2">
          <ExampleNode label={clc} tone="emphasis" />
        </div>
      </div>
      {caption ? (
        <figcaption className="text-xs text-gray-600">{caption}</figcaption>
      ) : null}
    </figure>
  );
}
