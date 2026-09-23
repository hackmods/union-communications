"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Link } from "@/i18n/navigation";
import { getTenantContext } from "@/lib/tenant/loader";
import { Callout } from "@/components/ui/Callout";
import { Button } from "@/components/ui/Button";
import { useMfaEnabled, useSessionMfaOk } from "@/components/hub/MfaPolicyProvider";
import type { UserRole } from "@/types/tenant";

const WRITE_ROLES: UserRole[] = [
  "platform_admin",
  "union_admin",
  "local_president",
  "local_exec",
  "solo_account",
];

type SyncKind = "bylaws" | "proposals";

/**
 * Public-tool → Officer Hub sync. The public tools stay on-device (localStorage);
 * this panel is the opt-in path for a signed-in officer to push the current
 * draft into Hub casework. Renders nothing for anonymous visitors.
 */
export function HubDraftSyncPanel({
  kind,
  syncLabel,
  getPayload,
  className,
}: {
  kind: SyncKind;
  /** Human label for the record saved on the Hub (e.g. "Bylaw draft — Local 777"). */
  syncLabel: string;
  /** Builds the API body from the current on-device draft; null when empty. */
  getPayload: () => Record<string, unknown> | null;
  className?: string;
}) {
  const t = useTranslations("hubDraftSync");
  const { data: session, status } = useSession();
  const mfaEnabled = useMfaEnabled();
  const mfaOk = useSessionMfaOk();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  if (status !== "authenticated" || !session?.user) return null;

  const roles = (session.user.roles ?? []) as UserRole[];
  const tenant =
    session.user.unionId
      ? getTenantContext(session.user.unionId, session.user.localId)
      : null;
  const moduleEnabled =
    tenant?.union.enabledModules.includes(kind) ?? false;
  const canWrite =
    moduleEnabled && roles.some((r) => WRITE_ROLES.includes(r));
  const mfaBlocked = mfaEnabled && !mfaOk;
  const href = kind === "bylaws" ? "/app/bylaws" : "/app/proposals";

  if (!moduleEnabled || !canWrite || !session.user.localId) return null;

  async function handleSync() {
    const payload = getPayload();
    if (!payload) {
      setError(t("empty"));
      setState("error");
      return;
    }
    setState("busy");
    setError(null);
    const res = await fetch(kind === "bylaws" ? "/api/bylaws" : "/api/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setState("done");
    } else {
      setError(t("error"));
      setState("error");
    }
  }

  return (
    <Callout tone="muted" className={className}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-opseu-dark">
            {t("title")}
          </p>
          <p className="mt-0.5 text-xs text-gray-600">{t("body")}</p>
        </div>
        {mfaBlocked ? (
          <Link
            href="/app/mfa"
            className="inline-flex min-h-9 items-center rounded-md border border-gray-300 px-3 text-sm font-medium text-opseu-dark hover:bg-gray-50"
          >
            {t("mfaFirst")}
          </Link>
        ) : state === "done" ? (
          <Link
            href={href}
            className="inline-flex min-h-9 items-center rounded-md border border-gray-300 px-3 text-sm font-medium text-opseu-dark hover:bg-gray-50"
          >
            {t("done", { label: syncLabel })} →
          </Link>
        ) : (
          <Button
            type="button"
            size="sm"
            disabled={state === "busy"}
            onClick={() => void handleSync()}
          >
            {state === "busy" ? t("saving") : t("sync")}
          </Button>
        )}
      </div>
      {state === "error" ? (
        <p className="mt-2 text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </Callout>
  );
}