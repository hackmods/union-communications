import { NextResponse } from "next/server";
import { accessRequestStore } from "@/lib/access-requests/store";
import { accessRequestSchema, toNewAccessRequest } from "@/lib/access-requests/validation";
import {
  ACCESS_REQUEST_RETRY_AFTER_SECONDS,
  checkAccessRequestEmailRateLimit,
  checkAccessRequestRateLimit,
  extractAccessRequestClientIp,
} from "@/lib/access-requests/rate-limit";
import { parseJsonBody } from "@/lib/validation/parse";
import { auditLog } from "@/lib/audit/store";
import { sendTransactionalEmail } from "@/lib/email/send";
import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { resolveAuthorizationActor } from "@/lib/authorization/resolve-actor";
import { decideCapability } from "@/lib/authorization/model";
import { withRlsContext } from "@/lib/db/rls-context";
import { accessRequestMemberView } from "@/types/access-request";
import { reportApiFailure } from "@/lib/observability/report-server-error";

function operatorInboxHint(locale = "en"): string {
  const origin = process.env.AUTH_URL?.replace(/\/$/, "") ?? "";
  const loc = locale === "fr" ? "fr" : "en";
  return origin
    ? `${origin}/${loc}/app/site-admin/access-requests`
    : `/app/site-admin/access-requests`;
}

export async function POST(request: Request) {
  const ip = extractAccessRequestClientIp(request);

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

  if (!checkAccessRequestRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many submissions. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(ACCESS_REQUEST_RETRY_AFTER_SECONDS) },
      },
    );
  }
  if (!checkAccessRequestEmailRateLimit(parsed.data.email)) {
    return NextResponse.json(
      { error: "Too many submissions. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(ACCESS_REQUEST_RETRY_AFTER_SECONDS) },
      },
    );
  }

  let row;
  try {
    row = await accessRequestStore.create(toNewAccessRequest(parsed.data));
  } catch (error) {
    reportApiFailure(error, "POST /api/access-requests");
    return NextResponse.json(
      {
        error:
          "We could not save your request. Try again in a moment. If it keeps failing, use the Support page.",
      },
      { status: 503 },
    );
  }

  // The row is already stored. Receipt mail, operator notify, and RLS-blocked
  // stamp updates must not turn a successful submit into an error page.
  try {
    await auditLog.log({
      userId: "anonymous",
      action: "access_request.submit",
      resourceType: "access_request",
      resourceId: row.id,
      metadata: { kind: row.kind, locale: row.locale },
    });
  } catch (error) {
    reportApiFailure(error, "POST /api/access-requests audit");
  }

  try {
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
          `inbox=${operatorInboxHint(row.locale)}`,
        ]
          .filter(Boolean)
          .join("\n"),
      });
      try {
        if (sent.ok) {
          await accessRequestStore.update(row.id, {
            notifySentAt: new Date().toISOString(),
          });
        } else {
          await accessRequestStore.update(row.id, {
            notificationError: sent.reason,
          });
        }
      } catch (error) {
        reportApiFailure(error, "POST /api/access-requests notify stamp");
      }
    }

    const receipt = await sendTransactionalEmail({
      to: row.email,
      subject: "UnionOps beta access request received",
      text: "We received your UnionOps beta access request. We’ll review the details and follow up. This message does not create an account or enroll anyone in a union.",
    });
    if (receipt.ok) {
      try {
        await accessRequestStore.update(row.id, {
          receiptSentAt: new Date().toISOString(),
        });
      } catch (error) {
        reportApiFailure(error, "POST /api/access-requests receipt stamp");
      }
    }
  } catch (error) {
    reportApiFailure(error, "POST /api/access-requests notify");
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
