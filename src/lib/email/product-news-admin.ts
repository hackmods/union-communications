import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { isPostgresConfigured } from "@/lib/db/client";
import type { RlsSessionContext } from "@/lib/db/rls-context";

export type ProductNewsAdminAccess = { actorId: string; rlsContext: RlsSessionContext };
export function productNewsJson(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  return Response.json(data, { ...init, headers });
}

export async function authorizeProductNewsAdmin(): Promise<
  { ok: true; access: ProductNewsAdminAccess } | { ok: false; response: Response }
> {
  const gate = await requireSiteAdminSession();
  if (!gate.ok) return { ok: false, response: productNewsJson({ error: gate.error }, { status: gate.status }) };
  if (!isPostgresConfigured()) return { ok: false, response: productNewsJson({ error: "Product-news evidence requires PostgreSQL." }, { status: 503 }) };
  return {
    ok: true,
    access: { actorId: gate.session.user.id, rlsContext: { userId: gate.session.user.id, mfaVerified: true } },
  };
}
