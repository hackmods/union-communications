"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";
import { MobilePreviewStage } from "@/components/tools/MobilePreviewStage";
import { cn } from "@/lib/utils";

type ToolEditorLayoutProps = {
  title: ReactNode;
  description?: ReactNode;
  form: ReactNode;
  preview: ReactNode;
  /** Optional second sticky preview (e.g. board-banner print sheet). */
  previewSecondary?: ReactNode;
  /** Export / actions shown on the mobile full-preview pane. */
  previewActions?: ReactNode;
  /** When false, skips the sticky mini preview rail on mobile. Default true. */
  miniPreview?: boolean;
  /** Optional row above the editor grid (e.g. presets). */
  toolbar?: ReactNode;
  /** Content below the editor grid (e.g. resizer all-formats gallery). */
  belowGrid?: ReactNode;
  /** Sources / notes below the tool chrome. */
  footer?: ReactNode;
  className?: string;
};

function useIsLg() {
  const [isLg, setIsLg] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsLg(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isLg;
}

/**
 * Shared editor | preview chrome for canvas tools.
 * Desktop: sticky two-column preview.
 * Mobile: Edit + sticky mini live preview (tap to expand) | full Preview pane.
 */
export function ToolEditorLayout({
  title,
  description,
  form,
  preview,
  previewSecondary,
  previewActions,
  miniPreview = true,
  toolbar,
  belowGrid,
  footer,
  className,
}: ToolEditorLayoutProps) {
  const t = useTranslations("common");
  const isLg = useIsLg();
  const [pane, setPane] = useState<"edit" | "preview">("edit");
  const [miniCollapsed, setMiniCollapsed] = useState(false);

  const showMini = miniPreview && !isLg && pane === "edit" && !miniCollapsed;
  const stageMode = isLg
    ? "passthrough"
    : pane === "preview"
      ? "full"
      : showMini
        ? "mini"
        : "passthrough";

  return (
    <PageShell className={cn("py-6 md:py-8 lg:py-10", className)}>
      <h1 className="text-2xl font-bold text-opseu-dark md:text-3xl">{title}</h1>
      {description ? (
        <p className="mt-1 text-gray-600">{description}</p>
      ) : null}

      {toolbar ? <div className="mt-4">{toolbar}</div> : null}

      <div
        className="mt-4 flex gap-2 lg:hidden"
        role="tablist"
        aria-label={t("toolEditorPanes")}
      >
        <button
          type="button"
          role="tab"
          aria-selected={pane === "edit"}
          className={cn(
            "min-h-11 min-w-[5.5rem] flex-1 rounded-lg px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40",
            pane === "edit"
              ? "bg-opseu-blue text-white"
              : "border border-gray-300 bg-white text-opseu-dark",
          )}
          onClick={() => setPane("edit")}
        >
          {t("edit")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={pane === "preview"}
          className={cn(
            "relative min-h-11 min-w-[5.5rem] flex-1 rounded-lg px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40",
            pane === "preview"
              ? "bg-opseu-blue text-white"
              : "border border-gray-300 bg-white text-opseu-dark",
          )}
          onClick={() => setPane("preview")}
        >
          {t("preview")}
          {showMini ? (
            <span
              className="absolute right-2 top-2 size-1.5 rounded-full bg-opseu-gold"
              aria-hidden
            />
          ) : null}
        </button>
      </div>

      {miniPreview && !isLg && pane === "edit" && miniCollapsed ? (
        <div className="mt-3">
          <button
            type="button"
            className="min-h-11 w-full rounded-lg border border-dashed border-gray-300 bg-white px-3 text-sm font-semibold text-opseu-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40"
            onClick={() => setMiniCollapsed(false)}
          >
            {t("showPreview")}
          </button>
        </div>
      ) : null}

      <div className="mt-4 grid items-start gap-4 lg:mt-6 lg:grid-cols-2 lg:gap-6">
        <div
          className={cn(
            "order-2 lg:order-1",
            pane === "edit" || isLg ? "block" : "hidden",
            "lg:block",
          )}
          role="tabpanel"
        >
          {form}
        </div>

        <div
          className={cn(
            "order-1 space-y-3 lg:order-2 lg:space-y-4",
            // Always mounted so canvasRef stays exportable.
            "block",
            // Edit + collapsed (mobile): keep sized offscreen for export.
            !isLg &&
              pane === "edit" &&
              miniCollapsed &&
              "fixed left-0 top-0 z-[-1] w-[min(100vw,36rem)] -translate-x-[150%] opacity-0 pointer-events-none",
            // Edit + mini: sticky under header while scrolling the form.
            showMini && "sticky top-16 z-20",
            "lg:sticky lg:top-4",
          )}
          role="tabpanel"
          aria-label={t("preview")}
        >
          {!isLg && pane === "preview" ? (
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm font-semibold text-opseu-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40"
                onClick={() => setPane("edit")}
              >
                {t("backToEdit")}
              </button>
            </div>
          ) : null}

          {showMini ? (
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-gray-600">
                {t("miniPreviewLabel")}
              </p>
              <button
                type="button"
                className="min-h-11 shrink-0 rounded-lg px-3 text-sm font-semibold text-gray-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40"
                onClick={() => setMiniCollapsed(true)}
                aria-label={t("collapsePreview")}
              >
                {t("collapsePreview")}
              </button>
            </div>
          ) : null}

          <MobilePreviewStage
            mode={stageMode}
            onExpand={
              showMini
                ? () => {
                    setPane("preview");
                  }
                : undefined
            }
            expandLabel={t("expandPreview")}
          >
            {preview}
          </MobilePreviewStage>

          {isLg || pane === "preview" ? previewSecondary : null}

          {!isLg && pane === "preview" && previewActions ? (
            <div className="flex flex-wrap gap-3">{previewActions}</div>
          ) : null}
        </div>
      </div>

      {belowGrid ? <div className="mt-6 lg:mt-8">{belowGrid}</div> : null}

      {footer ? <div className="mt-8">{footer}</div> : null}
    </PageShell>
  );
}
