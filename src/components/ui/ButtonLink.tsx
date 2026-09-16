import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";

type ButtonLinkVariant = "primary" | "outline" | "ghost";
type ButtonLinkSize = "sm" | "md" | "lg";

type ButtonLinkProps = Omit<
  React.ComponentProps<typeof Link>,
  "className"
> & {
  variant?: ButtonLinkVariant;
  size?: ButtonLinkSize;
  /** Full-width — useful for stacked card CTAs. */
  block?: boolean;
  /** Optional class additions (Tailwind merge safe via cn). */
  className?: string;
  /** Append an inline arrow `→` after children — visual CTA parity. */
  trailingArrow?: boolean;
};

const variantClass: Record<ButtonLinkVariant, string> = {
  primary:
    "bg-opseu-blue text-white hover:bg-opseu-dark focus-visible:ring-opseu-blue/40",
  outline:
    "border-2 border-opseu-blue text-opseu-blue hover:bg-opseu-blue/5 focus-visible:ring-opseu-blue/40",
  ghost:
    "text-opseu-blue hover:bg-opseu-blue/5 focus-visible:ring-opseu-blue/40",
};

const sizeClass: Record<ButtonLinkSize, string> = {
  sm: "min-h-9 rounded-lg px-3 py-1.5 text-sm",
  md: "min-h-11 rounded-lg px-5 py-2.5 text-base",
  lg: "min-h-12 rounded-lg px-6 py-3 text-lg",
};

/**
 * Link styled as a button. Use for nav CTAs (`<Link href="...">` that should
 * *look* like a button — never nest `<Button>` inside `<Link>`).
 *
 * Replaces the 30+ raw `<a className="inline-flex ... rounded-md bg-opseu-blue ...">`
 * copies that had drifted across support, install, privacy, accessibility,
 * security, captions, brand-kit copy.
 */
export function ButtonLink({
  variant = "primary",
  size = "md",
  block = false,
  className,
  children,
  trailingArrow = false,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      {...props}
      className={cn(
        "inline-flex items-center justify-center font-semibold transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2",
        variantClass[variant],
        sizeClass[size],
        block && "w-full",
        className,
      )}
    >
      <span>{children}</span>
      {trailingArrow ? (
        <span aria-hidden className="ml-1.5 text-base leading-none">
          →
        </span>
      ) : null}
    </Link>
  );
}
