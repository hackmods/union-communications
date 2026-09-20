import { eq, and } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import {
  platformPublicToolSettings,
  unionPublicToolSettings,
  localPublicToolSettings,
} from "@/lib/db/schema/public-tool-settings";
import type { PublicToolSettingsAdapter } from "./adapter";
import type { PublicToolSettingsRecord } from "./visibility";

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function mapRow(row: {
  disabledToolSlugs: string[];
  updatedById: string;
  updatedAt: Date;
}): PublicToolSettingsRecord {
  return {
    disabledToolSlugs: [...(row.disabledToolSlugs ?? [])],
    updatedById: row.updatedById,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class DrizzlePublicToolSettingsAdapter
  implements PublicToolSettingsAdapter
{
  async getPlatform(): Promise<PublicToolSettingsRecord> {
    const db = getDb();
    const rows = await db
      .select()
      .from(platformPublicToolSettings)
      .where(eq(platformPublicToolSettings.id, "default"))
      .limit(1);
    if (!rows[0]) {
      await db.insert(platformPublicToolSettings).values({
        id: "default",
        disabledToolSlugs: [],
        updatedById: "",
      });
      return {
        disabledToolSlugs: [],
        updatedById: "",
        updatedAt: new Date().toISOString(),
      };
    }
    return mapRow(rows[0]);
  }

  async setPlatform(
    disabledToolSlugs: string[],
    updatedById: string,
  ): Promise<PublicToolSettingsRecord> {
    const db = getDb();
    const updatedAt = new Date();
    await db
      .insert(platformPublicToolSettings)
      .values({
        id: "default",
        disabledToolSlugs,
        updatedById,
        updatedAt,
      })
      .onConflictDoUpdate({
        target: platformPublicToolSettings.id,
        set: { disabledToolSlugs, updatedById, updatedAt },
      });
    return {
      disabledToolSlugs: [...disabledToolSlugs],
      updatedById,
      updatedAt: updatedAt.toISOString(),
    };
  }

  async getUnion(unionId: string): Promise<PublicToolSettingsRecord | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(unionPublicToolSettings)
      .where(eq(unionPublicToolSettings.unionId, unionId))
      .limit(1);
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async setUnion(
    unionId: string,
    disabledToolSlugs: string[],
    updatedById: string,
  ): Promise<PublicToolSettingsRecord> {
    const db = getDb();
    const existing = await this.getUnion(unionId);
    const updatedAt = new Date();
    if (existing) {
      await db
        .update(unionPublicToolSettings)
        .set({ disabledToolSlugs, updatedById, updatedAt })
        .where(eq(unionPublicToolSettings.unionId, unionId));
    } else {
      await db.insert(unionPublicToolSettings).values({
        id: newId("upts"),
        unionId,
        disabledToolSlugs,
        updatedById,
        updatedAt,
      });
    }
    return {
      disabledToolSlugs: [...disabledToolSlugs],
      updatedById,
      updatedAt: updatedAt.toISOString(),
    };
  }

  async getLocal(
    unionId: string,
    localId: string,
  ): Promise<PublicToolSettingsRecord | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(localPublicToolSettings)
      .where(
        and(
          eq(localPublicToolSettings.unionId, unionId),
          eq(localPublicToolSettings.localId, localId),
        ),
      )
      .limit(1);
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async setLocal(
    unionId: string,
    localId: string,
    disabledToolSlugs: string[],
    updatedById: string,
  ): Promise<PublicToolSettingsRecord> {
    const db = getDb();
    const existing = await this.getLocal(unionId, localId);
    const updatedAt = new Date();
    if (existing) {
      await db
        .update(localPublicToolSettings)
        .set({ disabledToolSlugs, updatedById, updatedAt })
        .where(
          and(
            eq(localPublicToolSettings.unionId, unionId),
            eq(localPublicToolSettings.localId, localId),
          ),
        );
    } else {
      await db.insert(localPublicToolSettings).values({
        id: newId("lpts"),
        unionId,
        localId,
        disabledToolSlugs,
        updatedById,
        updatedAt,
      });
    }
    return {
      disabledToolSlugs: [...disabledToolSlugs],
      updatedById,
      updatedAt: updatedAt.toISOString(),
    };
  }
}
