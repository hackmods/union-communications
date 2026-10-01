"use client";

import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { getFocusable } from "@/components/layout/nav/focusables";

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
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = getFocusable(panel).filter(
        (item) => item.getClientRects().length > 0,
      );
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panel || !panel.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || active === panel || !panel.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const overlay = panel.parentElement;
    const inertSiblings = new Map<HTMLElement, boolean>();
    let branch: HTMLElement | null = overlay ?? null;
    while (branch?.parentElement && branch.parentElement !== document.body) {
      const parent = branch.parentElement;
      for (const sibling of Array.from(parent.children)) {
        if (
          sibling !== branch &&
          sibling instanceof HTMLElement &&
          !inertSiblings.has(sibling)
        ) {
          inertSiblings.set(sibling, sibling.inert);
          sibling.inert = true;
        }
      }
      branch = parent;
    }
    if (branch?.parentElement === document.body) {
      for (const sibling of Array.from(document.body.children)) {
        if (
          sibling !== branch &&
          sibling instanceof HTMLElement &&
          !inertSiblings.has(sibling)
        ) {
          inertSiblings.set(sibling, sibling.inert);
          sibling.inert = true;
        }
      }
    }
    panel.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      inertSiblings.forEach((wasInert, sibling) => {
        sibling.inert = wasInert;
      });
      if (previousFocus?.isConnected && !previousFocus.closest("[inert]")) previousFocus.focus();
    };
  }, [open]);

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
