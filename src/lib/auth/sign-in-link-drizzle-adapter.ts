import { and, eq, isNull } from "drizzle-orm";
import { randomBytes } from "crypto";
import { getDb } from "@/lib/db/client";
import { signInTokens } from "@/lib/db/schema/auth";
import type {
  ConsumeSignInResult,
  SignInToken,
  SignInTokenAdapter,
} from "./sign-in-link-adapter";

const DEFAULT_TTL_HOURS = 1;

function newId(): string {
  return `sit-${Date.now()}-${randomBytes(4).toString("hex")}`;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function mapRow(row: typeof signInTokens.$inferSelect): SignInToken {
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

export class DrizzleSignInTokenAdapter implements SignInTokenAdapter {
  async createToken(input: {
    email: string;
    userId: string;
    ttlHours?: number;
  }): Promise<SignInToken> {
    const db = getDb();
    const now = Date.now();
    const ttl = (input.ttlHours ?? DEFAULT_TTL_HOURS) * 60 * 60 * 1000;
    const email = input.email.trim().toLowerCase();
    const nowDate = new Date(now);

    await db
      .update(signInTokens)
      .set({ consumedAt: nowDate })
      .where(
        and(eq(signInTokens.email, email), isNull(signInTokens.consumedAt)),
      );

    const [row] = await db
      .insert(signInTokens)
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

  async getToken(token: string): Promise<SignInToken | null> {
    const db = getDb();
    const rows = await db
      .select()
      .from(signInTokens)
      .where(eq(signInTokens.token, token))
      .limit(1);
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async consumeToken(token: string): Promise<ConsumeSignInResult> {
    const existing = await this.getToken(token);
    if (!existing) return { ok: false, error: "not_found" };
    if (existing.consumedAt) return { ok: false, error: "consumed" };

    const db = getDb();
    const now = new Date();

    if (new Date(existing.expiresAt).getTime() < Date.now()) {
      await db
        .update(signInTokens)
        .set({ consumedAt: now })
        .where(
          and(
            eq(signInTokens.token, token),
            isNull(signInTokens.consumedAt),
          ),
        );
      return { ok: false, error: "expired" };
    }

    const updated = await db
      .update(signInTokens)
      .set({ consumedAt: now })
      .where(
        and(eq(signInTokens.token, token), isNull(signInTokens.consumedAt)),
      )
      .returning();

    if (!updated[0]) return { ok: false, error: "consumed" };
    return { ok: true, row: mapRow(updated[0]) };
  }
}
