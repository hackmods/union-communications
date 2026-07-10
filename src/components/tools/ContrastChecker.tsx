"use client";

import { checkContrast } from "@/lib/utils/contrast";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface ContrastCheckerProps {
  foreground: string;
  background: string;
  className?: string;
}

export function ContrastChecker({
  foreground,
  background,
  className,
}: ContrastCheckerProps) {
  const t = useTranslations("contrast");
  const result = checkContrast(foreground, background);

  if (result.ratio === null) return null;

  return (
    <div
      className={cn(
        "rounded-lg px-3 py-2 text-sm",
        result.passesAA ? "bg-green-50 text-green-900" : "bg-amber-50 text-amber-950",
        className,
      )}
      role="status"
    >
      <p>{result.passesAA ? t("pass") : t("fail")}</p>
      <p>{t("ratio", { ratio: result.ratio.toFixed(2) })}</p>
    </div>
  );
}
