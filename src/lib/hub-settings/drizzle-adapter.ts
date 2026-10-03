import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { localBrandKits, userBrandOverlays } from "@/lib/db/schema";
import { normalizeBrandKit } from "@/lib/utils/local-links";
import type { BrandKit, BrandKitPatch } from "@/types/entities";
import type {
  HubBrandSettingsAdapter,
  PersonalBrandRecord,
} from "./adapter";
import { durableUnionId } from "./keys";

export class DrizzleHubBrandSettingsAdapter implements HubBrandSettingsAdapter {
  async getLocalBrandKit(
    unionId: string,
    localId: string,
  ): Promise<BrandKit | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(localBrandKits)
      .where(
        and(
          eq(localBrandKits.unionId, unionId),
          eq(localBrandKits.localId, localId),
        ),
      )
      .limit(1);
    const row = rows[0];
    return row ? normalizeBrandKit(row.brandKit) : null;
  }

  async saveLocalBrandKit(
    unionId: string,
    localId: string,
    kit: BrandKit,
    updatedBy: string,
  ): Promise<BrandKit> {
    const db = getDb();
    const next = normalizeBrandKit({
      ...kit,
      updatedAt: new Date().toISOString(),
    });
    const updatedAt = new Date(next.updatedAt);
    await db
      .insert(localBrandKits)
      .values({
        unionId,
        localId,
        brandKit: next,
        updatedAt,
        updatedBy,
      })
      .onConflictDoUpdate({
        target: [localBrandKits.unionId, localBrandKits.localId],
        set: {
          brandKit: next,
          updatedAt,
          updatedBy,
        },
      });
    return next;
  }

  async deleteLocalBrandKit(unionId: string, localId: string): Promise<void> {
    const db = getDb();
    await db
      .delete(localBrandKits)
      .where(
        and(
          eq(localBrandKits.unionId, unionId),
          eq(localBrandKits.localId, localId),
        ),
      );
  }

  async getPersonalBrandRecord(
    userId: string,
    unionId?: string,
  ): Promise<PersonalBrandRecord> {
    const db = getDb();
    const uid = durableUnionId(unionId);
    const rows = await db
      .select()
      .from(userBrandOverlays)
      .where(
        and(
          eq(userBrandOverlays.unionId, uid),
          eq(userBrandOverlays.userId, userId),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) {
      return { overlay: {}, onboardingComplete: false };
    }
    return {
      overlay: (row.overlay ?? {}) as BrandKitPatch,
      onboardingComplete: row.onboardingComplete,
    };
  }

  async savePersonalBrandRecord(
    userId: string,
    unionId: string | undefined,
    patch: {
      overlay?: BrandKitPatch;
      onboardingComplete?: boolean;
    },
  ): Promise<PersonalBrandRecord> {
    const db = getDb();
    const uid = durableUnionId(unionId);
    const existing = await this.getPersonalBrandRecord(userId, unionId);
    const next: PersonalBrandRecord = {
      overlay: patch.overlay !== undefined ? patch.overlay : existing.overlay,
      onboardingComplete:
        patch.onboardingComplete !== undefined
          ? patch.onboardingComplete
          : existing.onboardingComplete,
    };
    const updatedAt = new Date();
    await db
      .insert(userBrandOverlays)
      .values({
        unionId: uid,
        userId,
        overlay: next.overlay,
        onboardingComplete: next.onboardingComplete,
        updatedAt,
      })
      .onConflictDoUpdate({
        target: [userBrandOverlays.unionId, userBrandOverlays.userId],
        set: {
          overlay: next.overlay,
          onboardingComplete: next.onboardingComplete,
          updatedAt,
        },
      });
    return next;
  }

  resetForTests(): void {
    // No in-process state — tests that need Postgres isolation truncate tables.
  }
}
