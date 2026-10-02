"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { getFocusable } from "./focusables";
import { lockBodyScroll } from "@/lib/layout/lock-body-scroll";
import { cn } from "@/lib/utils";

type MobileSheetProps = {
  /** Distance from viewport top to the sheet (px). Prefer live chrome bottom. */
  top: number;
  drawerId: string;
  labelledBy?: string;
  /** Accessible name when labelledBy is omitted. */
  label: string;
  closeLabel: string;
  testId: string;
  /** Tailwind visibility wrapper, e.g. `xl:hidden` or `lg:hidden`. */
  visibilityClassName: string;
  panelClassName?: string;
  onClose: () => void;
  children: ReactNode;
};

/**
 * Shared mobile navigation sheet: portal, overlay, focus trap, Escape,
 * and scroll lock that preserves sticky chrome geometry.
 */
export function MobileSheet({
  top,
  drawerId,
  labelledBy,
  label,
  closeLabel,
  testId,
  visibilityClassName,
  panelClassName,
  onClose,
  children,
}: MobileSheetProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const unlock = lockBodyScroll();
    const panel = drawerRef.current;
    const focusTimer = window.setTimeout(() => {
      if (panel) getFocusable(panel)[0]?.focus();
    }, 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const items = getFocusable(panel);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          !panel.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      unlock();
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const topStyle = { top: Math.max(0, top) };

  return createPortal(
    <div className={visibilityClassName} role="presentation">
      <button
        type="button"
        className="fixed inset-x-0 bottom-0 z-[60] bg-black/40"
        style={topStyle}
        aria-label={closeLabel}
        onClick={onClose}
      />
      <div
        ref={drawerRef}
        id={drawerId}
        role="dialog"
        aria-modal="true"
        aria-label={labelledBy ? undefined : label}
        aria-labelledby={labelledBy}
        data-testid={testId}
        style={topStyle}
        className={cn(
          "fixed bottom-0 right-0 z-[70] flex w-full max-w-[min(100vw,23rem)] flex-col border-l border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-xl",
          panelClassName,
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
