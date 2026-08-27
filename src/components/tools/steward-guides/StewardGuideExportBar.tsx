"use client";

import { Button } from "@/components/ui/Button";

type StewardGuideExportBarProps = {
  onExportMarkdown: () => void;
  onExportPdf: () => void;
  onClear: () => void;
  onPrintChecklist?: () => void;
  exporting?: boolean;
  labels: {
    exportMarkdown: string;
    exportPdf: string;
    clearDraft: string;
    printChecklist?: string;
  };
};

export function StewardGuideExportBar({
  onExportMarkdown,
  onExportPdf,
  onClear,
  onPrintChecklist,
  exporting,
  labels,
}: StewardGuideExportBarProps) {
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button
        type="button"
        onClick={onExportMarkdown}
        disabled={exporting}
        className="min-h-11"
      >
        {labels.exportMarkdown}
      </Button>
      <Button
        type="button"
        variant="secondary"
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
      <Button
        type="button"
        variant="ghost"
        onClick={onClear}
        disabled={exporting}
        className="min-h-11"
      >
        {labels.clearDraft}
      </Button>
    </div>
  );
}
