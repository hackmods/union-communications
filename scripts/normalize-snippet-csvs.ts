import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import {
  normalizeSnippetText,
  repairUtf8Mojibake,
} from "../src/lib/snippets/text-normalize";

/**
 * Rewrite seed + Downloads CSVs as UTF-8 LF with mojibake/punctuation repair.
 * Run: npx tsx scripts/normalize-snippet-csvs.ts
 */
const pairs: [string, string][] = [
  [
    "c:/Users/Ryan/Downloads/opseu_constitution_snippets_unionops.csv",
    "seed/snippets/constitution.en.csv",
  ],
  [
    "c:/Users/Ryan/Downloads/caat_academic_snippets_unionops.csv",
    "seed/snippets/caat-a-academic.en.csv",
  ],
  [
    "c:/Users/Ryan/Downloads/caat_ftss_snippets_unionops.csv",
    "seed/snippets/caat-s-ft.en.csv",
  ],
  [
    "c:/Users/Ryan/Downloads/caat_ptss_snippets_unionops.csv",
    "seed/snippets/caat-s-pt.en.csv",
  ],
];

function decodeCsvBuffer(raw: Buffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(raw);
  } catch {
    return new TextDecoder("windows-1252").decode(raw);
  }
}

/** Punctuation + mojibake repair without trimming (preserves CSV structure). */
function repairCsvPayload(text: string): string {
  let out = repairUtf8Mojibake(text.replace(/^\uFEFF/, ""));
  out = out
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/[\u2013\u2014\u2015\u2212]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u00A0\u202F\u2007\u2009]/g, " ")
    .replace(/[\u200B\u200C\u200D\u00AD\uFEFF]/g, "")
    .normalize("NFKC")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  return `${out.trimEnd()}\n`;
}

for (const [src, dest] of pairs) {
  const raw = readFileSync(src);
  const text = decodeCsvBuffer(raw);
  const out = repairCsvPayload(text);
  writeFileSync(dest, out, "utf8");
  writeFileSync(src, out, "utf8");

  // Sanity: parse first data row body through the same normalizer officers use.
  const sampleLine = out.split("\n")[1] ?? "";
  console.log(
    basename(dest),
    "bytes",
    Buffer.byteLength(out, "utf8"),
    "employés",
    out.includes("employés"),
    "Métis",
    out.includes("Métis"),
    "sampleNormalizedOk",
    normalizeSnippetText(sampleLine).length > 0,
  );
}
