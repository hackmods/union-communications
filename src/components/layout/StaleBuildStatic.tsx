import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { ROUTE_STATUS_FALLBACK } from "@/lib/constants/route-status-fallback";

type StaleBuildStaticProps = {
  build?: string;
  /** Reset the boundary; useful in tests but rarely needed in production UX. */
  onContinue?: () => void;
};

/**
 * Locale-less sibling of `StaleBuildPanel` for root `global-error.tsx` where
 * next-intl providers may be unavailable. Strings are pulled from
 * `ROUTE_STATUS_FALLBACK.staleBuild*` so EN stays neutral and FR stays in
 * the same English-only fallback shape used elsewhere at the root.
 */
export function StaleBuildStatic({
  build,
  onContinue,
}: StaleBuildStaticProps) {
  const f = ROUTE_STATUS_FALLBACK;
  const buildFootnote =
    build && build !== "unknown" ? (
      <p className="mt-4 font-mono text-xs text-gray-500">
        {f.staleBuildBuildLabel}: {build.slice(0, 7)}
      </p>
    ) : null;
  return (
    <div
      role="status"
      className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-opseu-blue/15 bg-gradient-to-br from-opseu-blue/[0.06] via-white to-opseu-dark/[0.05] px-5 py-7 shadow-sm sm:px-8 sm:py-9"
    >
      <h1 className="text-2xl font-bold tracking-tight text-opseu-dark md:text-3xl">
        {f.staleBuildTitle}
      </h1>
      <p className="mt-3 text-base leading-relaxed text-gray-700">
        {f.staleBuildBody}
      </p>
      {buildFootnote}
      <div className="mt-6 flex flex-wrap gap-3">
        <Button type="button" className="min-h-11" onClick={onContinue}>
          {f.staleBuildContinue}
        </Button>
        <Link
          href="/en"
          className="inline-flex min-h-11 items-center font-semibold text-opseu-blue underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40"
        >
          {f.backHomeEn}
        </Link>
      </div>
    </div>
  );
}
