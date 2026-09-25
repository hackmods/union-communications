/** Paths we auto-link when they appear bare or inside backticks. */
export const INTERNAL_PATH_RE =
  /^\/(?:guide|tools|app|brand-kit|portal|learn|create|utilities|start)(?:\/[\w-]+)*(?:\?[\w=&%-]+)?$/;

/** Tokenise inline markdown: links, bold, code, italic, bare internal paths. */
export const INLINE_TOKEN_RE =
  /(\[[^\]]+\]\((?:\/[^)\s]+|https?:\/\/[^)\s]+)\)|\*\*[^*]+?\*\*|`[^`]+`|\*[^*]+?\*|\/(?:guide|tools|app|brand-kit|portal|learn|create|utilities|start)(?:\/[\w-]+)*(?:\?[\w=&%-]+)?)/g;

export type InlineToken =
  | { kind: "text"; value: string }
  | { kind: "md-link"; label: string; href: string }
  | { kind: "strong"; value: string }
  | { kind: "code"; value: string }
  | { kind: "em"; value: string }
  | { kind: "path"; value: string };

/** Turn `/guide/seniority-bumping` into a readable "Seniority Bumping" label. */
export function humanizeInternalPath(path: string): string {
  const clean = path.split("?")[0] ?? path;
  const segments = clean.split("/").filter(Boolean);
  const leaf = segments[segments.length - 1] ?? clean;
  const words = leaf.replace(/[-_]+/g, " ").trim();
  if (!words) return path;
  return words.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isInternalPath(value: string): boolean {
  return INTERNAL_PATH_RE.test(value);
}

/** Pure tokenizer — safe for unit tests without React/Next. */
export function tokenizeInline(text: string): InlineToken[] {
  const parts: InlineToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  INLINE_TOKEN_RE.lastIndex = 0;

  while ((match = INLINE_TOKEN_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ kind: "text", value: text.slice(lastIndex, match.index) });
    }
    const token = match[0];
    if (token.startsWith("[") && token.includes("](")) {
      const md = token.match(/^\[([^\]]+)\]\((\/[^)\s]+|https?:\/\/[^)\s]+)\)$/);
      if (md) parts.push({ kind: "md-link", label: md[1], href: md[2] });
      else parts.push({ kind: "text", value: token });
    } else if (token.startsWith("**") && token.endsWith("**")) {
      parts.push({ kind: "strong", value: token.slice(2, -2) });
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push({ kind: "code", value: token.slice(1, -1) });
    } else if (token.startsWith("*") && token.endsWith("*") && !token.startsWith("**")) {
      parts.push({ kind: "em", value: token.slice(1, -1) });
    } else if (token.startsWith("/") && isInternalPath(token)) {
      parts.push({ kind: "path", value: token });
    } else {
      parts.push({ kind: "text", value: token });
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) parts.push({ kind: "text", value: text.slice(lastIndex) });
  return parts.length > 0 ? parts : [{ kind: "text", value: text }];
}
