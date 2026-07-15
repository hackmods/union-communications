import type { ReactNode } from "react";
import { PAGE_SHELL, type PageShellSize } from "@/lib/constants/page-shell";
import { cn } from "@/lib/utils";

type PageShellProps = {
  children: ReactNode;
  /** Default `wide`. Use `read` for guides, `focus` for forms, `chrome` only for hub frames. */
  size?: PageShellSize;
  className?: string;
  as?: "div" | "article" | "main" | "section";
};

/**
 * Consistent horizontal page frame. Prefer this over ad-hoc `max-w-*` on new pages.
 */
export function PageShell({
  children,
  size = "wide",
  className,
  as: Tag = "div",
}: PageShellProps) {
  return <Tag className={cn(PAGE_SHELL[size], className)}>{children}</Tag>;
}
