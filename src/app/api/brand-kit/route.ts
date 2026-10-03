import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { rlsContextForSession } from "@/lib/auth/rls-scope";
import { withRlsContext } from "@/lib/db/rls-context";
import {
  clearPersonalBrandKit,
  resolveHubBrandKit,
  writeHubBrandKit,
  type BrandKitWriteScope,
} from "@/lib/hub-settings/store";
import { syncPreferredLibraryFromCollectionCode } from "@/lib/snippets/preferred-library";
import { parseJsonBody } from "@/lib/validation/parse";
import { brandKitPutSchema } from "@/lib/validation/hub-settings";
import type { BrandKit } from "@/types/entities";
import type { UserRole } from "@/types/tenant";

/**
 * Authenticated Brand Kit persistence for `ApiAdapter`.
 * Hybrid: Local shared defaults + personal overlay. Public Comms tools stay on
 * LocalStorageAdapter unless the session opts into ApiAdapter.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ctx = {
    userId: session.user.id,
    unionId: session.user.unionId,
    localId: session.user.localId,
    roles: session.user.roles as UserRole[] | undefined,
  };
  const rlsCtx = (await rlsContextForSession(session)) ?? {
    userId: session.user.id,
    unionId: session.user.unionId,
    localId: session.user.localId,
  };
  const record = await withRlsContext(rlsCtx, () => resolveHubBrandKit(ctx));
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

  const scope = (parsed.data.scope ?? "personal") as BrandKitWriteScope;
  const ctx = {
    userId: session.user.id,
    unionId: session.user.unionId,
    localId: session.user.localId,
    roles: session.user.roles as UserRole[] | undefined,
  };
  const rlsCtx = (await rlsContextForSession(session)) ?? {
    userId: session.user.id,
    unionId: session.user.unionId,
    localId: session.user.localId,
  };

  try {
    const record = await withRlsContext(rlsCtx, () =>
      writeHubBrandKit(ctx, {
        scope,
        ...(parsed.data.brandKit !== undefined
          ? { brandKit: parsed.data.brandKit as BrandKit | null }
          : {}),
        ...(parsed.data.onboardingComplete !== undefined
          ? { onboardingComplete: parsed.data.onboardingComplete }
          : {}),
      }),
    );

    const unionId = session.user.unionId;
    const localId = session.user.localId;
    const kit = record.brandKit;
    if (unionId && localId && kit) {
      const active = kit.profiles?.find((p) => p.id === kit.activeProfileId);
      const code =
        active?.bargainingUnitCode ?? kit.local?.bargainingUnitCode ?? null;
      if (code) {
        syncPreferredLibraryFromCollectionCode(
          unionId,
          localId,
          code,
          session.user.bargainingUnitId,
        );
      }
    }

    return NextResponse.json(record);
  } catch (err) {
    if (err instanceof Error && err.message === "forbidden_local_write") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw err;
  }
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ctx = {
    userId: session.user.id,
    unionId: session.user.unionId,
    localId: session.user.localId,
    roles: session.user.roles as UserRole[] | undefined,
  };
  const rlsCtx = (await rlsContextForSession(session)) ?? {
    userId: session.user.id,
    unionId: session.user.unionId,
    localId: session.user.localId,
  };
  // Clear personal overlay only — never wipe Local shared defaults.
  const record = await withRlsContext(rlsCtx, () =>
    clearPersonalBrandKit(ctx),
  );
  return NextResponse.json(record);
}
