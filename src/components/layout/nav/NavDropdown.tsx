"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { cn } from "@/lib/utils";
import { clampFlyoutToViewport } from "@/lib/utils/flyout-geometry";
import { getMenuItems } from "./focusables";

type NavDropdownProps = {
  label: string;
  open: boolean;
  active: boolean;
  onToggle: () => void;
  onClose: () => void;
  children: ReactNode;
  /** Align panel to the right edge of the trigger (Tools). */
  align?: "left" | "right";
  /** Extra classes on the menu panel (mega-menu width/grid). */
  panelClassName?: string;
  /**
   * When set, the panel is `fixed` and clamped to the viewport so a wide
   * mega-menu cannot clip off the left edge on lg/xl desktops.
   */
  preferredPanelWidth?: (viewportWidth: number) => number;
  /** Extra classes on the trigger (Hub chrome uses white hover, not blue tint). */
  triggerClassName?: string;
  menuRef?: RefObject<HTMLDivElement | null>;
};

export function NavDropdown({
  label,
  open,
  active,
  onToggle,
  onClose,
  children,
  align = "left",
  panelClassName,
  preferredPanelWidth,
  triggerClassName,
  menuRef: externalMenuRef,
}: NavDropdownProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const internalMenuRef = useRef<HTMLDivElement>(null);
  const menuRef = externalMenuRef ?? internalMenuRef;
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const clampToViewport = Boolean(preferredPanelWidth);

  useLayoutEffect(() => {
    if (!open || !preferredPanelWidth) return;
    const trigger = triggerRef.current;
    const panel = menuRef.current;
    if (!trigger || !panel) return;

    const apply = () => {
      const rect = trigger.getBoundingClientRect();
      const box = clampFlyoutToViewport({
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        trigger: {
          left: rect.left,
          right: rect.right,
          bottom: rect.bottom,
        },
        preferredWidth: preferredPanelWidth(window.innerWidth),
        align,
      });
      panel.style.top = `${box.top}px`;
      panel.style.left = `${box.left}px`;
      panel.style.width = `${box.width}px`;
      panel.style.maxHeight = `${box.maxHeight}px`;
    };

    apply();
    window.addEventListener("resize", apply);
    window.addEventListener("scroll", apply, true);
    return () => {
      window.removeEventListener("resize", apply);
      window.removeEventListener("scroll", apply, true);
    };
  }, [open, preferredPanelWidth, align, menuRef]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target)) onClose();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const panel = menuRef.current;
    if (!panel) return;
    const items = getMenuItems(panel);
    items[0]?.focus();
  }, [open, menuRef]);

  const onTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) onToggle();
      else {
        const items = menuRef.current ? getMenuItems(menuRef.current) : [];
        items[0]?.focus();
      }
    }
    if (event.key === "ArrowUp" && open) {
      event.preventDefault();
      const items = menuRef.current ? getMenuItems(menuRef.current) : [];
      items[items.length - 1]?.focus();
    }
  };

  const onPanelKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const panel = menuRef.current;
    if (!panel) return;
    const items = getMenuItems(panel);
    if (items.length === 0) return;
    const index = items.indexOf(document.activeElement as HTMLElement);

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = index < 0 ? 0 : (index + 1) % items.length;
      items[next]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const next = index <= 0 ? items.length - 1 : index - 1;
      items[next]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      items[items.length - 1]?.focus();
    } else if (event.key === "Tab") {
      onClose();
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-2 py-1 transition-colors duration-150",
          triggerClassName ?? "hover:bg-opseu-blue/5",
          open
            ? cn(
                "font-semibold text-opseu-dark",
                triggerClassName ? "bg-white" : "bg-opseu-blue/10",
              )
            : active &&
              (triggerClassName
                ? "bg-white font-semibold text-opseu-dark"
                : "font-semibold text-opseu-blue"),
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={onToggle}
        onKeyDown={onTriggerKeyDown}
      >
        {label}
        <span
          aria-hidden="true"
          className={cn(
            "inline-block text-[0.65em] leading-none transition-transform duration-150",
            open && "rotate-180",
          )}
        >
          ▾
        </span>
      </button>
      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          onKeyDown={onPanelKeyDown}
          className={cn(
            "z-50 rounded-lg border border-gray-200 bg-white py-1 shadow-lg",
            "origin-top transition duration-150 ease-out",
            clampToViewport
              ? "fixed max-w-[calc(100vw-2rem)] overflow-y-auto"
              : cn(
                  "absolute mt-1",
                  align === "right" ? "right-0" : "left-0",
                ),
            panelClassName ?? (clampToViewport ? undefined : "min-w-[220px]"),
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
