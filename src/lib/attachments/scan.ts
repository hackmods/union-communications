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
 * When `ATTACHMENT_SCANNER_URL` is set, `scanAttachment` POSTs raw bytes to
 * `${ATTACHMENT_SCANNER_URL}/scan` (see contract below). Local EICAR sniff runs
 * first. Without a scanner URL, uploads are `skipped_dev` unless
 * `ATTACHMENT_SCAN_MODE=strict`.
 *
 * ## Scanner HTTP contract
 *
 * ```
 * POST ${ATTACHMENT_SCANNER_URL}/scan
 * Content-Type: application/octet-stream
 * Body: raw file bytes
 * ```
 *
 * Accepted responses:
 * - JSON `{ "ok": true }` or `{ "ok": true, "infected": false }` → clean
 * - JSON `{ "ok": false }` or `{ "infected": true }` → infected
 * - Plain text containing `OK` (e.g. `stream: OK`) → clean
 * - Plain text containing `FOUND` → infected
 *
 * Compatible with common clamav-rest sidecars that accept raw POST bodies.
 * Multipart forms are not required.
 *
 * Fail-closed: if the URL is set and the HTTP call fails, status is `pending`
 * (reject upload) unless `ATTACHMENT_SCAN_ALLOW_SKIP_ON_ERROR=true` (then
 * `skipped_dev`).
 */

export type ScanResult = {
  ok: boolean;
  status: AttachmentScanStatus;
  error?: string;
};

export type ScanMeta = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  contentBase64?: string;
};

export function isScannerConfigured(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(env.ATTACHMENT_SCANNER_URL?.trim());
}

function allowSkipOnScannerError(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
): boolean {
  const raw = env.ATTACHMENT_SCAN_ALLOW_SKIP_ON_ERROR?.trim().toLowerCase();
  return raw === "true" || raw === "1";
}

function validateMeta(meta: ScanMeta): ScanResult | null {
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
  return null;
}

function resolveScanUrl(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
): string {
  const base = env.ATTACHMENT_SCANNER_URL!.trim().replace(/\/+$/, "");
  return base.endsWith("/scan") ? base : `${base}/scan`;
}

function parseScannerBody(text: string, contentType: string | null): ScanResult {
  const trimmed = text.trim();
  const ct = (contentType ?? "").toLowerCase();

  if (ct.includes("json") || trimmed.startsWith("{")) {
    try {
      const json = JSON.parse(trimmed) as {
        ok?: boolean;
        infected?: boolean;
        status?: string;
      };
      if (json.infected === true || json.status === "infected") {
        return {
          ok: false,
          status: "infected",
          error: "Malware signature detected",
        };
      }
      if (json.ok === false) {
        return {
          ok: false,
          status: "infected",
          error: "Scanner rejected file",
        };
      }
      if (json.ok === true || json.infected === false) {
        return { ok: true, status: "clean" };
      }
    } catch {
      // fall through to text heuristics
    }
  }

  const upper = trimmed.toUpperCase();
  if (/\bFOUND\b/.test(upper)) {
    return {
      ok: false,
      status: "infected",
      error: "Malware signature detected",
    };
  }
  if (/\bOK\b/.test(upper)) {
    return { ok: true, status: "clean" };
  }

  return {
    ok: false,
    status: "pending",
    error: "Unrecognized scanner response",
  };
}

/**
 * POST file bytes to the configured ClamAV / clamav-rest endpoint.
 * @internal exported for unit tests
 */
export async function postBytesToScanner(
  bytes: Buffer,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<ScanResult> {
  const url = resolveScanUrl(env);
  try {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: new Uint8Array(bytes),
    });
    const text = await res.text();
    if (!res.ok) {
      if (allowSkipOnScannerError(env)) {
        return { ok: true, status: "skipped_dev" };
      }
      return {
        ok: false,
        status: "pending",
        error: `Scanner HTTP ${res.status}`,
      };
    }
    return parseScannerBody(text, res.headers.get("content-type"));
  } catch (err) {
    if (allowSkipOnScannerError(env)) {
      return { ok: true, status: "skipped_dev" };
    }
    return {
      ok: false,
      status: "pending",
      error:
        err instanceof Error
          ? `Scanner unreachable: ${err.message}`
          : "Scanner unreachable",
    };
  }
}

/**
 * Async virus scan used by attachment / document adapters.
 */
export async function scanAttachment(
  meta: ScanMeta,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<ScanResult> {
  const local = validateMeta(meta);
  if (local) return local;

  if (!isScannerConfigured(env)) {
    if (env.ATTACHMENT_SCAN_MODE === "strict") {
      return {
        ok: false,
        status: "pending",
        error: "Real scanner not configured",
      };
    }
    return { ok: true, status: "skipped_dev" };
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(meta.contentBase64 ?? "", "base64");
  } catch {
    return { ok: false, status: "pending", error: "Invalid base64 content" };
  }
  if (bytes.length === 0) {
    return { ok: false, status: "pending", error: "Empty file payload" };
  }

  return postBytesToScanner(bytes, env, fetchImpl);
}

/**
 * Sync local validation (size/MIME/EICAR) only.
 * When a scanner URL is configured, returns pending and asks callers to use
 * `scanAttachment` — adapters should prefer the async path.
 */
export function scanAttachmentStub(
  meta: ScanMeta,
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): ScanResult {
  const local = validateMeta(meta);
  if (local) return local;

  if (isScannerConfigured(env)) {
    return {
      ok: false,
      status: "pending",
      error: "Use async scanAttachment when ATTACHMENT_SCANNER_URL is set",
    };
  }

  if (env.ATTACHMENT_SCAN_MODE === "strict") {
    return {
      ok: false,
      status: "pending",
      error: "Real scanner not configured",
    };
  }

  return { ok: true, status: "skipped_dev" };
}

/** Download / stream only when scan passed or was skipped in dev. */
export function isDownloadAllowed(status: AttachmentScanStatus): boolean {
  return status === "clean" || status === "skipped_dev";
}
