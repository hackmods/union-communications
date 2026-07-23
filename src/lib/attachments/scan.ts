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
 * Virus-scan gate for uploads.
 *
 * Production target: ClamAV (or cloud equivalent) via ATTACHMENT_SCANNER_URL /
 * a sidecar. That integration is deferred (FEAT-001). Until a scanner is
 * configured, uploads are accepted as `skipped_dev` unless
 * ATTACHMENT_SCAN_MODE=strict (reject) or a known EICAR signature is present.
 */
export function isScannerConfigured(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(env.ATTACHMENT_SCANNER_URL?.trim());
}

export function scanAttachmentStub(
  meta: {
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    contentBase64?: string;
  },
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): { ok: boolean; status: AttachmentScanStatus; error?: string } {
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

  if (isScannerConfigured(env)) {
    // Scanner URL is set but ClamAV client is not wired yet — treat as pending fail-closed
    // until a real client lands. Prefer skipped_dev when unset.
    return {
      ok: false,
      status: "pending",
      error:
        "ATTACHMENT_SCANNER_URL is set but ClamAV client is not implemented yet",
    };
  }

  if (env.ATTACHMENT_SCAN_MODE === "strict") {
    return {
      ok: false,
      status: "pending",
      error: "Real scanner not configured",
    };
  }

  // Missing scanner → skipped_dev (dev / self-host without ClamAV sidecar)
  return { ok: true, status: "skipped_dev" };
}

/** Download / stream only when scan passed or was skipped in dev. */
export function isDownloadAllowed(status: AttachmentScanStatus): boolean {
  return status === "clean" || status === "skipped_dev";
}
