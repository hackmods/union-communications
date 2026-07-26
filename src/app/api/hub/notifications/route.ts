import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { hubNotificationStore } from "@/lib/hub/notifications/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { markHubNotificationsReadSchema } from "@/lib/validation/discussions";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.unionId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!sessionMfaOk(session)) {
    return NextResponse.json({ error: "MFA required" }, { status: 403 });
  }

  const unreadOnly = new URL(request.url).searchParams.get("unread") === "1";
  const notifications = await hubNotificationStore.listForUser(
    session.user.id,
    session.user.unionId,
    { unreadOnly },
  );

  return NextResponse.json({ notifications });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!sessionMfaOk(session)) {
    return NextResponse.json({ error: "MFA required" }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseJsonBody(markHubNotificationsReadSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const marked = await hubNotificationStore.markRead(
    session.user.id,
    parsed.data.ids,
  );
  return NextResponse.json({ marked });
}
