import { createNavigation } from "next-intl/navigation";
import { forwardRef, type ComponentProps } from "react";
import { withTrailingSlash } from "@/lib/utils/internal-href";
import { routing } from "./routing";

const {
  Link: BaseLink,
  redirect,
  usePathname,
  useRouter,
  getPathname,
} = createNavigation(routing);

type LinkProps = ComponentProps<typeof BaseLink>;

/** Locale-aware Link with trailing-slash normalization (next.config trailingSlash). */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function LocaleLink(
  { href, ...props },
  ref,
) {
  const normalizedHref =
    typeof href === "string" ? withTrailingSlash(href) : href;
  return <BaseLink ref={ref} href={normalizedHref} {...props} />;
});
export { redirect, usePathname, useRouter, getPathname };
