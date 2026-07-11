import {
  decryptJson,
  encryptJson,
  isEncryptedPayload,
  type EncryptedPayload,
} from "@/lib/crypto/passphrase";
import {
  HYBRID_FILE_FORMAT,
  type EncryptedHybridFile,
  type HybridDataSlice,
} from "./types";
import { isHybridDataSlice } from "./slice";

export async function encryptHybridSlice(
  slice: HybridDataSlice,
  passphrase: string,
): Promise<EncryptedHybridFile> {
  const encryption = await encryptJson(slice, passphrase);
  return {
    format: HYBRID_FILE_FORMAT,
    version: "1.0",
    unionId: slice.unionId,
    localId: slice.localId,
    exportedAt: slice.exportedAt,
    encryption,
  };
}

export async function decryptHybridFile(
  file: EncryptedHybridFile,
  passphrase: string,
): Promise<HybridDataSlice> {
  if (file.format !== HYBRID_FILE_FORMAT || file.version !== "1.0") {
    throw new Error("Unsupported hybrid file format");
  }
  if (!isEncryptedPayload(file.encryption)) {
    throw new Error("Invalid encryption envelope");
  }
  const slice = await decryptJson<HybridDataSlice>(
    file.encryption as EncryptedPayload,
    passphrase,
  );
  if (!isHybridDataSlice(slice)) {
    throw new Error("Decrypted payload is not a valid hybrid data slice");
  }
  if (slice.unionId !== file.unionId || slice.localId !== file.localId) {
    throw new Error("Encrypted payload tenant mismatch");
  }
  return slice;
}

export function isEncryptedHybridFile(
  value: unknown,
): value is EncryptedHybridFile {
  if (!value || typeof value !== "object") return false;
  const f = value as Record<string, unknown>;
  return (
    f.format === HYBRID_FILE_FORMAT &&
    f.version === "1.0" &&
    typeof f.unionId === "string" &&
    typeof f.localId === "string" &&
    typeof f.exportedAt === "string" &&
    isEncryptedPayload(f.encryption)
  );
}
