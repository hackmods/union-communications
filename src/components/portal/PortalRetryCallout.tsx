"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { PortalPanel } from "@/components/portal/PortalPanel";

export function PortalRetryCallout({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const t = useTranslations("portal");
  return (
    <PortalPanel
      eyebrow={t("portalEyebrow")}
      title={t("loadErrorTitle")}
      titleId="portal-retry-heading"
      titleLevel="page"
      lead={t("loadErrorLead")}
    >
      <Callout tone="danger">
        <p className="text-sm leading-relaxed">{message}</p>
        <Button
          className="mt-3"
          type="button"
          variant="outline"
          onClick={onRetry}
        >
          {t("retry")}
        </Button>
      </Callout>
    </PortalPanel>
  );
}
