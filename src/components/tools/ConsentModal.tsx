"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

interface ConsentModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConsentModal({ open, onConfirm, onCancel }: ConsentModalProps) {
  const t = useTranslations("consent");
  const tc = useTranslations("common");

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={t("title")}
      closeLabel={tc("close")}
      footer={
        <>
          <Button onClick={onConfirm}>{t("confirm")}</Button>
          <Button variant="outline" onClick={onCancel}>
            {t("cancel")}
          </Button>
        </>
      }
    >
      <p className="text-gray-600">{t("description")}</p>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-gray-700">
        <li>{t("item1")}</li>
        <li>{t("item2")}</li>
        <li>{t("item3")}</li>
      </ul>
    </Dialog>
  );
}
