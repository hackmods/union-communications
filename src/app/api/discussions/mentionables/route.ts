import { NextResponse } from "next/server";
import { requireDiscussionsSession } from "@/lib/auth/discussions-session";
import { listMentionableHubUsers } from "@/lib/hub/mentionables";

export async function GET() {
  const authResult = await requireDiscussionsSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  if (!session.user.unionId) {
    return NextResponse.json({ users: [] });
  }

  const users = await listMentionableHubUsers({
    unionId: session.user.unionId,
    localId: session.user.localId ?? undefined,
    accessibleLocalIds: session.user.accessibleLocalIds ?? undefined,
  });

  return NextResponse.json({ users });
}
