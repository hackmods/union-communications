import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type GuideSectionProps = {
  id: string;
  title: string;
  intro?: ReactNode;
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
      <h2 className="text-[clamp(1.25rem,1.1rem+0.6vw,1.5rem)] font-bold text-opseu-dark">
        {title}
      </h2>
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
        "text-[clamp(1rem,0.95rem+0.25vw,1.125rem)] font-bold text-opseu-dark",
        className,
      )}
    >
      {children}
    </h3>
  );
}

type GuideProseProps = {
  children: ReactNode;
  className?: string;
  as?: "p" | "div";
};

/** Constrained reading measure for mid-section paragraphs. */
export function GuideProse({
  children,
  className,
  as: Tag = "p",
}: GuideProseProps) {
  return (
    <Tag
      className={cn("max-w-prose leading-relaxed text-gray-700", className)}
    >
      {children}
    </Tag>
  );
}

type GuideActionRowProps = {
  children: ReactNode;
  className?: string;
};

/** Full article-width CTA strip — avoid max-w-lg dead zones. */
export function GuideActionRow({ children, className }: GuideActionRowProps) {
  return <div className={cn("button-row mt-5", className)}>{children}</div>;
}

type GuideTipGridProps = {
  children: ReactNode;
  className?: string;
  /** Default 2 columns from `sm`; use 3 for denser clusters at `lg`. */
  columns?: 2 | 3;
  /** Tighter gaps for very long tip pages (e.g. strike). */
  dense?: boolean;
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
  dense = false,
  as: Tag = "ul",
}: GuideTipGridProps) {
  return (
    <Tag
      className={cn(
        "grid list-none p-0 text-gray-700",
        dense ? "gap-3" : "gap-4",
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

type GuideBulletListProps = {
  children: ReactNode;
  className?: string;
  /** Short items may sit in two columns from `sm`. */
  columns?: 1 | 2;
};

/** Label-less disc lists — readable stacks, optional two-column densify. */
export function GuideBulletList({
  children,
  className,
  columns = 1,
}: GuideBulletListProps) {
  return (
    <ul
      className={cn(
        "list-disc space-y-3 pl-5 text-gray-700",
        columns === 2 && "sm:grid sm:list-none sm:grid-cols-2 sm:gap-4 sm:space-y-0 sm:pl-0",
        className,
      )}
    >
      {children}
    </ul>
  );
}
