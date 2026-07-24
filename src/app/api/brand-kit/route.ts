import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getHubBrandKitRecord,
  hubSettingsKey,
  saveHubBrandKitRecord,
} from "@/lib/hub-settings/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { brandKitPutSchema } from "@/lib/validation/hub-settings";

/**
 * Authenticated Brand Kit persistence for `ApiAdapter` (Hub context only).
 * Public Comms tools stay on `LocalStorageAdapter` for data sovereignty —
 * this route is never called from the public canvas tools.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const key = hubSettingsKey(session.user.id, session.user.unionId);
  const record = getHubBrandKitRecord(key);
  return NextResponse.json(record);
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseJsonBody(brandKitPutSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const key = hubSettingsKey(session.user.id, session.user.unionId);
  const record = saveHubBrandKitRecord(key, {
    ...(parsed.data.brandKit !== undefined
      ? { brandKit: parsed.data.brandKit as import("@/types/entities").BrandKit | null }
      : {}),
    ...(parsed.data.onboardingComplete !== undefined
      ? { onboardingComplete: parsed.data.onboardingComplete }
      : {}),
  });
  return NextResponse.json(record);
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const key = hubSettingsKey(session.user.id, session.user.unionId);
  const record = saveHubBrandKitRecord(key, { brandKit: null });
  return NextResponse.json(record);
}
