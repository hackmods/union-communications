import type { BumpingCaseWithRelations } from "@/types/bumping";
import type { GrievanceWithRelations } from "@/types/grievance";
import type { EncryptedPayload } from "@/lib/crypto/passphrase";

export const HYBRID_SLICE_VERSION = "1.0" as const;
export const HYBRID_FILE_FORMAT = "lunion-hybrid-v1" as const;

/** Plaintext confidential data slice for a single local. */
export interface HybridDataSlice {
  version: typeof HYBRID_SLICE_VERSION;
  exportedAt: string;
  unionId: string;
  localId: string;
  grievances: GrievanceWithRelations[];
  bumpingCases: BumpingCaseWithRelations[];
}

/** Encrypted file downloaded / stored locally. */
export interface EncryptedHybridFile {
  format: typeof HYBRID_FILE_FORMAT;
  version: "1.0";
  unionId: string;
  localId: string;
  exportedAt: string;
  encryption: EncryptedPayload;
}

export type HybridImportMode = "merge" | "replace";

export interface HybridImportResult {
  grievancesImported: number;
  grievancesRemoved: number;
  bumpingImported: number;
  bumpingRemoved: number;
}

export interface HybridLocalSliceMeta {
  unionId: string;
  localId: string;
  savedAt: string;
  grievanceCount: number;
  bumpingCount: number;
}
