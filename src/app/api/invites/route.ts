import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { createInvite } from "@/lib/auth/invites";
import type { UserRole } from "@/types/tenant";
import { parseJsonBody } from "@/lib/validation/parse";

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(200),
  roles: z.array(z.string()).min(1),
  localId: z.string().optional(),
  divisionId: z.string().optional(),
  bargainingUnitId: z.string().optional(),
});

const INVITE_ROLES = new Set([
  "union_admin",
  "division_admin",
  "local_president",
  "platform_admin",
]);

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const roles = session.user.roles ?? [];
  if (!roles.some((r) => INVITE_ROLES.has(r))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session.user.unionId) {
    return NextResponse.json({ error: "Missing union context" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = parseJsonBody(createSchema, body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.issues },
      { status: 400 },
    );
  }

  const invite = createInvite({
    email: parsed.data.email,
    name: parsed.data.name,
    unionId: session.user.unionId,
    localId: parsed.data.localId ?? session.user.localId,
    divisionId: parsed.data.divisionId ?? session.user.divisionId,
    bargainingUnitId:
      parsed.data.bargainingUnitId ?? session.user.bargainingUnitId,
    roles: parsed.data.roles as UserRole[],
    invitedById: session.user.id,
  });

  // Email delivery is deferred until transactional email (ROADMAP). Return token for ops/dev.
  return NextResponse.json({
    id: invite.id,
    email: invite.email,
    expiresAt: invite.expiresAt,
    acceptPath: `/app/invite/${invite.token}`,
    token: invite.token,
  });
}
