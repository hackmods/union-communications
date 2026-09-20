import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export type DatabaseBootAttestation = {
  version: 1;
  mode: "memory" | "postgres" | "unknown";
  verified: boolean;
  verifiedAt: string | null;
  journalSchema: string | null;
  tailTag: string | null;
  tailIdx: number | null;
  tailCreatedAt: number | null;
  contractVersion: number | null;
  tables: number | null;
  columns: number | null;
  policies: number | null;
};

export const UNKNOWN_DATABASE_BOOT: DatabaseBootAttestation = {
  version: 1,
  mode: "unknown",
  verified: false,
  verifiedAt: null,
  journalSchema: null,
  tailTag: null,
  tailIdx: null,
  tailCreatedAt: null,
  contractVersion: null,
  tables: null,
  columns: null,
  policies: null,
};

export function databaseBootAttestationPath(): string {
  return (
    process.env.DB_BOOT_ATTESTATION_PATH?.trim()
    || join(tmpdir(), "unionops-db-boot.json")
  );
}

export function readDatabaseBootAttestation(): DatabaseBootAttestation {
  try {
    const value = JSON.parse(
      readFileSync(/* turbopackIgnore: true */ databaseBootAttestationPath(), "utf8"),
    ) as Record<string, unknown>;
    if (value.version !== 1 || value.mode !== "postgres" || value.verified !== true) {
      return UNKNOWN_DATABASE_BOOT;
    }
    return {
      version: 1,
      mode: "postgres",
      verified: true,
      verifiedAt: typeof value.verifiedAt === "string" ? value.verifiedAt : null,
      journalSchema: typeof value.journalSchema === "string" ? value.journalSchema : null,
      tailTag: typeof value.tailTag === "string" ? value.tailTag : null,
      tailIdx: typeof value.tailIdx === "number" ? value.tailIdx : null,
      tailCreatedAt: typeof value.tailCreatedAt === "number" ? value.tailCreatedAt : null,
      contractVersion:
        typeof value.contractVersion === "number" ? value.contractVersion : null,
      tables: typeof value.tables === "number" ? value.tables : null,
      columns: typeof value.columns === "number" ? value.columns : null,
      policies: typeof value.policies === "number" ? value.policies : null,
    };
  } catch {
    return UNKNOWN_DATABASE_BOOT;
  }
}

export function memoryDatabaseBootAttestation(): DatabaseBootAttestation {
  return { ...UNKNOWN_DATABASE_BOOT, mode: "memory" };
}
