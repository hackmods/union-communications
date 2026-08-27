"use client";

import { Button } from "@/components/ui/Button";

type StewardGuideExportBarProps = {
  onExportMarkdown: () => void;
  onExportPdf: () => void;
  onClear: () => void;
  exporting?: boolean;
  labels: {
    exportMarkdown: string;
    exportPdf: string;
    clearDraft: string;
  };
};

export function StewardGuideExportBar({
  onExportMarkdown,
  onExportPdf,
  onClear,
  exporting,
  labels,
}: StewardGuideExportBarProps) {
  return (
    <div className="flex flex-wrap gap-2">
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
