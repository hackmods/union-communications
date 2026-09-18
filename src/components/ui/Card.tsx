import { cn } from "@/lib/utils";

type CardVariant = "default" | "elevated" | "outline" | "ghost";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  density?: "default" | "compact";
  /**
   * - `default` — flat card with subtle shadow (the workhorse surface).
   * - `elevated` — adds hover-lift, brand accent border, focus parity. Use for navigation/path tiles.
   * - `outline` — left-ridge stripe (`border-l-2 border-opseu-blue/30`). Replaces drift copies in captions, complaint-vs-grievance, pre-disciplinary-log.
   * - `ghost` — soft brand-tinted card. Use for grouped hubs, demo bands, regional navigation.
   */
  variant?: CardVariant;
  /**
   * If true and variant is `elevated`, the interactive hover-state stays on
   * even after the cursor leaves (e.g. when the card itself is a Link).
   * Default `false`.
   */
  interactive?: boolean;
};

const baseClass =
  "min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 ease-out motion-reduce:transition-none";

const variantClass: Record<CardVariant, string> = {
  default: "",
  elevated:
    "hover:-translate-y-1 hover:border-opseu-blue/40 hover:shadow-lg focus-within:-translate-y-1 focus-within:border-opseu-blue/40 focus-within:shadow-lg motion-reduce:hover:translate-y-0 motion-reduce:focus-within:translate-y-0",
  outline:
    "rounded-r-lg border-y-0 border-r-0 border-l-2 border-l-opseu-blue/30 shadow-none",
  ghost:
    "border-opseu-blue/15 bg-opseu-blue/[0.04] shadow-none",
};

export function Card({
  className,
  density = "default",
  variant = "default",
  interactive = false,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        baseClass,
        variantClass[variant],
        density === "compact" ? "p-4 md:p-5" : "p-5 md:p-6",
        interactive && variant === "elevated" && "group/card cursor-pointer",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-lg font-bold text-opseu-dark", className)}
      {...props}
    >
      {children}
    </h3>
  );
}
