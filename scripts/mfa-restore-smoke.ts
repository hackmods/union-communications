/**
 * Live MFA backup/restore drill.
 *
 * Encrypts a TOTP secret, pg_dump's the database, pg_restore's into a scratch
 * database, then decrypts and verifies a live authenticator code.
 *
 * Requires:
 *   - DATABASE_URL (table-owner URL; needs CREATEDB)
 *   - AUTH_TOTP_ENCRYPTION_KEY (generated for this process if unset)
 *   - pg_dump + pg_restore on PATH, or Docker Compose db service
 *
 * Run: npm run db:mfa-restore-smoke
 */
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import postgres from "postgres";
import { generateTotp, verifyTotp } from "../src/lib/auth/totp";
import {
  decryptTotpSecret,
  encryptTotpSecret,
  isEncryptedTotpSecret,
} from "../src/lib/auth/totp-secret-crypto";
import { isPostgresConfigured } from "../src/lib/db/client";

const SMOKE_USER_ID = "user-mfa-restore-smoke";
const SMOKE_EMAIL = "mfa-restore-smoke@unionops.test";
const PLAIN_SECRET = "JBSWY3DPEHPK3PXP";
const COMPOSE = [
  "compose",
  "-f",
  "docker/docker-compose.yml",
  "exec",
  "-T",
  "db",
] as const;

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url || !isPostgresConfigured()) {
    throw new Error("DATABASE_URL is required");
  }
  return url;
}

function ensureEncryptionKey(): void {
  if (process.env.AUTH_TOTP_ENCRYPTION_KEY?.trim()) return;
  process.env.AUTH_TOTP_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  console.log(
    "[mfa-restore-smoke] generated a throwaway AUTH_TOTP_ENCRYPTION_KEY for this drill",
  );
}

function withDatabase(url: string, name: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${name}`;
  return parsed.toString();
}

function sourceDatabaseName(url: string): string {
  const parsed = new URL(url);
  return decodeURIComponent(parsed.pathname.replace(/^\//, "") || "unionops");
}

function run(
  command: string,
  args: string[],
  options: { encoding?: "utf8" | "buffer" } = {},
): { ok: boolean; stderr: string; stdout: Buffer | string } {
  const result = spawnSync(command, args, {
    env: process.env,
    encoding: options.encoding === "buffer" ? undefined : "utf8",
  });
  return {
    ok: result.status === 0,
    stderr:
      typeof result.stderr === "string"
        ? result.stderr
        : result.stderr?.toString("utf8") ?? "",
    stdout: (result.stdout ?? (options.encoding === "buffer" ? Buffer.alloc(0) : "")) as
      | Buffer
      | string,
  };
}

function dumpAndRestore(sourceUrl: string, restoreName: string, dumpFile: string): void {
  const dump = run("pg_dump", ["--format=custom", "--file", dumpFile, sourceUrl]);
  if (dump.ok) {
    const restoreUrl = withDatabase(sourceUrl, restoreName);
    const restored = run("pg_restore", [
      "--clean",
      "--if-exists",
      "--no-owner",
      `--dbname=${restoreUrl}`,
      dumpFile,
    ]);
    if (!restored.ok) {
      throw new Error(`pg_restore failed: ${restored.stderr}`);
    }
    return;
  }

  const dockerDump = run(
    "docker",
    [...COMPOSE, "pg_dump", "-U", "unionops", "-Fc", "unionops"],
    { encoding: "buffer" },
  );
  if (!dockerDump.ok || !Buffer.isBuffer(dockerDump.stdout) || dockerDump.stdout.length === 0) {
    throw new Error(
      `pg_dump is not on PATH (${dump.stderr.trim() || "missing"}) and docker compose exec db pg_dump failed (${dockerDump.stderr.trim()}). Install PostgreSQL client tools or start docker/docker-compose.yml db.`,
    );
  }
  writeFileSync(dumpFile, dockerDump.stdout);
  const copied = run("docker", [
    "compose",
    "-f",
    "docker/docker-compose.yml",
    "cp",
    dumpFile,
    "db:/tmp/unionops-mfa-restore.dump",
  ]);
  if (!copied.ok) {
    throw new Error(`docker compose cp dump failed: ${copied.stderr}`);
  }
  const dockerRestore = run("docker", [
    ...COMPOSE,
    "pg_restore",
    "-U",
    "unionops",
    "--clean",
    "--if-exists",
    "--no-owner",
    "--dbname",
    restoreName,
    "/tmp/unionops-mfa-restore.dump",
  ]);
  if (!dockerRestore.ok) {
    throw new Error(`docker pg_restore failed: ${dockerRestore.stderr}`);
  }
}

async function main(): Promise<void> {
  const sourceUrl = requireDatabaseUrl();
  ensureEncryptionKey();
  const sourceName = sourceDatabaseName(sourceUrl);
  const restoreName = `${sourceName}_mfa_restore_smoke`;
  const restoreUrl = withDatabase(sourceUrl, restoreName);
  const admin = postgres(withDatabase(sourceUrl, "postgres"), { max: 1 });
  const source = postgres(sourceUrl, { max: 1 });

  try {
    const sealed = encryptTotpSecret(PLAIN_SECRET, SMOKE_USER_ID, process.env);
    if (!isEncryptedTotpSecret(sealed)) {
      throw new Error("expected ciphertext totp_secret for restore drill");
    }

    await source`
      insert into users (
        id, email, name, password_hash, roles, totp_secret, mfa_enabled, session_version, is_demo
      ) values (
        ${SMOKE_USER_ID},
        ${SMOKE_EMAIL},
        ${"MFA restore smoke"},
        ${"smoke-not-a-login"},
        '["solo_account"]'::jsonb,
        ${sealed},
        true,
        0,
        true
      )
      on conflict (id) do update set
        totp_secret = excluded.totp_secret,
        mfa_enabled = true
    `;

    const stored = await source<{ totp_secret: string | null }[]>`
      select totp_secret from users where id = ${SMOKE_USER_ID}
    `;
    if (!stored[0]?.totp_secret || !isEncryptedTotpSecret(stored[0].totp_secret)) {
      throw new Error("users.totp_secret was not stored as ciphertext");
    }

    await admin.unsafe(`drop database if exists "${restoreName}" with (force)`);
    await admin.unsafe(`create database "${restoreName}"`);

    const tmp = mkdtempSync(join(tmpdir(), "unionops-mfa-restore-"));
    const dumpFile = join(tmp, "unionops.dump");
    try {
      dumpAndRestore(sourceUrl, restoreName, dumpFile);
      const restored = postgres(restoreUrl, { max: 1 });
      try {
        const rows = await restored<{ totp_secret: string | null }[]>`
          select totp_secret from users where id = ${SMOKE_USER_ID}
        `;
        const ciphertext = rows[0]?.totp_secret;
        if (!ciphertext) {
          throw new Error("restored database is missing the smoke user TOTP secret");
        }
        const plain = decryptTotpSecret(ciphertext, SMOKE_USER_ID, process.env);
        if (!verifyTotp(plain, generateTotp(PLAIN_SECRET))) {
          throw new Error("restored TOTP secret did not verify a live authenticator code");
        }
      } finally {
        await restored.end();
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }

    console.log(
      "[mfa-restore-smoke] ok — encrypted TOTP secret survived pg_dump/pg_restore and still verifies",
    );
  } finally {
    await source`delete from users where id = ${SMOKE_USER_ID}`;
    await admin.unsafe(`drop database if exists "${restoreName}" with (force)`);
    await source.end();
    await admin.end();
  }
}

main().catch((err) => {
  console.error("[mfa-restore-smoke] failed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
