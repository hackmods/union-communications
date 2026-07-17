import type { AttachmentScanStatus } from "@/types/attachments";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

/**
 * Dev / memory virus-scan stub. Production must call a real scanner
 * (ClamAV or cloud equivalent) before marking clean.
 */
export function scanAttachmentStub(meta: {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  contentBase64?: string;
}): { ok: boolean; status: AttachmentScanStatus; error?: string } {
  if (meta.sizeBytes <= 0 || meta.sizeBytes > MAX_BYTES) {
    return {
      ok: false,
      status: "pending",
      error: "File must be between 1 byte and 10 MB",
    };
  }
  if (!ALLOWED.has(meta.mimeType)) {
    return {
      ok: false,
      status: "pending",
      error: "Unsupported file type",
    };
  }
  // EICAR test string detection (base64 of classic EICAR)
  if (meta.contentBase64?.includes("WDVPIVAlQEFQWzRcUFg1N0RUFALUg==")) {
    return { ok: false, status: "infected", error: "Malware signature detected" };
  }
  if (process.env.ATTACHMENT_SCAN_MODE === "strict") {
    return {
      ok: false,
      status: "pending",
      error: "Real scanner not configured",
    };
  }
  return { ok: true, status: "skipped_dev" };
}
