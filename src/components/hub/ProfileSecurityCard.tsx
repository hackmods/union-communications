"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Callout } from "@/components/ui/Callout";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import {
  hubMfaChallengeHref,
  hubMfaSetupHref,
} from "@/lib/auth/mfa-return-path";

type MfaStatus = {
  enabled: boolean;
  required: boolean;
  mode: string | null;
  enrolled: boolean;
  needsEnrollment: boolean;
  mfaVerified: boolean;
  reenrollGrace: boolean;
  recoveryCodesRemaining: number | null;
};

type LoadState = "loading" | "ready" | "error";

const PROFILE_NEXT = "/app/profile";

/** Full Profile Security card — status + journey deep links; no self-serve remove. */
export function ProfileSecurityCard() {
  const t = useTranslations("hub.profileSecurity");
  const [state, setState] = useState<LoadState>("loading");
  const [status, setStatus] = useState<MfaStatus | null>(null);

  const loadStatus = useCallback(async () => {
    setState("loading");
    setStatus(null);
    try {
      const response = await fetch("/api/mfa/status", { cache: "no-store" });
      const data = (response.ok ? await response.json() : null) as
        | Partial<MfaStatus>
        | null;
      if (!data) {
        setState("error");
        setStatus(null);
        return;
      }
      setStatus({
        enabled: Boolean(data.enabled),
        required: Boolean(data.required),
        mode: data.mode ?? null,
        enrolled: Boolean(data.enrolled),
        needsEnrollment: Boolean(data.needsEnrollment),
        mfaVerified: Boolean(data.mfaVerified),
        reenrollGrace: Boolean(data.reenrollGrace),
        recoveryCodesRemaining:
          typeof data.recoveryCodesRemaining === "number"
            ? data.recoveryCodesRemaining
            : null,
      });
      setState("ready");
    } catch {
      setState("error");
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => loadStatus());
  }, [loadStatus]);

  const remaining = status?.recoveryCodesRemaining ?? null;
  const low =
    remaining !== null && remaining <= 2
      ? remaining === 0
        ? "empty"
        : "low"
      : null;

  return (
    <Card>
      <CardTitle>{t("title")}</CardTitle>
      <p className="mt-1 text-sm text-gray-600">{t("subtitle")}</p>

      {state === "loading" ? (
        <p className="mt-4 text-sm text-gray-600" aria-live="polite">
          {t("loading")}
        </p>
      ) : null}

      {state === "error" ? (
        <div className="mt-4 space-y-3">
          <Callout tone="danger" role="alert" measure="fill">
            {t("loadFailed")}
          </Callout>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => void loadStatus()}
          >
            {t("loadFailedRetry")}
          </Button>
        </div>
      ) : null}

      {state === "ready" && status && !status.enabled ? (
        <div className="mt-4 space-y-3">
          <Callout tone="muted" measure="fill">
            <p className="font-medium text-opseu-dark">{t("hostOffTitle")}</p>
            <p className="mt-1 text-sm text-opseu-gray-dark">
              {t("hostOffBody")}
            </p>
          </Callout>
        </div>
      ) : null}

      {state === "ready" && status?.enabled && status.reenrollGrace ? (
        <div className="mt-4 space-y-3">
          <Callout tone="warning" measure="fill">
            <p className="font-medium text-opseu-dark">
              {t("reenrollGraceTitle")}
            </p>
            <p className="mt-1 text-sm text-opseu-gray-dark">
              {t("reenrollGraceBody")}
            </p>
          </Callout>
          <ButtonLink href={hubMfaSetupHref(PROFILE_NEXT)} className="min-h-11">
            {t("ctaReenroll")}
          </ButtonLink>
        </div>
      ) : null}

      {state === "ready" &&
      status?.enabled &&
      !status.reenrollGrace &&
      !status.required ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-gray-700">{t("optionalBody")}</p>
          {!status.enrolled ? (
            <ButtonLink href={hubMfaSetupHref(PROFILE_NEXT)} className="min-h-11">
              {t("ctaOptionalSetup")}
            </ButtonLink>
          ) : (
            <EnrolledActions verified={status.mfaVerified} remaining={remaining} low={low} />
          )}
        </div>
      ) : null}

      {state === "ready" &&
      status?.enabled &&
      !status.reenrollGrace &&
      status.required &&
      (status.needsEnrollment || !status.enrolled) ? (
        <div className="mt-4 space-y-3">
          <Callout tone="warning" measure="fill">
            <p className="font-medium text-opseu-dark">{t("needsSetupTitle")}</p>
            <p className="mt-1 text-sm text-opseu-gray-dark">
              {t("needsSetupBody")}
            </p>
          </Callout>
          <ButtonLink href={hubMfaSetupHref(PROFILE_NEXT)} className="min-h-11">
            {t("ctaSetup")}
          </ButtonLink>
        </div>
      ) : null}

      {state === "ready" &&
      status?.enabled &&
      !status.reenrollGrace &&
      status.required &&
      status.enrolled &&
      !status.mfaVerified ? (
        <div className="mt-4 space-y-3">
          <Callout tone="warning" measure="fill">
            <p className="font-medium text-opseu-dark">
              {t("needsVerifyTitle")}
            </p>
            <p className="mt-1 text-sm text-opseu-gray-dark">
              {t("needsVerifyBody")}
            </p>
          </Callout>
          {remaining !== null ? (
            <p className="text-sm text-gray-600">
              {t("recoveryRemaining", { count: remaining })}
            </p>
          ) : null}
          {low ? (
            <Callout
              tone={low === "empty" ? "danger" : "warning"}
              measure="fill"
            >
              {low === "empty" ? t("recoveryEmpty") : t("recoveryLow")}
              <Link
                href="/app/mfa"
                className="mt-2 block text-sm font-medium underline underline-offset-2"
              >
                {t("linkRegenerate")}
              </Link>
            </Callout>
          ) : null}
          <ButtonLink
            href={hubMfaChallengeHref(PROFILE_NEXT)}
            className="min-h-11"
          >
            {t("ctaVerify")}
          </ButtonLink>
          <Link
            href="/app/mfa"
            className="block text-sm font-medium text-opseu-blue hover:underline"
          >
            {t("linkManage")}
          </Link>
        </div>
      ) : null}

      {state === "ready" &&
      status?.enabled &&
      !status.reenrollGrace &&
      status.required &&
      status.enrolled &&
      status.mfaVerified ? (
        <div className="mt-4 space-y-3">
          <EnrolledActions verified remaining={remaining} low={low} />
        </div>
      ) : null}

      {state === "ready" ? (
        <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm text-gray-600">
          <p>
            <Link
              href="/app/mfa"
              className="font-medium text-opseu-blue hover:underline"
            >
              {t("helpLink")}
            </Link>
            {" — "}
            {t("helpBlurb")}
          </p>
          <p>{t("lostDevice")}</p>
          {status?.enabled && status.enrolled && !status.reenrollGrace ? (
            <Link
              href={hubMfaSetupHref(PROFILE_NEXT, "replace")}
              className="inline-block font-medium text-opseu-blue hover:underline"
            >
              {t("linkReplace")}
            </Link>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

function EnrolledActions({
  verified,
  remaining,
  low,
}: {
  verified: boolean;
  remaining: number | null;
  low: "empty" | "low" | null;
}) {
  const t = useTranslations("hub.profileSecurity");
  return (
    <>
      {verified ? (
        <Callout tone="success" measure="fill">
          <p className="font-medium text-green-900">{t("verifiedTitle")}</p>
          <p className="mt-1 text-sm text-green-900/90">{t("verifiedBody")}</p>
        </Callout>
      ) : (
        <Callout tone="brand" measure="fill">
          <p className="font-medium text-opseu-dark">{t("enrolledTitle")}</p>
          <p className="mt-1 text-sm text-opseu-gray-dark">
            {t("enrolledBody")}
          </p>
        </Callout>
      )}
      {remaining !== null ? (
        <p className="text-sm text-gray-600">
          {t("recoveryRemaining", { count: remaining })}
        </p>
      ) : null}
      {low ? (
        <Callout tone={low === "empty" ? "danger" : "warning"} measure="fill">
          {low === "empty" ? t("recoveryEmpty") : t("recoveryLow")}
          <Link
            href="/app/mfa"
            className="mt-2 block text-sm font-medium underline underline-offset-2"
          >
            {t("linkRegenerate")}
          </Link>
        </Callout>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/app/mfa"
          className="text-sm font-medium text-opseu-blue hover:underline"
        >
          {t("linkManage")}
        </Link>
        <Link
          href={hubMfaSetupHref(PROFILE_NEXT, "replace")}
          className="text-sm font-medium text-opseu-blue hover:underline"
        >
          {t("linkReplace")}
        </Link>
      </div>
    </>
  );
}
