"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

interface ConsentModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConsentModal({ open, onConfirm, onCancel }: ConsentModalProps) {
  const t = useTranslations("consent");

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
    >
      <div className="max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 id="consent-title" className="text-xl font-bold text-opseu-dark">
          {t("title")}
        </h2>
        <p className="mt-2 text-gray-600">{t("description")}</p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-gray-700">
          <li>{t("item1")}</li>
          <li>{t("item2")}</li>
          <li>{t("item3")}</li>
        </ul>
        <div className="mt-6 flex gap-3">
          <Button onClick={onConfirm}>{t("confirm")}</Button>
          <Button variant="outline" onClick={onCancel}>
            {t("cancel")}
          </Button>
        </div>
      </div>
    </div>
  );
}
