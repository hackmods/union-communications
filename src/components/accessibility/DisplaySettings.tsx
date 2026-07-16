"use client";

import { useTranslations } from "next-intl";
import { Card, CardTitle } from "@/components/ui/Card";
import { DisplaySettingsControls } from "./DisplaySettingsControls";

export function DisplaySettings() {
  const t = useTranslations("accessibility.display");

  return (
    <Card density="compact">
      <CardTitle className="text-base">{t("title")}</CardTitle>
      <p className="mt-1 text-sm text-gray-600">{t("intro")}</p>
      <div className="mt-3">
        <DisplaySettingsControls variant="panel" />
      </div>
    </Card>
  );
}
