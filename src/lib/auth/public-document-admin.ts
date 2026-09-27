import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { isMfaEnabled } from "@/lib/auth/mfa-policy";
import { isPostgresConfigured } from "@/lib/db/client";
import { resolveAttachmentStorageMode } from "@/lib/attachments/storage";

/** Public publication is a platform operation and never follows a union brand role. */
export async function requirePublicDocumentAdmin() {
  const gate = await requireSiteAdminSession();
  if (!gate.ok) return gate;
  if (!isMfaEnabled()) return { ok: false as const, status: 403 as const, error: "Enable host MFA before publishing public documents" };
  if (!isPostgresConfigured()) return { ok: false as const, status: 503 as const, error: "Public document management requires Postgres" };
  if (process.env.NODE_ENV === "production" && resolveAttachmentStorageMode() !== "s3") {
    return { ok: false as const, status: 503 as const, error: "Public document uploads require configured durable shared object storage" };
  }
  return { ok: true as const, userId: gate.session.user.id };
}
