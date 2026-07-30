import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type GuideRelatedLink = {
  href: string;
  label: string;
};

type GuideRelatedLinkListProps = {
  links: GuideRelatedLink[];
  className?: string;
  listClassName?: string;
};

/**
 * Related / explore links: disc list on narrow viewports, middot row from `md` up.
 */
export function GuideRelatedLinkList({
  links,
  className,
  listClassName,
}: GuideRelatedLinkListProps) {
  return (
    <ul
      className={cn(
        "list-disc space-y-1 pl-5 marker:text-gray-400",
        "md:flex md:flex-wrap md:list-none md:space-y-0 md:pl-0 md:items-baseline md:gap-x-3 md:gap-y-1",
        className,
        listClassName,
      )}
    >
      {links.map((link, i) => (
        <li
          key={link.href}
          className="md:inline-flex md:items-baseline md:gap-x-3"
        >
          {i > 0 && (
            <span
              className="hidden text-gray-300 md:inline"
              aria-hidden="true"
            >
              ·
            </span>
          )}
          <Link
            href={link.href}
            className="font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
