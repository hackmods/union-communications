"use client";

import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Accessible label for the dismiss control (pass translated copy). */
  closeLabel?: string;
  className?: string;
};

/**
 * Accessible modal dialog. Callers own EN/FR copy via `title` / children / `closeLabel`.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  closeLabel = "Close",
  className,
}: DialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-xl font-bold text-opseu-dark">
            {title}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={closeLabel}
            onClick={onClose}
            className="shrink-0"
          >
            ×
          </Button>
        </div>
        <div className="mt-3 text-gray-700">{children}</div>
        {footer && <div className="mt-6 flex flex-wrap gap-3">{footer}</div>}
      </div>
    </div>
  );
}
