import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { UserRole } from "@/types/tenant";
import { canManageOfficerLearningReport } from "@/lib/officer-learning/access";
import {
  getOfficerLearningLocalSettings,
  listSharedCompletionsForLocal,
} from "@/lib/officer-learning/hub-store";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !session.user.unionId || !session.user.localId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canManageOfficerLearningReport(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = getOfficerLearningLocalSettings(
    session.user.unionId,
    session.user.localId,
  );
  const rows = listSharedCompletionsForLocal(
    session.user.unionId,
    session.user.localId,
  );

  return NextResponse.json({ settings, rows });
}
