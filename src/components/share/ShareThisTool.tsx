"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { SHARE_BLURB, SITE_NAME, SITE_URL } from "@/lib/seo/site";

type ShareThisToolProps = {
  url?: string;
  title?: string;
  text?: string;
  className?: string;
};

export function ShareThisTool({
  url = SITE_URL,
  title = SITE_NAME,
  text = SHARE_BLURB,
  className,
}: ShareThisToolProps) {
  const t = useTranslations("share");
  const [status, setStatus] = useState<"idle" | "shared" | "copied" | "error">(
    "idle",
  );

  const payload = `${text}\n\n${url}`;

  const handleShare = async () => {
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title, text, url });
        setStatus("shared");
        return;
      }

      await navigator.clipboard.writeText(payload);
      setStatus("copied");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      try {
        await navigator.clipboard.writeText(payload);
        setStatus("copied");
      } catch {
        setStatus("error");
      }
    } finally {
      window.setTimeout(() => setStatus("idle"), 2500);
    }
  };

  const label =
    status === "copied"
      ? t("copied")
      : status === "shared"
        ? t("shared")
        : status === "error"
          ? t("error")
          : t("button");

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      onClick={() => {
        void handleShare();
      }}
      aria-live="polite"
    >
      {label}
    </Button>
  );
}
