import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  children,
  ...props
}: ButtonProps) {
  const variants = {
    primary: "bg-opseu-blue text-white hover:bg-opseu-dark",
    secondary: "bg-opseu-dark text-white hover:bg-opseu-blue",
    outline: "border-2 border-opseu-blue text-opseu-blue hover:bg-opseu-blue/5",
    ghost: "text-opseu-blue hover:bg-opseu-blue/5",
  };

  const sizes = {
    sm: "min-h-9 rounded-lg px-3 py-1.5 text-sm",
    md: "min-h-11 rounded-lg px-5 py-2.5 text-base",
    lg: "min-h-12 rounded-lg px-6 py-3 text-lg",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-semibold transition-[colors,transform] duration-150 ease-out active:scale-[0.98] motion-reduce:transition-colors motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
