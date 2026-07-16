"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/PageShell";
import { cn } from "@/lib/utils";

type ToolEditorLayoutProps = {
  title: ReactNode;
  description?: ReactNode;
  form: ReactNode;
  preview: ReactNode;
  /** Optional row above the editor grid (e.g. presets). */
  toolbar?: ReactNode;
  className?: string;
};

/**
 * Shared editor | preview chrome for canvas tools.
 * Desktop: sticky preview. Mobile: Edit | Preview toggle.
 */
export function ToolEditorLayout({
  title,
  description,
  form,
  preview,
  toolbar,
  className,
}: ToolEditorLayoutProps) {
  const t = useTranslations("common");
  const [pane, setPane] = useState<"edit" | "preview">("edit");

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
            "min-h-11 min-w-[5.5rem] flex-1 rounded-lg px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40",
            pane === "preview"
              ? "bg-opseu-blue text-white"
              : "border border-gray-300 bg-white text-opseu-dark",
          )}
          onClick={() => setPane("preview")}
        >
          {t("preview")}
        </button>
      </div>

      <div className="mt-4 grid items-start gap-4 lg:mt-6 lg:grid-cols-2 lg:gap-6">
        <div
          className={cn(pane === "edit" ? "block" : "hidden", "lg:block")}
          role="tabpanel"
        >
          {form}
        </div>
        <div
          className={cn(
            pane === "preview" ? "block" : "hidden",
            "lg:sticky lg:top-4 lg:block",
          )}
          role="tabpanel"
        >
          {preview}
        </div>
      </div>
    </PageShell>
  );
}
