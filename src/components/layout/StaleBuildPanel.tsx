"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";

type StaleBuildPanelProps = {
  /** Image SHA at the time the error boundary fired. Surfaced as a footnote. */
  build?: string;
  /** Reset the boundary; useful in tests but rarely needed in production UX. */
  onContinue?: () => void;
};

/**
 * Soft-reload panel shown when a user submits a server-action whose per-build
 * ID was invalidated by a deploy (Next.js "Failed to find Server Action x").
 * Replaces the heavy `<RouteStatusPanel variant="error">` for this one class
 * of error. We never auto-refresh — the user may have unsaved local state.
 *
 * Recognised by `isClientActionDrift` in `capture-client-route-error.ts`.
 */
export function StaleBuildPanel({
  build,
  onContinue,
}: StaleBuildPanelProps) {
  const t = useTranslations("routeUi");
  const router = useRouter();
  const seenRef = useRef(false);

  // The error boundary mounts once per error; if the same error fires twice in
  // a row (typical when the user clicks a stale button), the router push would
  // be a hidden side effect — guard against double-firing analytics calls and
  // any future telemetry hooks. The visible Reset handler is still wired.
  useEffect(() => {
    if (seenRef.current) return;
    seenRef.current = true;
  }, []);

  const buildFootnote = useMemo(() => {
    if (!build || build === "unknown") return null;
    return (
      <p className="mt-4 font-mono text-xs text-gray-500">
        {t("staleBuildBuildLabel")}: {build.slice(0, 7)}
      </p>
    );
  }, [build, t]);

  return (
    <div
      role="status"
      className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-opseu-blue/15 bg-gradient-to-br from-opseu-blue/[0.06] via-white to-opseu-dark/[0.05] px-5 py-7 shadow-sm sm:px-8 sm:py-9"
    >
      <h1 className="text-2xl font-bold tracking-tight text-opseu-dark md:text-3xl">
        {t("staleBuildTitle")}
      </h1>
      <p className="mt-3 text-base leading-relaxed text-gray-700">
        {t("staleBuildBody")}
      </p>
      {buildFootnote}
      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          type="button"
          className="min-h-11"
          onClick={() => router.refresh()}
        >
          {t("staleBuildRefresh")}
        </Button>
        {onContinue ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={onContinue}
          >
            {t("staleBuildContinue")}
          </Button>
        ) : (
          <Link
            href="/"
            className="inline-flex min-h-11 items-center font-semibold text-opseu-blue underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40"
          >
            {t("backHome")}
          </Link>
        )}
      </div>
    </div>
  );
}
