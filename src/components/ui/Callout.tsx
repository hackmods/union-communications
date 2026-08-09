import { cn } from "@/lib/utils";

type CalloutProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Soft brand tint (default), quiet gray note, plain surface, success, or export/error alert */
  tone?: "brand" | "muted" | "plain" | "danger" | "success" | "warning";
};

/**
 * Compact surface for short notes or related links.
 * Prefer over a full Card when content is thin.
 */
export function Callout({
  className,
  tone = "brand",
  children,
  ...props
}: CalloutProps) {
  const tones = {
    brand: "border-opseu-blue/20 bg-opseu-blue/5",
    muted: "border-gray-200 bg-gray-50",
    plain: "border-gray-200 bg-white",
    danger: "border-red-200 bg-red-50 text-red-900",
    success: "border-green-200 bg-green-50 text-green-900",
    warning: "border-amber-200 bg-amber-50 text-amber-950",
  };

  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 text-sm text-gray-700",
        tones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
