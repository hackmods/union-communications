import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PUBLIC_CARD_TITLE_CLASS } from "@/lib/constants/public-type";

type PublicHubPanelProps = {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  /** Omit chrome when nested (e.g. mobile details drawer). */
  bare?: boolean;
  id?: string;
  "aria-labelledby"?: string;
};

/**
 * Shared bordered hub panel for Brand Kit, onboarding, and similar public
 * workspace forms — not guide playbook chrome.
 */
export function PublicHubPanel({
  title,
  description,
  children,
  className,
  bare = false,
  id,
  "aria-labelledby": ariaLabelledBy,
}: PublicHubPanelProps) {
  return (
    <section
      id={id}
      aria-labelledby={ariaLabelledBy}
      className={cn(
        bare
          ? "min-w-0 space-y-3"
          : "min-w-0 space-y-3 rounded-xl border border-opseu-blue/15 bg-gradient-to-b from-opseu-blue/[0.04] to-white p-4 sm:p-5",
        className,
      )}
    >
      {title ? <h2 className={PUBLIC_CARD_TITLE_CLASS}>{title}</h2> : null}
      {description ? (
        <p className="text-sm text-gray-600">{description}</p>
      ) : null}
      {children}
    </section>
  );
}
