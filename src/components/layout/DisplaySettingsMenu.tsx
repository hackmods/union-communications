"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { DisplaySettingsControls } from "@/components/accessibility/DisplaySettingsControls";
import { cn } from "@/lib/utils";

type PanelCoords = { top: number; left: number; maxHeight: number };

const PANEL_MARGIN = 12;
/** Cap matches `max-w` / `20rem` in the panel class — rem grows with text scale. */
const PANEL_MAX_REM = 20;
const PANEL_MAX_VH = 0.7;

function coordsFromButton(button: HTMLButtonElement): PanelCoords {
  const rect = button.getBoundingClientRect();
  const rootFont =
    Number.parseFloat(getComputedStyle(document.documentElement).fontSize) ||
    16;
  const panelWidth = Math.min(
    window.innerWidth - PANEL_MARGIN * 2,
    PANEL_MAX_REM * rootFont,
  );
  const maxLeft = window.innerWidth - PANEL_MARGIN - panelWidth;
  const preferredLeft = rect.right - panelWidth;

  const spaceBelow = window.innerHeight - rect.bottom - PANEL_MARGIN;
  const spaceAbove = rect.top - PANEL_MARGIN;
  const preferBelow =
    spaceBelow >= 12 * rootFont || spaceBelow >= spaceAbove;

  const hardCap = Math.min(
    window.innerHeight * PANEL_MAX_VH,
    28 * rootFont,
  );
  const available = preferBelow ? spaceBelow : spaceAbove;
  const maxHeight = Math.max(8 * rootFont, Math.min(hardCap, available));

  const top = preferBelow
    ? Math.min(rect.bottom + 8, window.innerHeight - PANEL_MARGIN)
    : Math.max(PANEL_MARGIN, rect.top - 8 - maxHeight);

  return {
    top,
    left: Math.max(PANEL_MARGIN, Math.min(preferredLeft, maxLeft)),
    maxHeight,
  };
}

export function DisplaySettingsMenu() {
  const t = useTranslations("accessibility.display");
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<PanelCoords | null>(null);
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const button = buttonRef.current;
      if (!button) return;
      setCoords(coordsFromButton(button));
    };

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    const observer = new MutationObserver(updatePosition);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-font-size", "style", "class"],
    });
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      observer.disconnect();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        panelRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape, true);
    };
  }, [open]);

  const toggleOpen = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const button = buttonRef.current;
    if (!button) return;
    setCoords(coordsFromButton(button));
    setOpen(true);
  };

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleOpen}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={menuId}
        data-testid="display-settings-toggle"
        className={cn(
          "inline-flex min-h-11 max-w-[11rem] items-center truncate rounded-lg border border-gray-200 px-3 py-1.5 text-base font-medium transition-colors sm:max-w-none",
          "hover:bg-opseu-blue/10",
          open && "bg-opseu-blue/10 text-opseu-dark",
        )}
      >
        {t("menuLabel")}
      </button>

      {open && coords && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              id={menuId}
              role="dialog"
              aria-label={t("title")}
              data-testid="display-settings-panel"
              style={{
                top: coords.top,
                left: coords.left,
                maxHeight: coords.maxHeight,
              }}
              className="fixed z-[90] w-[min(calc(100vw-1.5rem),20rem)] overflow-y-auto overscroll-contain rounded-xl border border-gray-200 bg-white p-4 shadow-lg"
            >
              <DisplaySettingsControls variant="compact" />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
