import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  readDatabaseBootAttestation,
  UNKNOWN_DATABASE_BOOT,
} from "@/lib/ops/database-boot";

const originalPath = process.env.DB_BOOT_ATTESTATION_PATH;
const temporaryDirectories: string[] = [];

afterEach(() => {
  if (originalPath === undefined) delete process.env.DB_BOOT_ATTESTATION_PATH;
  else process.env.DB_BOOT_ATTESTATION_PATH = originalPath;
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("database boot attestation", () => {
  it("fails closed when the attestation is absent or malformed", () => {
    process.env.DB_BOOT_ATTESTATION_PATH = join(tmpdir(), "missing-unionops-boot.json");
    expect(readDatabaseBootAttestation()).toEqual(UNKNOWN_DATABASE_BOOT);
  });

  it("reads only a successful versioned Postgres attestation", () => {
    const directory = mkdtempSync(join(tmpdir(), "unionops-boot-test-"));
    temporaryDirectories.push(directory);
    const path = join(directory, "boot.json");
    process.env.DB_BOOT_ATTESTATION_PATH = path;
    writeFileSync(
      path,
      JSON.stringify({
        version: 1,
        mode: "postgres",
        verified: true,
        verifiedAt: "2026-09-20T00:00:00.000Z",
        journalSchema: "drizzle",
        tailTag: "0036_verified_boot_reconcile",
        tailIdx: 36,
        tailCreatedAt: 1789875000000,
        contractVersion: 1,
        tables: 60,
        columns: 697,
        policies: 43,
      }),
    );
    expect(readDatabaseBootAttestation()).toMatchObject({
      mode: "postgres",
      verified: true,
      journalSchema: "drizzle",
      tailTag: "0036_verified_boot_reconcile",
      tailIdx: 36,
    });
  });
});
