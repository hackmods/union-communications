"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

type RunExportOptions = {
  /** Override the default `common.exportFailed` message. */
  errorMessage?: string;
  /** When true, do not toggle the shared `exporting` busy flag (caller manages it). */
  skipBusy?: boolean;
  /** When true, skip the short-lived success status (caller shows its own). */
  skipSuccess?: boolean;
};

/**
 * Shared try/catch wrapper for canvas-tool PNG/PDF/ZIP exports.
 * Sets a user-visible `exportError`, optional busy flag, and short-lived success status.
 */
export function useExportHandler(fallbackMessage?: string) {
  const t = useTranslations("common");
  const defaultMessage = fallbackMessage ?? t("exportFailed");
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearExportError = useCallback(() => setExportError(null), []);
  const clearExportSuccess = useCallback(() => setExportSuccess(null), []);

  useEffect(() => {
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, []);

  const runExport = useCallback(
    async (
      action: () => Promise<void>,
      options?: RunExportOptions,
    ): Promise<boolean> => {
      setExportError(null);
      setExportSuccess(null);
      if (!options?.skipBusy) setExporting(true);
      try {
        await action();
        if (!options?.skipSuccess) {
          setExportSuccess(t("downloadSuccess"));
          if (successTimer.current) clearTimeout(successTimer.current);
          successTimer.current = setTimeout(() => setExportSuccess(null), 3500);
        }
        return true;
      } catch (e) {
        const fromError =
          e instanceof Error && e.message.trim() ? e.message : null;
        setExportError(options?.errorMessage ?? fromError ?? defaultMessage);
        return false;
      } finally {
        if (!options?.skipBusy) setExporting(false);
      }
    },
    [defaultMessage, t],
  );

  return {
    exportError,
    setExportError,
    clearExportError,
    exportSuccess,
    clearExportSuccess,
    exporting,
    runExport,
  };
}
