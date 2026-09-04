"use client";

import { Button } from "@/components/ui/Button";

type StewardGuideExportBarProps = {
  onExportPdf: () => void;
  onClear: () => void;
  onPrintChecklist?: () => void;
  exporting?: boolean;
  labels: {
    exportPdf: string;
    clearDraft: string;
    printChecklist?: string;
  };
};

export function StewardGuideExportBar({
  onExportPdf,
  onClear,
  onPrintChecklist,
  exporting,
  labels,
}: StewardGuideExportBarProps) {
  return (
    <div className="flex flex-col gap-2 print:hidden sm:flex-row sm:flex-wrap sm:items-center">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={onExportPdf}
          disabled={exporting}
          className="min-h-11"
        >
          {labels.exportPdf}
        </Button>
        {onPrintChecklist && labels.printChecklist ? (
          <Button
            type="button"
            variant="outline"
            onClick={onPrintChecklist}
            disabled={exporting}
            className="min-h-11"
          >
            {labels.printChecklist}
          </Button>
        ) : null}
      </div>
      <Button
        type="button"
        variant="ghost"
        onClick={onClear}
        disabled={exporting}
        className="min-h-11 self-start sm:self-auto"
      >
        {labels.clearDraft}
      </Button>
    </div>
  );
}
