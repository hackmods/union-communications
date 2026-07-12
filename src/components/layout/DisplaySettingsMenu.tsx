"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { DisplaySettingsControls } from "@/components/accessibility/DisplaySettingsControls";
import { cn } from "@/lib/utils";

export function DisplaySettingsMenu() {
  const t = useTranslations("accessibility.display");
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={menuId}
        className={cn(
          "rounded-lg border border-gray-200 px-3 py-1.5 text-base font-medium transition-colors",
          "hover:bg-opseu-blue/10",
          open && "bg-opseu-blue/10 text-opseu-dark",
        )}
      >
        {t("menuLabel")}
      </button>

      {open && (
        <div
          ref={panelRef}
          id={menuId}
          role="dialog"
          aria-label={t("title")}
          className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-gray-200 bg-white p-4 shadow-lg"
        >
          <DisplaySettingsControls variant="compact" />
        </div>
      )}
    </div>
  );
}
