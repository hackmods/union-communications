import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { isHostedCustomerMode } from "@/lib/auth/mfa-policy";
import { noteMfaDurableFallback } from "@/lib/auth/mfa-durable-fallback-signal";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { mfaRecoveryCodes } from "@/lib/db/schema/auth";
import { users } from "@/lib/db/schema/tenant";
import { withRlsContext } from "@/lib/db/rls-context";

const CODE_COUNT = 10;
const CODE_BYTES = 16;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

type MemoryRecoveryCode = { hash: string; usedAt: number | null };
const memoryCodes = new Map<string, MemoryRecoveryCode[]>();

function postgresRecoveryStoreEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    env.AUTH_USERS_BACKEND?.trim().toLowerCase() === "postgres" &&
    isPostgresConfigured(env)
  );
}

function assertStoreAvailable(env: NodeJS.ProcessEnv = process.env): void {
  if (isHostedCustomerMode(env) && !postgresRecoveryStoreEnabled(env)) {
    throw new Error(
      "Hosted customer MFA recovery requires durable Postgres storage.",
    );
  }
}

function formatCode(bytes: Buffer): string {
  const raw = Array.from(
    bytes,
    (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length],
  ).join("");
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
}

export function normalizeRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[\s-]/g, "");
}

export function hashRecoveryCode(code: string): string {
  return createHash("sha256")
    .update(normalizeRecoveryCode(code), "utf8")
    .digest("hex");
}

export function generateRecoveryCodes(): string[] {
  return Array.from({ length: CODE_COUNT }, () => formatCode(randomBytes(CODE_BYTES)));
}

function rotateInMemory(userId: string, hashes: string[], now: Date): void {
  const current = memoryCodes.get(userId) ?? [];
  for (const record of current) {
    if (record.usedAt === null) record.usedAt = now.getTime();
  }
  current.push(...hashes.map((hash) => ({ hash, usedAt: null })));
  memoryCodes.set(userId, current);
}

/** Replace the active code set; plaintext is returned to the caller exactly once. */
export async function rotateMfaRecoveryCodes(
  userId: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<string[]> {
  assertStoreAvailable(env);
  const codes = generateRecoveryCodes();
  const now = new Date();
  const hashes = codes.map(hashRecoveryCode);

  if (postgresRecoveryStoreEnabled(env)) {
    try {
      await withRlsContext({ userId }, async () => {
        const tx = getDb();
        // Serialize concurrent rotations against the owning account row so only
        // the last completed response contains the active set.
        await tx
          .select({ id: users.id })
          .from(users)
          .where(eq(users.id, userId))
          .for("update");
        await tx
          .update(mfaRecoveryCodes)
          .set({ usedAt: now })
          .where(
            and(
              eq(mfaRecoveryCodes.userId, userId),
              isNull(mfaRecoveryCodes.usedAt),
            ),
          );
        await tx.insert(mfaRecoveryCodes).values(
          hashes.map((codeHash) => ({
            id: randomUUID(),
            userId,
            codeHash,
            createdAt: now,
          })),
        );
        await tx
          .update(users)
          .set({ sessionVersion: sql`${users.sessionVersion} + 1` })
          .where(eq(users.id, userId));
      });
      return codes;
    } catch (error) {
      console.error(
        "[auth] MFA recovery codes Postgres rotate failed; using memory fallback",
        {
          userId,
          message: error instanceof Error ? error.message : String(error),
        },
      );
      noteMfaDurableFallback("recovery_codes");
      rotateInMemory(userId, hashes, now);
      return codes;
    }
  }

  rotateInMemory(userId, hashes, now);
  return codes;
}

/** Consume one code atomically so concurrent requests cannot reuse it. */
export async function consumeMfaRecoveryCode(
  userId: string,
  code: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<boolean> {
  assertStoreAvailable(env);
  const normalized = normalizeRecoveryCode(code);
  if (!/^[A-HJ-NP-Z2-9]{16}$/.test(normalized)) return false;
  const codeHash = hashRecoveryCode(normalized);

  if (postgresRecoveryStoreEnabled(env)) {
    return withRlsContext({ userId }, async () => {
      const rows = await getDb()
        .update(mfaRecoveryCodes)
        .set({ usedAt: new Date() })
        .where(
          and(
            eq(mfaRecoveryCodes.userId, userId),
            eq(mfaRecoveryCodes.codeHash, codeHash),
            isNull(mfaRecoveryCodes.usedAt),
          ),
        )
        .returning({ id: mfaRecoveryCodes.id });
      return rows.length === 1;
    });
  }

  const record = memoryCodes.get(userId)?.find(
    (candidate) => candidate.hash === codeHash && candidate.usedAt === null,
  );
  if (!record) return false;
  record.usedAt = Date.now();
  return true;
}

export async function countUnusedMfaRecoveryCodes(
  userId: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<number> {
  assertStoreAvailable(env);
  if (postgresRecoveryStoreEnabled(env)) {
    return withRlsContext({ userId }, async () => {
      const rows = await getDb()
        .select({ id: mfaRecoveryCodes.id })
        .from(mfaRecoveryCodes)
        .where(
          and(
            eq(mfaRecoveryCodes.userId, userId),
            isNull(mfaRecoveryCodes.usedAt),
          ),
        );
      return rows.length;
    });
  }
  return (
    memoryCodes.get(userId)?.filter((record) => record.usedAt === null).length ??
    0
  );
}

/** Mark every unused recovery code used (admin MFA reset). */
export async function invalidateAllMfaRecoveryCodes(
  userId: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<number> {
  assertStoreAvailable(env);
  const now = new Date();

  if (postgresRecoveryStoreEnabled(env)) {
    return withRlsContext({ userId }, async () => {
      const rows = await getDb()
        .update(mfaRecoveryCodes)
        .set({ usedAt: now })
        .where(
          and(
            eq(mfaRecoveryCodes.userId, userId),
            isNull(mfaRecoveryCodes.usedAt),
          ),
        )
        .returning({ id: mfaRecoveryCodes.id });
      return rows.length;
    });
  }

  const current = memoryCodes.get(userId) ?? [];
  let invalidated = 0;
  for (const record of current) {
    if (record.usedAt === null) {
      record.usedAt = now.getTime();
      invalidated += 1;
    }
  }
  memoryCodes.set(userId, current);
  return invalidated;
}

/** @internal test helper */
export function resetMfaRecoveryCodesForTests(): void {
  memoryCodes.clear();
}
