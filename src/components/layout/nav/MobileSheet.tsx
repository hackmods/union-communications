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

function isInsideSheetScroller(panel: HTMLElement, target: EventTarget | null) {
  if (!(target instanceof Node)) return false;
  let node: Node | null = target;
  while (node && node !== panel) {
    if (node instanceof HTMLElement) {
      const overflowY = getComputedStyle(node).overflowY;
      if (
        (overflowY === "auto" || overflowY === "scroll") &&
        node.scrollHeight > node.clientHeight
      ) {
        return true;
      }
    }
    node = node.parentNode;
  }
  return false;
}

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
    const blockBackgroundScroll = (event: WheelEvent | TouchEvent) => {
      if (panel && isInsideSheetScroller(panel, event.target)) return;
      event.preventDefault();
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("wheel", blockBackgroundScroll, { passive: false });
    document.addEventListener("touchmove", blockBackgroundScroll, {
      passive: false,
    });
    return () => {
      window.clearTimeout(focusTimer);
      unlock();
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("wheel", blockBackgroundScroll);
      document.removeEventListener("touchmove", blockBackgroundScroll);
    };
  }, []);

  const safeTop = Math.max(0, top);
  const panelStyle = {
    top: safeTop,
    height: `calc(100dvh - ${safeTop}px)`,
    maxHeight: `calc(100dvh - ${safeTop}px)`,
  };

  return createPortal(
    <div className={visibilityClassName} role="presentation">
      <button
        type="button"
        className="fixed inset-0 z-[60] bg-slate-900/55 touch-none"
        aria-label={closeLabel}
        data-testid="mobile-sheet-scrim"
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
        style={panelStyle}
        className={cn(
          // min-w-0: flex min-content (Hub context select, module labels) cannot
          // grow past the viewport at Accessibility 1.5× text on a 320px phone.
          "fixed inset-x-0 z-[70] isolate flex min-w-0 max-w-full flex-col overflow-hidden border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-xl",
          "min-[480px]:inset-x-auto min-[480px]:right-0 min-[480px]:w-full min-[480px]:max-w-[min(100%,23rem)] min-[480px]:border-l",
          panelClassName,
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
