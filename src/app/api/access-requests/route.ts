import { NextResponse } from "next/server";
import { accessRequestStore } from "@/lib/access-requests/store";
import { accessRequestSchema } from "@/lib/access-requests/validation";
import { parseJsonBody } from "@/lib/validation/parse";
import { auditLog } from "@/lib/audit/store";
import { sendTransactionalEmail } from "@/lib/email/send";
import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { resolveAuthorizationActor } from "@/lib/authorization/resolve-actor";
import { decideCapability } from "@/lib/authorization/model";
import { withRlsContext } from "@/lib/db/rls-context";
import { accessRequestMemberView } from "@/types/access-request";

const buckets = new Map<string, number[]>();

function allowed(ip: string) {
  const now = Date.now();
  const recent = (buckets.get(ip) ?? []).filter((v) => now - v < 600000);
  if (recent.length >= 5) {
    buckets.set(ip, recent);
    return false;
  }
  recent.push(now);
  buckets.set(ip, recent);
  return true;
}

function operatorInboxHint(): string {
  const origin = process.env.AUTH_URL?.replace(/\/$/, "") ?? "";
  return origin
    ? `${origin}/en/app/site-admin/access-requests`
    : "/app/site-admin/access-requests";
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!allowed(ip)) {
    return NextResponse.json(
      { error: "Too many submissions. Try again later." },
      { status: 429 },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = parseJsonBody(accessRequestSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Please check the form fields.", issues: parsed.issues },
      { status: 400 },
    );
  }
  if (parsed.data.website?.trim()) {
    return NextResponse.json({ ok: true });
  }

  const row = await accessRequestStore.create(parsed.data);
  await auditLog.log({
    userId: "anonymous",
    action: "access_request.submit",
    resourceType: "access_request",
    resourceId: row.id,
    metadata: { kind: row.kind, locale: row.locale },
  });

  const notify = process.env.ACCESS_REQUEST_NOTIFY_EMAIL?.trim();
  if (notify) {
    const sent = await sendTransactionalEmail({
      to: notify,
      subject: `UnionOps beta access request (${row.kind})`,
      text: [
        "A new UnionOps beta access request is ready in the platform inbox.",
        `id=${row.id}`,
        `kind=${row.kind}`,
        `name=${row.name}`,
        `email=${row.email}`,
        `union=${row.unionName}`,
        `local=${row.localName}`,
        row.role ? `role=${row.role}` : null,
        `offerings=${row.offerings.join(",")}`,
        row.message ? `message=${row.message}` : null,
        `inbox=${operatorInboxHint()}`,
      ]
        .filter(Boolean)
        .join("\n"),
    });
    if (sent.ok) {
      await accessRequestStore.update(row.id, {
        notifySentAt: new Date().toISOString(),
      });
    } else {
      await accessRequestStore.update(row.id, {
        notificationError: sent.reason,
      });
    }
  }

  const receipt = await sendTransactionalEmail({
    to: row.email,
    subject: "UnionOps beta access request received",
    text: "We received your UnionOps beta access request. We’ll review the details and follow up. This message does not create an account or enroll anyone in a union.",
  });
  if (receipt.ok) {
    await accessRequestStore.update(row.id, {
      receiptSentAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!sessionMfaOk(session)) {
    return NextResponse.json({ error: "MFA required" }, { status: 403 });
  }
  const actor = await resolveAuthorizationActor(session);
  const unionId = session.user.unionId;
  // Prefer resolved active local; fall back to JWT local for role-claim bridge
  // accounts before membership rows exist.
  const localId = actor.activeLocalId ?? session.user.localId;
  if (
    !unionId ||
    !localId ||
    !decideCapability(actor, "memberships.manage", { unionId, localId }).allowed
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const rows = await withRlsContext(
    { userId: session.user.id, unionId, localId, mfaVerified: true },
    () =>
      accessRequestStore.list({
        unionId,
        localId,
        kind: "member_access",
      }),
  );
  return NextResponse.json({ items: rows.map(accessRequestMemberView) });
}
