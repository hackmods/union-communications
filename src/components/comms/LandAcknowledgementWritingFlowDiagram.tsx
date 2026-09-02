import { cn } from "@/lib/utils";

export interface LandAcknowledgementWritingFlowDiagramProps {
  steps: readonly {
    title: string;
    subtitle: string;
  }[];
  className?: string;
}

/** Solo writing flow: research → reflect → draft → review. */
export function LandAcknowledgementWritingFlowDiagram({
  steps,
  className,
}: LandAcknowledgementWritingFlowDiagramProps) {
  const ariaLabel = steps.map((s) => `${s.title}: ${s.subtitle}`).join("; ");

  return (
    <div
      className={cn("max-w-md rounded-lg border border-gray-200 bg-white p-4", className)}
      role="img"
      aria-label={ariaLabel}
    >
      <ol className="space-y-0">
        {steps.map((step, index) => (
          <li key={step.title} className="flex flex-col items-center">
            <div className="w-full rounded-md border-2 border-opseu-blue/80 bg-opseu-blue/5 px-3 py-3 text-center">
              <p className="text-xs font-bold uppercase tracking-wide text-opseu-blue">
                {step.title}
              </p>
              <p className="mt-1 text-sm font-medium leading-snug text-opseu-dark">
                {step.subtitle}
              </p>
            </div>
            {index < steps.length - 1 ? (
              <div
                className="my-1 flex h-6 flex-col items-center justify-center text-opseu-blue/60"
                aria-hidden="true"
              >
                <span className="h-4 w-px bg-current" />
                <span className="text-xs leading-none">▼</span>
              </div>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
