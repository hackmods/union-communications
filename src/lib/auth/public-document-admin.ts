import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { isMfaEnabled } from "@/lib/auth/mfa-policy";
import { isPostgresConfigured } from "@/lib/db/client";
import { resolveAttachmentStorageMode } from "@/lib/attachments/storage";

export type PublicDocumentAdminReadinessCode =
  | "mfa_disabled"
  | "postgres_required"
  | "storage_required";

export type PublicDocumentAdminResult =
  | { ok: true; userId: string }
  | {
      ok: false;
      status: 401 | 403 | 503;
      error: string;
      code?: PublicDocumentAdminReadinessCode;
      /** Present on 401/403 from requireSiteAdminSession. */
      authCode?: "unauthorized" | "mfa_required" | "forbidden";
    };

/**
 * Public publication is a platform operation and never follows a union brand role.
 *
 * Auth failures stay 401/403. Host readiness gaps (MFA off, Postgres, durable
 * storage) return 503 so the admin UI can explain the block instead of
 * silently redirecting.
 */
export async function requirePublicDocumentAdmin(): Promise<PublicDocumentAdminResult> {
  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    return {
      ok: false,
      status: gate.status,
      error: gate.error,
      authCode: gate.code,
    };
  }
  if (!isMfaEnabled()) {
    return {
      ok: false,
      status: 503,
      code: "mfa_disabled",
      error: "Enable host MFA before publishing public documents",
    };
  }
  if (!isPostgresConfigured()) {
    return {
      ok: false,
      status: 503,
      code: "postgres_required",
      error: "Public document management requires Postgres",
    };
  }
  if (
    process.env.NODE_ENV === "production" &&
    resolveAttachmentStorageMode() !== "s3"
  ) {
    return {
      ok: false,
      status: 503,
      code: "storage_required",
      error:
        "Public document uploads require configured durable shared object storage",
    };
  }
  return { ok: true, userId: gate.session.user.id };
}
