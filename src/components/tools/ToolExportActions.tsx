"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

export interface ToolExportActionsProps {
  exporting?: boolean;
  onPng?: () => void;
  onPdf?: () => void;
  onZip?: () => void;
  /** Disable PNG when source is incomplete (e.g. resizer without upload). */
  pngDisabled?: boolean;
  pdfDisabled?: boolean;
  zipDisabled?: boolean;
  pngLabel?: string;
  pdfLabel?: string;
  zipLabel?: string;
  className?: string;
}

/**
 * Standard export button row for form footers and ToolEditorLayout previewActions.
 */
export function ToolExportActions({
  exporting = false,
  onPng,
  onPdf,
  onZip,
  pngDisabled,
  pdfDisabled,
  zipDisabled,
  pngLabel,
  pdfLabel,
  zipLabel,
  className,
}: ToolExportActionsProps) {
  const tc = useTranslations("common");
  const busy = exporting ? tc("exporting") : undefined;

  return (
    <div className={className ?? "flex flex-wrap gap-2"}>
      {onPng ? (
        <Button
          type="button"
          disabled={exporting || pngDisabled}
          onClick={onPng}
        >
          {busy ?? pngLabel ?? tc("downloadPng")}
        </Button>
      ) : null}
      {onPdf ? (
        <Button
          type="button"
          variant="outline"
          disabled={exporting || pdfDisabled}
          onClick={onPdf}
        >
          {busy ?? pdfLabel ?? tc("downloadPdf")}
        </Button>
      ) : null}
      {onZip ? (
        <Button
          type="button"
          variant="outline"
          disabled={exporting || zipDisabled}
          onClick={onZip}
        >
          {busy ?? zipLabel ?? tc("downloadZip")}
        </Button>
      ) : null}
    </div>
  );
}
