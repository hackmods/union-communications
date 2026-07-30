const EXT_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
  gif: "image/gif",
  pdf: "application/pdf",
  zip: "application/zip",
  csv: "text/csv;charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ics: "text/calendar;charset=utf-8",
};

/** Infer MIME from filename when canvas / zip blobs omit a type (common on WebKit). */
export function mimeFromFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return EXT_MIME[ext] ?? "application/octet-stream";
}

/** Re-wrap blobs missing a useful type so iOS Quick Look and share sheets treat them correctly. */
export function withFilenameMime(blob: Blob, filename: string): Blob {
  const expected = mimeFromFilename(filename);
  if (!blob.type || blob.type === "application/octet-stream") {
    return new Blob([blob], { type: expected });
  }
  return blob;
}

export function isIosWebKit(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

function isMobileShareTarget(): boolean {
  if (typeof navigator === "undefined") return false;
  return isIosWebKit() || /Android/i.test(navigator.userAgent);
}

type ShareAttempt = "shared" | "cancelled" | "unavailable" | "failed";

async function tryWebShare(blob: Blob, filename: string): Promise<ShareAttempt> {
  if (!isMobileShareTarget()) return "unavailable";
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };
  if (typeof nav.share !== "function") return "unavailable";

  const file = new File([blob], filename, {
    type: blob.type || mimeFromFilename(filename),
  });
  const payload: ShareData = { files: [file] };
  if (typeof nav.canShare === "function" && !nav.canShare(payload)) {
    return "unavailable";
  }

  try {
    await nav.share(payload);
    return "shared";
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
    return "failed";
  }
}

function openBlobInline(blob: Blob): boolean {
  if (typeof window === "undefined") return false;
  const urlApi = window.URL || window.webkitURL;
  if (!urlApi?.createObjectURL) return false;

  const url = urlApi.createObjectURL(blob);
  const opened = window.open(url, "_blank");
  if (!opened) {
    urlApi.revokeObjectURL(url);
    return false;
  }
  window.setTimeout(() => urlApi.revokeObjectURL(url), 120_000);
  return true;
}

/**
 * Save or hand off a client-generated file.
 * Mobile: native share sheet (Save to Photos / Files). iOS fallback: inline blob tab for images/PDF.
 * Desktop: `file-saver` download.
 */
export async function saveBlob(blob: Blob, filename: string): Promise<void> {
  const typed = withFilenameMime(blob, filename);

  const shareResult = await tryWebShare(typed, filename);
  if (shareResult === "shared" || shareResult === "cancelled") return;

  if (isIosWebKit()) {
    const mime = typed.type;
    if (mime.startsWith("image/") || mime === "application/pdf") {
      if (openBlobInline(typed)) return;
    }
  }

  const { saveAs } = await import("file-saver");
  saveAs(typed, filename);
}
