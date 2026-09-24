/**
 * Repair common paste/CSV encoding damage while keeping real Unicode
 * (French accents, cent signs, etc.). Applied on every snippet import path.
 */

const MOJIBAKE_HINT =
  /Ã[\u0080-\u00BF]|Â[\u00A0-\u00FF]|â€[™œ]|â€™|â€œ|â€|â€“|â€”|â€¦/;

/** True when the string looks like UTF-8 bytes mis-decoded as Latin-1/Windows-1252. */
export function looksLikeUtf8Mojibake(value: string): boolean {
  return MOJIBAKE_HINT.test(value);
}

/**
 * If `value` is UTF-8 misread as Latin-1, re-decode to proper Unicode.
 * Leaves already-correct text alone (including `employés`, `Métis`, `¢`).
 */
export function repairUtf8Mojibake(value: string): string {
  if (!value || !looksLikeUtf8Mojibake(value)) return value;
  try {
    const bytes = Uint8Array.from(
      Array.from(value, (ch) => ch.charCodeAt(0) & 0xff),
    );
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    if (!decoded || decoded.includes("\uFFFD")) return value;
    if (looksLikeUtf8Mojibake(decoded)) return value;
    // Prefer the decode when it recovers letters/punctuation without new junk.
    return decoded;
  } catch {
    return value;
  }
}

/**
 * Map Word/Windows punctuation to plain ASCII equivalents officers expect when
 * pasting into notes. Does **not** strip diacritics.
 */
const PUNCTUATION_MAP: Record<string, string> = {
  "\u2018": "'", // ‘
  "\u2019": "'", // ’
  "\u201A": "'", // ‚
  "\u201B": "'", // ‛
  "\u2032": "'", // ′
  "\u201C": '"', // “
  "\u201D": '"', // ”
  "\u201E": '"', // „
  "\u2033": '"', // ″
  "\u2013": "-", // –
  "\u2014": "-", // —
  "\u2015": "-", // ―
  "\u2212": "-", // −
  "\u2026": "...", // …
  "\u00A0": " ", // nbsp
  "\u202F": " ", // narrow nbsp
  "\u2007": " ", // figure space
  "\u2009": " ", // thin space
  "\u200B": "", // zero-width space
  "\u200C": "", // zwnj
  "\u200D": "", // zwj
  "\uFEFF": "", // BOM / zwnbsp
  "\u00AD": "", // soft hyphen
};

function normalizePunctuation(value: string): string {
  let out = "";
  for (const ch of value) {
    out += PUNCTUATION_MAP[ch] ?? ch;
  }
  return out;
}

/**
 * Decode a CSV/text upload. Prefer strict UTF-8; fall back to Windows-1252
 * for Excel exports that still use legacy code pages.
 */
export function decodeSnippetFileBytes(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

/**
 * Normalize snippet field text for storage/display:
 * 1. Strip BOM
 * 2. Repair UTF-8-as-Latin-1 mojibake when detected
 * 3. Flatten smart quotes / dashes / nbsp to plain ASCII punctuation
 * 4. NFKC + trim trailing whitespace per line (keep intentional blank lines)
 */
export function normalizeSnippetText(value: string): string {
  if (!value) return value;
  let text = value.replace(/^\uFEFF/, "");
  text = repairUtf8Mojibake(text);
  text = normalizePunctuation(text);
  text = text.normalize("NFKC");
  // Collapse Windows newlines; trim end-of-line junk without killing paragraph breaks.
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  text = text
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/g, ""))
    .join("\n");
  return text.trim();
}
