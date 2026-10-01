import { NextResponse } from "next/server";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";

export type OutreachAdminAccess =
  | { ok: false; response: NextResponse }
  | {
      ok: true;
      access: {
        actorId: string;
        rlsContext: {
          userId: string;
          platformAdmin: true;
          mfaVerified: true;
        };
      };
    };

export async function authorizeOutreachListsAdmin(): Promise<OutreachAdminAccess> {
  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    return {
      ok: false,
      response: NextResponse.json({ error: gate.error }, { status: gate.status }),
    };
  }
  if (!sessionMfaOk(gate.session)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "MFA required" }, { status: 403 }),
    };
  }
  return {
    ok: true,
    access: {
      actorId: gate.session.user.id,
      rlsContext: {
        userId: gate.session.user.id,
        platformAdmin: true,
        mfaVerified: true,
      },
    },
  };
}

export function outreachAdminJson(
  body: unknown,
  init?: { status?: number; headers?: HeadersInit },
): NextResponse {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "private, no-store");
  return NextResponse.json(body, { status: init?.status ?? 200, headers });
}
