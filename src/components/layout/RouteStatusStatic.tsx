import { UnionOpsMark } from "@/components/brand/UnionOpsMark";
import { ROUTE_STATUS_FALLBACK } from "@/lib/constants/route-status-fallback";

type RouteStatusStaticProps = {
  variant: "notFound" | "error";
  actions: React.ReactNode;
};

/**
 * Brand-aligned status chrome without next-intl — for root not-found /
 * global-error where locale providers may be unavailable.
 */
export function RouteStatusStatic({
  variant,
  actions,
}: RouteStatusStaticProps) {
  const f = ROUTE_STATUS_FALLBACK;
  const title = variant === "notFound" ? f.notFoundTitle : f.errorTitle;
  const body = variant === "notFound" ? f.notFoundBody : f.errorBody;
  const quip = variant === "notFound" ? f.notFoundQuip : f.errorQuip;

  const inner = (
    <div className="overflow-hidden rounded-2xl border border-opseu-blue/15 bg-gradient-to-br from-opseu-blue/[0.07] via-white to-opseu-dark/[0.06] shadow-sm">
      <div className="px-5 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="mx-auto sm:mx-0" aria-hidden>
            <UnionOpsMark size="lg" />
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            {variant === "notFound" && (
              <p
                className="font-mono text-sm font-semibold tracking-widest text-opseu-blue"
                aria-hidden
              >
                {f.statusCode}
              </p>
            )}
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-opseu-dark md:text-4xl">
              {title}
            </h1>
            <p className="mt-3 text-lg leading-relaxed text-gray-800">{quip}</p>
            <p className="mt-2 text-base text-gray-600">{body}</p>
            <p className="mt-4 text-sm font-semibold text-opseu-blue">
              {f.slogan}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3 sm:justify-start">
              {actions}
            </div>
            {variant === "notFound" && (
              <p className="mt-6 text-xs text-gray-500">{f.local243Footnote}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (variant === "error") {
    return <div role="alert">{inner}</div>;
  }
  return inner;
}
