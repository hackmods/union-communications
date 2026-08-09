import Link from "next/link";
import { RouteStatusStatic } from "@/components/layout/RouteStatusStatic";
import { ROUTE_STATUS_FALLBACK } from "@/lib/constants/route-status-fallback";
import { PAGE_SHELL } from "@/lib/constants/page-shell";
import { cn } from "@/lib/utils";

/**
 * Root not-found — covers misses that never enter `[locale]` (and replaces
 * Next.js stock “404 This page could not be found.”).
 */
export default function RootNotFound() {
  const f = ROUTE_STATUS_FALLBACK;
  const linkClass =
    "inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40";

  return (
    <div className="min-h-[60vh] bg-[var(--background,#f8fafc)] text-[var(--foreground,#1a1a1a)]">
      <div className={cn(PAGE_SHELL.focus, "py-10 md:py-14")}>
        <RouteStatusStatic
          variant="notFound"
          actions={
            <>
              <Link
                href="/en/tools"
                className={cn(
                  linkClass,
                  "bg-opseu-blue text-white hover:bg-opseu-dark",
                )}
              >
                {f.backToToolsEn}
              </Link>
              <Link
                href="/en"
                className={cn(
                  linkClass,
                  "text-opseu-blue underline-offset-2 hover:underline",
                )}
              >
                {f.backHomeEn}
              </Link>
              <Link
                href="/fr"
                className={cn(
                  linkClass,
                  "text-opseu-blue underline-offset-2 hover:underline",
                )}
              >
                {f.backHomeFr}
              </Link>
            </>
          }
        />
      </div>
    </div>
  );
}
