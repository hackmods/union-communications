"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { UnionOpsMark } from "@/components/brand/UnionOpsMark";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { SNOWMOBILE_EGG_SRC } from "@/lib/constants/route-status-fallback";
import {
  pickBucketQuip,
  pickRouteStatusQuip,
  type RouteStatusBucket,
  type RouteStatusVariant,
} from "@/lib/utils/route-status-quip";
import { cn } from "@/lib/utils";

const MARK_TAPS_FOR_EGG = 5;

type RouteStatusPanelProps = {
  variant: RouteStatusVariant;
  /** Shown under the quip — short context line from routeUi. */
  body: string;
  actions: React.ReactNode;
  /** Force a bucket (Portal/Hub pages can pass explicitly). */
  bucket?: RouteStatusBucket;
  show243Footnote?: boolean;
  className?: string;
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

/**
 * Shared Local 404 / steward-error chrome for public, Hub, and Portal.
 * Quip is stable per pathname; snowmobile unlocks after 5 mark taps.
 */
export function RouteStatusPanel({
  variant,
  body,
  actions,
  bucket,
  show243Footnote = variant === "notFound",
  className,
}: RouteStatusPanelProps) {
  const t = useTranslations("routeUi");
  const pathname = usePathname();
  const tapsRef = useRef(0);
  const [eggOpen, setEggOpen] = useState(false);

  const banks = useMemo(() => {
    const raw = t.raw("quips") as Partial<Record<RouteStatusBucket, unknown>>;
    return {
      notFound: asStringArray(raw?.notFound),
      error: asStringArray(raw?.error),
      hub: asStringArray(raw?.hub),
      portal: asStringArray(raw?.portal),
      poll: asStringArray(raw?.poll),
      rsvp: asStringArray(raw?.rsvp),
      meeting: asStringArray(raw?.meeting),
    } satisfies Partial<Record<RouteStatusBucket, readonly string[]>>;
  }, [t]);

  const quip = useMemo(() => {
    if (bucket) {
      const preferred = banks[bucket];
      if (preferred && preferred.length > 0) {
        return pickRouteStatusQuip(preferred, pathname);
      }
    }
    return pickBucketQuip(banks, pathname, variant);
  }, [banks, bucket, pathname, variant]);

  const title =
    variant === "notFound" ? t("notFoundTitle") : t("errorTitle");
  const statusCode =
    variant === "notFound" ? t("statusCode") : undefined;

  const onMarkTap = useCallback(() => {
    tapsRef.current += 1;
    if (tapsRef.current >= MARK_TAPS_FOR_EGG) {
      tapsRef.current = 0;
      setEggOpen(true);
    }
  }, []);

  const content = (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-opseu-blue/15 bg-gradient-to-br from-opseu-blue/[0.07] via-white to-opseu-dark/[0.06] shadow-sm",
        className,
      )}
    >
      <div className="px-5 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <button
            type="button"
            onClick={onMarkTap}
            className="mx-auto inline-flex shrink-0 rounded-[22%] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40 sm:mx-0"
            aria-label={t("markAria")}
          >
            <span aria-hidden className="inline-flex">
              <UnionOpsMark size="lg" title="" />
            </span>
          </button>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            {statusCode && (
              <p
                className="font-mono text-sm font-semibold tracking-widest text-opseu-blue"
                aria-hidden
              >
                {statusCode}
              </p>
            )}
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-opseu-dark md:text-4xl">
              {title}
            </h1>
            {quip && (
              <p className="mt-3 text-lg leading-relaxed text-gray-800">
                {quip}
              </p>
            )}
            <p className="mt-2 text-base text-gray-600">{body}</p>
            <p className="mt-4 text-sm font-semibold text-opseu-blue">
              {t("slogan")}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3 sm:justify-start">
              {actions}
            </div>
            {show243Footnote && (
              <p className="mt-6 text-xs text-gray-500">
                {t("local243Footnote")}
              </p>
            )}
          </div>
        </div>
      </div>

      <Dialog
        open={eggOpen}
        onClose={() => setEggOpen(false)}
        title={t("easterEggTitle")}
        closeLabel={t("easterEggClose")}
        className="max-w-lg"
        footer={
          <Button type="button" onClick={() => setEggOpen(false)}>
            {t("easterEggClose")}
          </Button>
        }
      >
        <p className="mb-4 text-sm text-gray-700">{t("easterEggBody")}</p>
        <Image
          src={SNOWMOBILE_EGG_SRC}
          alt={t("easterEggImageAlt")}
          width={960}
          height={640}
          className="h-auto w-full rounded-lg"
          priority={false}
        />
      </Dialog>
    </div>
  );

  if (variant === "error") {
    return <div role="alert">{content}</div>;
  }
  return content;
}
