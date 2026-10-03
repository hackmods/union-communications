"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { qrDataUrl } from "@/lib/export/qr";
import { PUBLIC_SECTION_TITLE_CLASS } from "@/lib/constants/public-type";

type Status = "idle" | "copied" | "shared" | "copyError";

export function LocalPortalPassAlong() {
  const t = useTranslations("localPortalShare");
  const [pageUrl, setPageUrl] = useState("");
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const [qrFailed, setQrFailed] = useState(false);
  const [shareMode, setShareMode] = useState<"unknown" | "native" | "copy-only">(
    "unknown",
  );
  const [status, setStatus] = useState<Status>("idle");
  const statusTimer = useRef<number | null>(null);
  const urlInputId = "local-portal-page-url";

  useEffect(() => {
    const url = window.location.href;
    setPageUrl(url);
    setShareMode(typeof navigator.share === "function" ? "native" : "copy-only");
    let cancelled = false;
    void qrDataUrl(url, { width: 220, margin: 2 }).then((dataUrl) => {
      if (cancelled) return;
      if (dataUrl) {
        setQrSrc(dataUrl);
        setQrFailed(false);
      } else {
        setQrFailed(true);
      }
    });
    return () => {
      cancelled = true;
      if (statusTimer.current) window.clearTimeout(statusTimer.current);
    };
  }, []);

  function flash(next: Status) {
    setStatus(next);
    if (statusTimer.current) window.clearTimeout(statusTimer.current);
    statusTimer.current = window.setTimeout(() => setStatus("idle"), 2500);
  }

  function selectPageUrl() {
    const field = document.getElementById(urlInputId);
    if (field instanceof HTMLInputElement) {
      field.focus();
      field.select();
    }
  }

  async function copyLink() {
    const url = pageUrl || window.location.href;
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error("clipboard-unavailable");
      }
      await navigator.clipboard.writeText(url);
      flash("copied");
    } catch {
      selectPageUrl();
      flash("copyError");
    }
  }

  async function shareLink() {
    const url = pageUrl || window.location.href;
    try {
      await navigator.share({
        title: t("title"),
        text: t("shareText"),
        url,
      });
      flash("shared");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      await copyLink();
    }
  }

  const copyLabel =
    status === "copied"
      ? t("copied")
      : status === "copyError"
        ? t("copyFailed")
        : t("copyLink");

  return (
    <Card variant="elevated" className="mt-10" data-testid="local-portal-pass-along">
      <h2 className={PUBLIC_SECTION_TITLE_CLASS}>{t("passAlongTitle")}</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-700">
        {t("passAlongBody")}
      </p>

      <div className="mt-5 flex justify-center rounded-xl border border-slate-200 bg-white p-4">
        {qrSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- QR is a generated data URL
          <img
            src={qrSrc}
            alt={t("qrAlt")}
            width={220}
            height={220}
            data-testid="local-portal-qr"
            className="h-auto w-full max-w-[220px]"
          />
        ) : (
          <div
            className="flex aspect-square w-full max-w-[220px] items-center justify-center bg-slate-50 p-3 text-center text-sm text-slate-600"
            data-testid="local-portal-qr-placeholder"
            aria-live="polite"
          >
            {qrFailed ? t("qrError") : t("qrLoading")}
          </div>
        )}
      </div>

      {pageUrl ? (
        <div className="mt-4">
          <Input
            id={urlInputId}
            label={t("pageUrlLabel")}
            hint={t("pageUrlHint")}
            error={status === "copyError" ? t("copyError") : undefined}
            readOnly
            value={pageUrl}
            className="break-all font-mono text-sm"
            onFocus={(event) => event.currentTarget.select()}
            data-testid="local-portal-url"
          />
        </div>
      ) : null}

      <div className="mt-5 grid gap-3">
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="w-full"
          aria-live="polite"
          onClick={() => {
            void copyLink();
          }}
        >
          {copyLabel}
        </Button>
        {shareMode === "native" ? (
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="w-full"
            aria-live="polite"
            onClick={() => {
              void shareLink();
            }}
          >
            {status === "shared" ? t("shared") : t("share")}
          </Button>
        ) : null}
        {shareMode === "copy-only" ? (
          <p className="text-sm text-slate-600">{t("shareUnavailable")}</p>
        ) : null}
        <ButtonLink
          href="/create/qr-card?preset=localPortal"
          variant="ghost"
          size="lg"
          block
        >
          {t("printCard")}
        </ButtonLink>
      </div>
    </Card>
  );
}
