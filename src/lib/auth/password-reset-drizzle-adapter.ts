import { and, eq, isNull } from "drizzle-orm";
import { randomBytes } from "crypto";
import { getDb } from "@/lib/db/client";
import { passwordResetTokens } from "@/lib/db/schema/auth";
import type {
  ConsumePasswordResetResult,
  PasswordResetAdapter,
  PasswordResetToken,
} from "./password-reset-adapter";

const DEFAULT_TTL_HOURS = 2;

function newId(): string {
  return `pwr-${Date.now()}-${randomBytes(4).toString("hex")}`;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function mapRow(
  row: typeof passwordResetTokens.$inferSelect,
): PasswordResetToken {
  return {
    id: row.id,
    token: row.token,
    email: row.email,
    userId: row.userId,
    expiresAt: toIso(row.expiresAt),
    createdAt: toIso(row.createdAt),
    consumedAt: row.consumedAt ? toIso(row.consumedAt) : undefined,
  };
}

/**
 * Durable password-reset tokens when AUTH_USERS_BACKEND=postgres.
 */
export class DrizzlePasswordResetAdapter implements PasswordResetAdapter {
  async createToken(input: {
    email: string;
    userId: string;
    ttlHours?: number;
  }): Promise<PasswordResetToken> {
    const db = getDb();
    const now = Date.now();
    const ttl = (input.ttlHours ?? DEFAULT_TTL_HOURS) * 60 * 60 * 1000;
    const email = input.email.trim().toLowerCase();
    const nowDate = new Date(now);

    await db
      .update(passwordResetTokens)
      .set({ consumedAt: nowDate })
      .where(
        and(
          eq(passwordResetTokens.email, email),
          isNull(passwordResetTokens.consumedAt),
        ),
      );

    const [row] = await db
      .insert(passwordResetTokens)
      .values({
        id: newId(),
        token: randomBytes(24).toString("base64url"),
        email,
        userId: input.userId,
        expiresAt: new Date(now + ttl),
        createdAt: nowDate,
      })
      .returning();

    return mapRow(row);
  }

  async getToken(token: string): Promise<PasswordResetToken | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token))
      .limit(1);
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async consumeToken(token: string): Promise<ConsumePasswordResetResult> {
    const existing = await this.getToken(token);
    if (!existing) return { ok: false, error: "not_found" };
    if (existing.consumedAt) return { ok: false, error: "consumed" };

    const db = getDb();
    const now = new Date();

    if (new Date(existing.expiresAt).getTime() < Date.now()) {
      await db
        .update(passwordResetTokens)
        .set({ consumedAt: now })
        .where(
          and(
            eq(passwordResetTokens.token, token),
            isNull(passwordResetTokens.consumedAt),
          ),
        );
      return { ok: false, error: "expired" };
    }

    const updated = await db
      .update(passwordResetTokens)
      .set({ consumedAt: now })
      .where(
        and(
          eq(passwordResetTokens.token, token),
          isNull(passwordResetTokens.consumedAt),
        ),
      )
      .returning();

    if (!updated[0]) return { ok: false, error: "consumed" };
    return { ok: true, row: mapRow(updated[0]) };
  }
}
