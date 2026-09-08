import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type GuideSectionProps = {
  id: string;
  title: string;
  intro?: string;
  children: ReactNode;
  className?: string;
};

/**
 * Playbook chapter section — border accent + readable intro measure.
 * Body children fill the article column (use GuideTipGrid / GuideWideFigure).
 */
export function GuideSection({
  id,
  title,
  intro,
  children,
  className,
}: GuideSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5 not-first:mt-10 lg:not-first:mt-12",
        className,
      )}
    >
      <h2 className="text-xl font-bold text-opseu-dark md:text-2xl">{title}</h2>
      {intro ? (
        <p className="mt-3 max-w-prose leading-relaxed text-gray-700">{intro}</p>
      ) : null}
      <div className="mt-4 min-w-0">{children}</div>
    </section>
  );
}

type GuideSubHeadingProps = {
  children: ReactNode;
  className?: string;
};

/** In-section h3 for playbook chapters. */
export function GuideSubHeading({ children, className }: GuideSubHeadingProps) {
  return (
    <h3
      className={cn(
        "text-base font-bold text-opseu-dark md:text-lg",
        className,
      )}
    >
      {children}
    </h3>
  );
}

type GuideTipGridProps = {
  children: ReactNode;
  className?: string;
  /** Default 2 columns from `sm`; use 3 for denser clusters at `lg`. */
  columns?: 2 | 3;
  as?: "ul" | "ol" | "div";
};

/**
 * Tip / principle clusters that fill the article column on tablet+.
 * Prefer over left-pinned `max-w-prose` disc lists inside playbooks.
 */
export function GuideTipGrid({
  children,
  className,
  columns = 2,
  as: Tag = "ul",
}: GuideTipGridProps) {
  return (
    <Tag
      className={cn(
        "grid list-none gap-4 p-0 text-gray-700",
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

type GuideTipItemProps = {
  label: string;
  content: string;
  className?: string;
  as?: "li" | "div";
};

/** Label + body cell for GuideTipGrid (no nested max-w-prose). */
export function GuideTipItem({
  label,
  content,
  className,
  as: Tag = "li",
}: GuideTipItemProps) {
  return (
    <Tag className={cn("min-w-0 leading-relaxed", className)}>
      <span className="font-semibold text-opseu-dark">{label}.</span> {content}
    </Tag>
  );
}
