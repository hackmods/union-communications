import type { ReactNode } from "react";
import { PageShell } from "@/components/layout/PageShell";
import type { PageShellSize } from "@/lib/constants/page-shell";
import {
  shellForComposition,
  usesDesktopRail,
  type PageComposition,
} from "@/lib/constants/page-composition";
import { cn } from "@/lib/utils";

type ComposedPageLayoutProps = {
  children: ReactNode;
  /** Shell frame — auto-derived from `composition` when omitted */
  size?: PageShellSize;
  composition?: PageComposition;
  className?: string;
  as?: "div" | "article" | "main" | "section";
  /** Sticky rail @ lg+ only — mobile placement is the page's job (flow varies by area) */
  rail?: ReactNode;
  /** Override rail column width @ lg+ (default ~240px left / ~280px right) */
  railWidthClass?: string;
};

const DEFAULT_RAIL_WIDTH = "lg:grid-cols-[min(240px,22%)_minmax(0,1fr)]";
const RIGHT_RAIL_WIDTH = "lg:grid-cols-[minmax(0,1fr)_min(280px,24%)]";

/**
 * Generic shell + lg+ grid primitive. Guides, catalog, and training opt in.
 * Canvas tools use ToolEditorLayout (`workspace`). Mobile rails stay in-page
 * so header → nav → body order stays area-specific.
 */
export function ComposedPageLayout({
  children,
  size,
  composition = "narrow",
  className,
  as: Tag = "div",
  rail,
  railWidthClass,
}: ComposedPageLayoutProps) {
  const shell = shellForComposition(composition, size);
  const showRail = usesDesktopRail(composition, rail);
  const railFirst = composition === "sidebar-left";

  const gridClass =
    railWidthClass ??
    (composition === "sidebar-right" ? RIGHT_RAIL_WIDTH : DEFAULT_RAIL_WIDTH);

  const desktopRail = showRail ? (
    <aside className="hidden lg:block print:hidden">
      <div className="sticky top-28 space-y-4">{rail}</div>
    </aside>
  ) : null;

  const body =
    showRail && rail ? (
      <div className={cn("grid gap-8 lg:gap-10", gridClass)}>
        {railFirst ? (
          <>
            {desktopRail}
            <div className="min-w-0">{children}</div>
          </>
        ) : (
          <>
            <div className="min-w-0">{children}</div>
            {desktopRail}
          </>
        )}
      </div>
    ) : (
      children
    );

  return (
    <PageShell size={shell} className={className} as={Tag}>
      {body}
    </PageShell>
  );
}
