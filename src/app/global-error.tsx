"use client";

import { useEffect } from "react";
import Link from "next/link";
import "./globals.css";
import { RouteStatusStatic } from "@/components/layout/RouteStatusStatic";
import { ROUTE_STATUS_FALLBACK } from "@/lib/constants/route-status-fallback";
import { PAGE_SHELL } from "@/lib/constants/page-shell";
import { cn } from "@/lib/utils";

/**
 * Last-resort error UI — must define its own html/body (Next.js requirement).
 * No next-intl: providers above this boundary may have crashed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const f = ROUTE_STATUS_FALLBACK;

  useEffect(() => {
    console.error("[global]", error.digest ?? error.message);
  }, [error]);

  const linkClass =
    "inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40";

  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--background,#f8fafc)] text-[var(--foreground,#1a1a1a)] antialiased">
        <div className={cn(PAGE_SHELL.focus, "py-10 md:py-14")}>
          <RouteStatusStatic
            variant="error"
            actions={
              <>
                <button
                  type="button"
                  onClick={reset}
                  className={cn(
                    linkClass,
                    "bg-opseu-blue text-white hover:bg-opseu-dark",
                  )}
                >
                  {f.tryAgain}
                </button>
                <Link
                  href="/en"
                  className={cn(
                    linkClass,
                    "border-2 border-opseu-blue text-opseu-blue hover:bg-opseu-blue/5",
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
      </body>
    </html>
  );
}
