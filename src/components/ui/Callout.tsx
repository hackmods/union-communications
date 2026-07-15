import { cn } from "@/lib/utils";

type CalloutProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Soft brand tint (default) vs quiet gray note */
  tone?: "brand" | "muted" | "plain";
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
