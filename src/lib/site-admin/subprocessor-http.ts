import { isPostgresConfigured } from "@/lib/db/client";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import type { RlsSessionContext } from "@/lib/db/rls-context";

export function noStoreJson(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  return Response.json(data, { ...init, headers });
}

export async function authorizeSubprocessorAdmin(): Promise<
  | { ok: true; actorId: string; rlsContext: RlsSessionContext }
  | { ok: false; response: Response }
> {
  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    return {
      ok: false,
      response: noStoreJson({ error: gate.error }, { status: gate.status }),
    };
  }
  if (!isPostgresConfigured()) {
    return {
      ok: false,
      response: noStoreJson(
        { error: "The subprocessor register requires durable PostgreSQL storage." },
        { status: 503 },
      ),
    };
  }
  return {
    ok: true,
    actorId: gate.session.user.id,
    // requireSiteAdminSession has already required a valid MFA-backed session.
    rlsContext: { userId: gate.session.user.id, mfaVerified: true },
  };
}
