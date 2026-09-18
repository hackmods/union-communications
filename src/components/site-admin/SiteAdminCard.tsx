import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * Single tile used on `/app/site-admin` (the operator landing page).
 * Card-grid layout per tile; arrows lead to the matching sub-tool.
 */
type SiteAdminCardProps = {
  href: string;
  title: string;
  body: string;
  tone?: "default" | "warn";
};

export function SiteAdminCard({
  href,
  title,
  body,
  tone = "default",
}: SiteAdminCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group block rounded-lg border border-opseu-gray/15 bg-white px-4 py-3 shadow-sm transition hover:border-opseu-blue/40 hover:shadow",
        tone === "warn" && "border-opseu-orange/30 hover:border-opseu-orange/60",
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-base font-semibold text-opseu-dark">{title}</h3>
        <span
          className="text-sm text-opseu-blue transition group-hover:translate-x-1"
          aria-hidden
        >
          →
        </span>
      </div>
      <p className="mt-1 text-sm text-opseu-gray-dark">{body}</p>
    </Link>
  );
}
