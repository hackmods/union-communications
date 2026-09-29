const BLOCKED_SCHEMES = new Set(["javascript:", "data:", "blob:", "vbscript:"]);

/** True when the string uses a disallowed navigation/data URL scheme. */
export function hasDisallowedUrlScheme(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  for (const scheme of BLOCKED_SCHEMES) {
    if (lower.startsWith(scheme)) return true;
  }
  try {
    const parsed = new URL(trimmed, "https://unionops.org");
    const protocol = parsed.protocol.toLowerCase();
    if (protocol === "http:" || protocol === "https:") return false;
    if (trimmed.startsWith("/")) return false;
    return protocol !== "about:";
  } catch {
    return trimmed.includes(":");
  }
}

/** True only for http(s) URLs suitable for exported website hrefs. */
export function isHttpOrHttpsUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
