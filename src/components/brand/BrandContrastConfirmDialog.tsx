"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

interface BrandContrastConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Non-blocking confirm when saving Brand Kit colours that fail contrast checks. */
export function BrandContrastConfirmDialog({
  open,
  onConfirm,
  onCancel,
}: BrandContrastConfirmDialogProps) {
  const t = useTranslations("brandKit.contrastAdvisory");
  const titleId = useId();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 id={titleId} className="text-xl font-bold text-opseu-dark">
          {t("confirmTitle")}
        </h2>
        <p className="mt-2 text-gray-600">{t("confirmBody")}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" onClick={onConfirm}>
            {t("confirmSave")}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("confirmCancel")}
          </Button>
        </div>
      </div>
    </div>
  );
}
