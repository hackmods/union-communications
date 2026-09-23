"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Link } from "@/i18n/navigation";
import { getTenantContext } from "@/lib/tenant/loader";
import { Callout } from "@/components/ui/Callout";
import { Button } from "@/components/ui/Button";
import { useMfaEnabled, useSessionMfaOk } from "@/components/hub/MfaPolicyProvider";
import { canCreateInformalLog } from "@/lib/informal-log/access";
import type { HubModule, UserRole } from "@/types/tenant";

const WRITE_ROLES: UserRole[] = [
  "platform_admin",
  "union_admin",
  "local_president",
  "local_exec",
  "solo_account",
];

type SyncKind = "bylaws" | "proposals" | "informalLog";

const API_PATH: Record<SyncKind, string> = {
  bylaws: "/api/bylaws",
  proposals: "/api/proposals",
  informalLog: "/api/informal-log",
};

const HUB_HREF: Record<SyncKind, string> = {
  bylaws: "/app/bylaws",
  proposals: "/app/proposals",
  informalLog: "/app/informal-log",
};

type HubDraftSyncPanelBase = {
  /** Human label for the record saved on the Hub (e.g. "Bylaw draft — Local 777"). */
  syncLabel: string;
  className?: string;
};

type SinglePayloadProps = HubDraftSyncPanelBase & {
  kind: "bylaws" | "proposals";
  /** Builds the API body from the current on-device draft; null when empty. */
  getPayload: () => Record<string, unknown> | null;
};

type MultiPayloadProps = HubDraftSyncPanelBase & {
  kind: "informalLog";
  /**
   * Builds one API body per Hub create. Null or empty when nothing to sync.
   * Each payload is POSTed in order to `/api/informal-log`.
   */
  getPayloads: () => Record<string, unknown>[] | null;
};

/**
 * Public-tool → Officer Hub sync. The public tools stay on-device (localStorage);
 * this panel is the opt-in path for a signed-in officer to push the current
 * draft into Hub casework. Renders nothing for anonymous visitors.
 */
export function HubDraftSyncPanel(props: SinglePayloadProps | MultiPayloadProps) {
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
  const moduleId = props.kind as HubModule;
  const moduleEnabled =
    tenant?.union.enabledModules.includes(moduleId) ?? false;
  const canWrite =
    props.kind === "informalLog"
      ? canCreateInformalLog(roles)
      : roles.some((r) => WRITE_ROLES.includes(r));
  const mfaBlocked = mfaEnabled && !mfaOk;
  const href = HUB_HREF[props.kind];
  const isInformal = props.kind === "informalLog";

  if (!moduleEnabled || !canWrite || !session.user.localId) return null;

  async function handleSync() {
    setState("busy");
    setError(null);

    if (props.kind === "informalLog") {
      const payloads = props.getPayloads();
      if (!payloads?.length) {
        setError(t("emptyInformalLog"));
        setState("error");
        return;
      }
      for (const payload of payloads) {
        const res = await fetch(API_PATH.informalLog, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          setError(t("error"));
          setState("error");
          return;
        }
      }
      setState("done");
      return;
    }

    const payload = props.getPayload();
    if (!payload) {
      setError(t("empty"));
      setState("error");
      return;
    }
    const res = await fetch(API_PATH[props.kind], {
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
    <Callout tone="muted" className={props.className}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-opseu-dark">
            {isInformal ? t("titleInformalLog") : t("title")}
          </p>
          <p className="mt-0.5 text-xs text-gray-600">
            {isInformal ? t("bodyInformalLog") : t("body")}
          </p>
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
            {t("done", { label: props.syncLabel })} →
          </Link>
        ) : (
          <Button
            type="button"
            size="sm"
            disabled={state === "busy"}
            onClick={() => void handleSync()}
          >
            {state === "busy"
              ? t("saving")
              : isInformal
                ? t("syncInformalLog")
                : t("sync")}
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
