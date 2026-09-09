"use client";

import { useTranslations } from "next-intl";
import { PublicHubPanel } from "@/components/comms/PublicHubPanel";
import { DisplaySettingsControls } from "./DisplaySettingsControls";

export function DisplaySettings() {
  const t = useTranslations("accessibility.display");

  return (
    <PublicHubPanel title={t("title")} description={t("intro")}>
      <DisplaySettingsControls variant="panel" />
    </PublicHubPanel>
  );
}
