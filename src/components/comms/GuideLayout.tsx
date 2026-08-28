import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { ComposedPageLayout } from "@/components/layout/ComposedPageLayout";
import type { PageShellSize } from "@/lib/constants/page-shell";
import {
  GUIDE_COMPOSITION,
  type GuideCompositionPreset,
  type PageComposition,
} from "@/lib/constants/page-composition";
import {
  GuideRelatedLinkList,
  type GuideRelatedLink,
} from "@/components/comms/GuideRelatedLinkList";
import { GuideToc, type GuideTocItem } from "@/components/comms/GuideToc";
import { cn } from "@/lib/utils";

export type { GuideRelatedLink, GuideTocItem };

type GuideLayoutProps = {
  title: string;
  subtitle?: string;
  intro?: ReactNode;
  relatedLinks?: GuideRelatedLink[];
  relatedLabel?: string;
  toc?: GuideTocItem[];
  tocLabel?: string;
  aside?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  /**
   * Preset — pick the guide pattern explicitly:
   * - `narrow` (default): read shell, no rail — channel / legal
   * - `playbook`: readWide + TOC rail @ lg+
   * - `hub`: wide index + related grid
   */
  preset?: GuideCompositionPreset;
  /** Escape hatch — e.g. sidebar-right for a future diagram rail */
  composition?: PageComposition;
  size?: Extract<PageShellSize, "read" | "readWide" | "wide" | "focus">;
};

function resolveGuideLayout(
  preset: GuideCompositionPreset,
  composition?: PageComposition,
  size?: PageShellSize,
) {
  const base = GUIDE_COMPOSITION[preset];
  return {
    composition: composition ?? base.composition,
    size: size ?? base.shell,
  };
}

/**
 * Guide reading frame. Canvas tools → ToolEditorLayout; catalog → custom wide page.
 */
export function GuideLayout({
  title,
  subtitle,
  intro,
  relatedLinks,
  relatedLabel,
  toc,
  tocLabel,
  aside,
  children,
  footer,
  className,
  preset = "narrow",
  composition: compositionOverride,
  size: sizeOverride,
}: GuideLayoutProps) {
  const { composition, size } = resolveGuideLayout(
    preset,
    compositionOverride,
    sizeOverride,
  );
  const hub = preset === "hub" || composition === "hub";
  const sidebar =
    composition === "sidebar-left" || composition === "sidebar-right";

  const headerBlock = (
    <header className={hub ? "max-w-3xl" : undefined}>
      <h1 className="text-2xl font-bold tracking-tight text-opseu-dark md:text-3xl">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-2 text-lg text-gray-600">{subtitle}</p>
      )}
      {intro && (
        <div className="mt-4 max-w-prose leading-relaxed text-gray-700">
          {intro}
        </div>
      )}
    </header>
  );

  const relatedBlock =
    relatedLinks && relatedLinks.length > 0 ? (
      <div className={cn("text-sm", hub ? "mt-8" : "mt-5")}>
        {relatedLabel && (
          <p className="font-semibold text-opseu-dark">{relatedLabel}</p>
        )}
        <nav aria-label={relatedLabel}>
          {hub ? (
            <ul
              className={cn(
                "mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3",
                relatedLabel ? undefined : "mt-0",
              )}
            >
              {relatedLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-11 items-center font-medium text-opseu-blue underline underline-offset-2 hover:text-opseu-dark"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <GuideRelatedLinkList
              links={relatedLinks}
              className={relatedLabel ? "mt-2" : undefined}
            />
          )}
        </nav>
      </div>
    ) : null;

  const mobileToc =
    sidebar && toc && toc.length > 0 && tocLabel ? (
      <div className="mt-6 border-b border-gray-200 pb-6 lg:hidden print:hidden">
        <details className="rounded-xl border border-gray-200 bg-gray-50/80 open:pb-2">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-opseu-dark marker:content-none [&::-webkit-details-marker]:hidden">
            {tocLabel}
          </summary>
          <div className="max-h-64 overflow-y-auto px-2 pb-2">
            <GuideToc items={toc} />
          </div>
        </details>
      </div>
    ) : null;

  const railContent =
    sidebar && (toc?.length || aside) ? (
      <>
        {toc && toc.length > 0 && tocLabel && (
          <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-opseu-blue">
              {tocLabel}
            </p>
            <GuideToc items={toc} />
          </div>
        )}
        {aside}
      </>
    ) : undefined;

  return (
    <ComposedPageLayout
      size={size}
      composition={composition}
      className={cn("py-8 md:py-12", className)}
      rail={railContent}
    >
      {headerBlock}
      {relatedBlock}
      {mobileToc}
      <div className="mt-10">{children}</div>
      {footer}
    </ComposedPageLayout>
  );
}
