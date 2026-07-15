"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import {
  exportDocx,
  exportXlsx,
  type DocxData,
  type XlsxFillFn,
} from "@/lib/export/office-export";
import { formatFilename } from "@/lib/utils";
import { useBrandStore } from "@/store/brand-store";

type OfficeExportButtonProps = {
  templateUrl: string;
  /** Filename slug prefix passed to formatFilename */
  prefix: string;
  className?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
} & (
  | {
      format: "docx";
      getData: () => DocxData;
      fill?: never;
    }
  | {
      format: "xlsx";
      fill: XlsxFillFn;
      getData?: never;
    }
);

export function OfficeExportButton(props: OfficeExportButtonProps) {
  const t = useTranslations("common");
  const localNumber = useBrandStore((s) => s.brandKit.local.localNumber);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const labelIdle =
    props.format === "docx" ? t("downloadDocx") : t("downloadXlsx");

  async function onExport() {
    setBusy(true);
    setError(null);
    try {
      const filename = formatFilename(props.prefix, localNumber, props.format);
      if (props.format === "docx") {
        await exportDocx({
          templateUrl: props.templateUrl,
          data: props.getData(),
          filename,
        });
      } else {
        await exportXlsx({
          templateUrl: props.templateUrl,
          filename,
          fill: props.fill,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("exportFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={props.className}>
      <Button
        type="button"
        variant={props.variant ?? "primary"}
        size={props.size ?? "md"}
        disabled={busy}
        onClick={() => void onExport()}
        aria-busy={busy}
      >
        {busy ? t("exporting") : labelIdle}
      </Button>
      {error ? (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
