import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type GuideOutlineListProps = {
  children: ReactNode;
  className?: string;
};

/** Ordered outline / roadmap list — pairs with GuideOutlineStep. */
export function GuideOutlineList({
  children,
  className,
}: GuideOutlineListProps) {
  return (
    <ol className={cn("mt-8 space-y-8", className)}>{children}</ol>
  );
}

type GuideOutlineStepProps = {
  id: string;
  step: number;
  title: ReactNode;
  children?: ReactNode;
  className?: string;
  /** Optional time / meta chip (workshop outlines). */
  badge?: ReactNode;
  /** Workshop steps use h3; first-week roadmap uses h2. */
  headingAs?: "h2" | "h3";
  /** `ordinal` → "1."; `padded` → "01". */
  indexStyle?: "ordinal" | "padded";
};

/**
 * Numbered border-accent outline step for workshops and first-week roadmaps.
 * Prefer this over anonymous `<li className="border-l-2…">` copies.
 */
export function GuideOutlineStep({
  id,
  step,
  title,
  children,
  className,
  badge,
  headingAs = "h3",
  indexStyle = "ordinal",
}: GuideOutlineStepProps) {
  const Heading = headingAs;
  const indexLabel =
    indexStyle === "padded"
      ? String(step).padStart(2, "0")
      : `${step}.`;

  return (
    <li
      id={id}
      className={cn(
        "scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5",
        className,
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Heading
          className={cn(
            "font-bold text-opseu-dark",
            headingAs === "h2"
              ? "flex items-baseline gap-3 text-[clamp(1.25rem,1.1rem+0.6vw,1.5rem)]"
              : "text-[clamp(1.125rem,1.05rem+0.35vw,1.25rem)]",
          )}
        >
          <span
            className={cn(
              "font-bold tabular-nums text-opseu-blue",
              headingAs === "h2" ? "text-sm" : "mr-2",
            )}
            aria-hidden={indexStyle === "padded" ? true : undefined}
          >
            {indexLabel}
          </span>
          {title}
        </Heading>
        {badge ? (
          <span className="inline-flex min-h-8 items-center rounded-full bg-opseu-blue px-3 text-xs font-bold uppercase tracking-wide text-white">
            {badge}
          </span>
        ) : null}
      </div>
      {children}
    </li>
  );
}

type GuideAccentBlockProps = {
  title: ReactNode;
  children: ReactNode;
  className?: string;
  titleAs?: "h3" | "h4";
  id?: string;
};

/**
 * Nested accent strip (h3/h4) inside a chapter — union-boards layouts/practice.
 * Not a TOC chapter; use GuideSection for top-level chapters.
 */
export function GuideAccentBlock({
  title,
  children,
  className,
  titleAs = "h3",
  id,
}: GuideAccentBlockProps) {
  const Title = titleAs;
  return (
    <section
      id={id}
      className={cn("border-l-2 border-opseu-blue/30 pl-5", className)}
    >
      <Title
        className={cn(
          "font-bold text-opseu-dark",
          titleAs === "h3" ? "text-xl" : "text-lg",
        )}
      >
        {title}
      </Title>
      {children}
    </section>
  );
}

type GuideWorkshopNoteProps = {
  tone: "facilitator" | "attendee";
  label: string;
  children: ReactNode;
  className?: string;
};

/** Facilitator / attendee callout used in workshop outlines. */
export function GuideWorkshopNote({
  tone,
  label,
  children,
  className,
}: GuideWorkshopNoteProps) {
  return (
    <blockquote
      className={cn(
        "rounded-r-lg border-l-4 px-4 py-3",
        tone === "facilitator"
          ? "border-amber-500 bg-amber-50 text-amber-950"
          : "border-opseu-blue bg-white text-gray-800 shadow-sm",
        className,
      )}
    >
      <p className="text-xs font-bold uppercase tracking-wide">{label}</p>
      <div className="mt-1 max-w-prose text-sm leading-relaxed">{children}</div>
    </blockquote>
  );
}
