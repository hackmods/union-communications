import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getHubPreferences,
  hubSettingsKey,
  saveHubPreferences,
} from "@/lib/hub-settings/store";
import { parseJsonBody } from "@/lib/validation/parse";
import { preferencesPutSchema } from "@/lib/validation/hub-settings";

/** Authenticated preferences persistence for `ApiAdapter` (Hub context only). */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const key = hubSettingsKey(session.user.id, session.user.unionId);
  const preferences = getHubPreferences(key);
  return NextResponse.json({ preferences });
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

  const parsed = parseJsonBody(preferencesPutSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const key = hubSettingsKey(session.user.id, session.user.unionId);
  saveHubPreferences(key, parsed.data.preferences);
  return NextResponse.json({ preferences: parsed.data.preferences });
}
