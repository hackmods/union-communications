"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";

type RunExportOptions = {
  /** Override the default `common.exportFailed` message. */
  errorMessage?: string;
  /** When true, do not toggle the shared `exporting` busy flag (caller manages it). */
  skipBusy?: boolean;
};

/**
 * Shared try/catch wrapper for canvas-tool PNG/PDF/ZIP exports.
 * Sets a user-visible `exportError` and optional busy flag; never leaves failures silent.
 */
export function useExportHandler(fallbackMessage?: string) {
  const t = useTranslations("common");
  const defaultMessage = fallbackMessage ?? t("exportFailed");
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const clearExportError = useCallback(() => setExportError(null), []);

  const runExport = useCallback(
    async (
      action: () => Promise<void>,
      options?: RunExportOptions,
    ): Promise<boolean> => {
      setExportError(null);
      if (!options?.skipBusy) setExporting(true);
      try {
        await action();
        return true;
      } catch {
        setExportError(options?.errorMessage ?? defaultMessage);
        return false;
      } finally {
        if (!options?.skipBusy) setExporting(false);
      }
    },
    [defaultMessage],
  );

  return {
    exportError,
    setExportError,
    clearExportError,
    exporting,
    runExport,
  };
}
