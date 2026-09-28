import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type GuideRelatedLink = {
  href: string;
  label: string;
  /** Optional one-line description for denser card/grid treatment. */
  description?: string;
};

type GuideRelatedLinkListProps = {
  links: GuideRelatedLink[];
  className?: string;
  listClassName?: string;
};

/**
 * Related / explore links — compact 2-col grid with optional descriptions.
 * Prefer this over plain bullet walls on playbook pages.
 */
export function GuideRelatedLinkList({
  links,
  className,
  listClassName,
}: GuideRelatedLinkListProps) {
  return (
    <ul
      className={cn(
        "mt-3 grid list-none gap-2 p-0 sm:grid-cols-2",
        className,
        listClassName,
      )}
    >
      {links.map((link) => (
        <li key={link.href} className="min-w-0">
          <Link
            href={link.href}
            className="block min-h-11 rounded-lg border border-gray-200 bg-white px-3 py-2.5 transition hover:border-opseu-blue/40 hover:bg-gray-50"
          >
            <span className="font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark">
              {link.label}
            </span>
            {link.description ? (
              <span className="mt-0.5 block text-xs leading-snug text-gray-600">
                {link.description}
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
