import { cn } from "@/lib/utils";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "success" | "warning" | "danger" | "muted" | "info";
};

const variants = {
  default: "bg-opseu-blue/10 text-opseu-dark",
  success: "bg-green-100 text-green-800",
  warning: "bg-amber-100 text-amber-900",
  danger: "bg-red-100 text-red-800",
  muted: "bg-gray-100 text-gray-700",
  info: "bg-sky-100 text-sky-900",
};

export function Badge({
  className,
  variant = "default",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
