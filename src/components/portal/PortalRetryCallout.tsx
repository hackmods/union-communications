"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";

export function PortalRetryCallout({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const t = useTranslations("portal");
  return (
    <Callout tone="danger">
      <p>{message}</p>
      <Button
        className="mt-3"
        type="button"
        variant="outline"
        onClick={onRetry}
      >
        {t("retry")}
      </Button>
    </Callout>
  );
}
