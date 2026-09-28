/**
 * Dual-gate enterprise email capabilities.
 *
 * Host (CapRover) env must be true AND the union entitlement must be true.
 * Everything defaults closed — durable compose/ops, not Mailchimp-by-default.
 */

import { and, eq, isNull } from "drizzle-orm";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { unions } from "@/lib/db/schema/tenant";
import { isEmailEnabled } from "@/lib/email/send";

export type EnterpriseEmailCapability =
  | "member_broadcast"
  | "comms_auto_send"
  | "grievance_smtp"
  | "tracking_pixels";

const ENV_KEYS: Record<EnterpriseEmailCapability, string> = {
  member_broadcast: "UNIONOPS_MEMBER_BROADCAST_ENABLED",
  comms_auto_send: "UNIONOPS_COMMS_AUTO_SEND_ENABLED",
  grievance_smtp: "UNIONOPS_GRIEVANCE_SMTP_ENABLED",
  tracking_pixels: "UNIONOPS_EMAIL_TRACKING_PIXELS_ENABLED",
};

export type EnterpriseEmailGateResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "host_disabled"
        | "email_transport_disabled"
        | "durable_storage_missing"
        | "union_not_entitled"
        | "union_not_found";
    };

function hostEnabled(capability: EnterpriseEmailCapability): boolean {
  return process.env[ENV_KEYS[capability]]?.trim() === "true";
}

/** Public, non-secret snapshot for Site Admin / CapRover operators. */
export function getEnterpriseEmailHostFlags(): Record<
  EnterpriseEmailCapability,
  boolean
> {
  return {
    member_broadcast: hostEnabled("member_broadcast"),
    comms_auto_send: hostEnabled("comms_auto_send"),
    grievance_smtp: hostEnabled("grievance_smtp"),
    tracking_pixels: hostEnabled("tracking_pixels"),
  };
}

export type UnionEmailEntitlements = {
  memberBroadcastEnabled: boolean;
  commsAutoSendEnabled: boolean;
  grievanceSmtpEnabled: boolean;
  emailTrackingPixelsEnabled: boolean;
};

const CLOSED: UnionEmailEntitlements = {
  memberBroadcastEnabled: false,
  commsAutoSendEnabled: false,
  grievanceSmtpEnabled: false,
  emailTrackingPixelsEnabled: false,
};

export async function getUnionEmailEntitlements(
  unionId: string,
): Promise<UnionEmailEntitlements | null> {
  if (!isPostgresConfigured()) return null;
  const rows = await getDb()
    .select({
      memberBroadcastEnabled: unions.memberBroadcastEnabled,
      commsAutoSendEnabled: unions.commsAutoSendEnabled,
      grievanceSmtpEnabled: unions.grievanceSmtpEnabled,
      emailTrackingPixelsEnabled: unions.emailTrackingPixelsEnabled,
    })
    .from(unions)
    .where(and(eq(unions.id, unionId), isNull(unions.archivedAt)))
    .limit(1);
  if (!rows[0]) return null;
  return {
    memberBroadcastEnabled: rows[0].memberBroadcastEnabled === true,
    commsAutoSendEnabled: rows[0].commsAutoSendEnabled === true,
    grievanceSmtpEnabled: rows[0].grievanceSmtpEnabled === true,
    emailTrackingPixelsEnabled: rows[0].emailTrackingPixelsEnabled === true,
  };
}

function unionAllows(
  entitlements: UnionEmailEntitlements,
  capability: EnterpriseEmailCapability,
): boolean {
  switch (capability) {
    case "member_broadcast":
      return entitlements.memberBroadcastEnabled;
    case "comms_auto_send":
      return entitlements.commsAutoSendEnabled;
    case "grievance_smtp":
      return entitlements.grievanceSmtpEnabled;
    case "tracking_pixels":
      return entitlements.emailTrackingPixelsEnabled;
  }
}

/**
 * Fail-closed dual gate: CapRover env + durable union entitlement.
 * Member broadcast / Comms auto-send / grievance SMTP also require EMAIL_ENABLED.
 */
export async function assertEnterpriseEmailCapability(
  capability: EnterpriseEmailCapability,
  unionId: string,
): Promise<EnterpriseEmailGateResult> {
  if (!hostEnabled(capability)) {
    return { ok: false, reason: "host_disabled" };
  }
  if (
    capability !== "tracking_pixels" &&
    !isEmailEnabled()
  ) {
    return { ok: false, reason: "email_transport_disabled" };
  }
  if (!isPostgresConfigured()) {
    return { ok: false, reason: "durable_storage_missing" };
  }
  const entitlements = await getUnionEmailEntitlements(unionId);
  if (!entitlements) {
    return { ok: false, reason: "union_not_found" };
  }
  if (!unionAllows(entitlements, capability)) {
    return { ok: false, reason: "union_not_entitled" };
  }
  return { ok: true };
}

export async function setUnionEmailEntitlements(
  unionId: string,
  patch: Partial<UnionEmailEntitlements>,
): Promise<boolean> {
  if (!isPostgresConfigured()) {
    throw new Error("Durable database required for email entitlements");
  }
  const rows = await getDb()
    .update(unions)
    .set({
      ...(patch.memberBroadcastEnabled !== undefined
        ? { memberBroadcastEnabled: patch.memberBroadcastEnabled }
        : {}),
      ...(patch.commsAutoSendEnabled !== undefined
        ? { commsAutoSendEnabled: patch.commsAutoSendEnabled }
        : {}),
      ...(patch.grievanceSmtpEnabled !== undefined
        ? { grievanceSmtpEnabled: patch.grievanceSmtpEnabled }
        : {}),
      ...(patch.emailTrackingPixelsEnabled !== undefined
        ? { emailTrackingPixelsEnabled: patch.emailTrackingPixelsEnabled }
        : {}),
    })
    .where(and(eq(unions.id, unionId), isNull(unions.archivedAt)))
    .returning({ id: unions.id });
  return rows.length > 0;
}

export function closedUnionEmailEntitlements(): UnionEmailEntitlements {
  return { ...CLOSED };
}
