import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { UserRole } from "@/types/tenant";
import { canManageOfficerLearningReport } from "@/lib/officer-learning/access";
import {
  getOfficerLearningLocalSettings,
  saveOfficerLearningLocalSettings,
} from "@/lib/officer-learning/hub-store";
import { parseJsonBody } from "@/lib/validation/parse";
import { officerLearningLocalSettingsPutSchema } from "@/lib/validation/officer-learning";

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
  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.unionId || !session.user.localId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const roles = (session.user.roles ?? []) as UserRole[];
  if (!canManageOfficerLearningReport(roles)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseJsonBody(officerLearningLocalSettingsPutSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const settings = saveOfficerLearningLocalSettings({
    unionId: session.user.unionId,
    localId: session.user.localId,
    reportingEnabled: parsed.data.reportingEnabled,
    updatedById: session.user.id,
    updatedAt: new Date().toISOString(),
  });

  return NextResponse.json({ settings });
}
