"use client";

import { Button } from "@/components/ui/Button";
import { useTranslations } from "next-intl";

interface UndoRedoBarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onReset?: () => void;
}

export function UndoRedoBar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onReset,
}: UndoRedoBarProps) {
  const t = useTranslations("common");

  return (
    <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Edit history">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onUndo}
        disabled={!canUndo}
      >
        {t("undo")}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRedo}
        disabled={!canRedo}
      >
        {t("redo")}
      </Button>
      {onReset && (
        <Button type="button" variant="ghost" size="sm" onClick={onReset}>
          {t("reset")}
        </Button>
      )}
    </div>
  );
}
