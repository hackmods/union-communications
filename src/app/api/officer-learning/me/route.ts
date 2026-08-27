import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { parseJsonBody } from "@/lib/validation/parse";
import { officerLearningMePutSchema } from "@/lib/validation/officer-learning";
import {
  getOfficerLearningUser,
  upsertOfficerLearningUser,
} from "@/lib/officer-learning/hub-store";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !session.user.unionId || !session.user.localId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const record = getOfficerLearningUser(session.user.unionId, session.user.id);
  return NextResponse.json({
    record:
      record ??
      ({
        userId: session.user.id,
        unionId: session.user.unionId,
        localId: session.user.localId,
        displayName: session.user.name ?? "",
        hubSyncEnabled: false,
        shareWithLocal: false,
        modules: {},
        updatedAt: null,
      } as const),
  });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.unionId || !session.user.localId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseJsonBody(officerLearningMePutSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const record = upsertOfficerLearningUser({
    userId: session.user.id,
    unionId: session.user.unionId,
    localId: session.user.localId,
    displayName: parsed.data.displayName,
    hubSyncEnabled: parsed.data.hubSyncEnabled,
    shareWithLocal: parsed.data.shareWithLocal,
    modules: parsed.data.modules,
  });

  return NextResponse.json({ record });
}
