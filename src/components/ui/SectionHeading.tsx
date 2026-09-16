import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PUBLIC_SECTION_TITLE_CLASS } from "@/lib/constants/public-type";
import { Eyebrow, type Tone as EyebrowTone } from "@/components/ui/Eyebrow";

type SectionHeadingProps = {
  id?: string;
  title: string;
  /** Optional intro paragraph (constrained to a readable measure). */
  intro?: ReactNode;
  /** Optional eyebrow line above the title. */
  eyebrow?: ReactNode;
  eyebrowTone?: EyebrowTone;
  /** Pass-through alignment. */
  align?: "left" | "center";
  /** Pass the heading element to render. Defaults to h2 (in-section). */
  as?: "h2" | "h3";
  className?: string;
};

/**
 * In-section heading block: optional eyebrow → title → optional intro.
 * Auto-applies `scroll-mt-28` so internal anchors stop under the global header.
 * Replaces the 30+ inline `<h2 className="text-xl font-bold text-opseu-dark">`
 * copies that had drifted below the existing title-class tokens.
 */
export function SectionHeading({
  id,
  title,
  intro,
  eyebrow,
  eyebrowTone = "brand",
  align = "left",
  as: Tag = "h2",
  className,
}: SectionHeadingProps) {
  return (
    <header
      className={cn(
        "min-w-0 scroll-mt-28",
        align === "center" && "text-center",
        className,
      )}
    >
      {eyebrow ? (
        <Eyebrow tone={eyebrowTone} className={cn(align === "center" && "mx-auto")}>
          {eyebrow}
        </Eyebrow>
      ) : null}
      <Tag
        id={id}
        className={cn(PUBLIC_SECTION_TITLE_CLASS, eyebrow ? "mt-2" : "", "text-opseu-dark")}
      >
        {title}
      </Tag>
      {intro ? (
        <div className="mt-3 max-w-prose text-base leading-relaxed text-slate-700 sm:text-[1.05rem] sm:leading-[1.7]">
          {intro}
        </div>
      ) : null}
    </header>
  );
}
