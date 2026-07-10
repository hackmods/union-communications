"use client";

import { useTranslations } from "next-intl";
import { Card, CardTitle } from "@/components/ui/Card";
import { DisplaySettingsControls } from "./DisplaySettingsControls";

export function DisplaySettings() {
  const t = useTranslations("accessibility.display");

  return (
    <Card>
      <CardTitle>{t("title")}</CardTitle>
      <p className="mt-2 text-base text-gray-600">{t("intro")}</p>
      <div className="mt-4">
        <DisplaySettingsControls variant="panel" />
      </div>
    </Card>
  );
}
