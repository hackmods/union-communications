import type { DiffLine } from "@/types/bumping";

/** Simple line-by-line diff for side-by-side position text comparison */
export function diffLines(leftText: string, rightText: string): DiffLine[] {
  const left = leftText.split(/\r?\n/).map((l) => l.trim());
  const right = rightText.split(/\r?\n/).map((l) => l.trim());
  const max = Math.max(left.length, right.length);
  const result: DiffLine[] = [];

  for (let i = 0; i < max; i++) {
    const l = left[i] ?? "";
    const r = right[i] ?? "";
    if (l === r) {
      if (l) result.push({ type: "same", left: l, right: r });
    } else if (!l && r) {
      result.push({ type: "added", right: r });
    } else if (l && !r) {
      result.push({ type: "removed", left: l });
    } else {
      result.push({ type: "changed", left: l, right: r });
    }
  }

  return result;
}

export function positionToCompareText(parts: {
  title: string;
  duties: string;
  qualifications: string;
  seniorityNotes: string;
  sourceText?: string;
}): string {
  if (parts.sourceText?.trim()) return parts.sourceText.trim();
  return [
    parts.title && `Title: ${parts.title}`,
    parts.duties && `Duties:\n${parts.duties}`,
    parts.qualifications && `Qualifications:\n${parts.qualifications}`,
    parts.seniorityNotes && `Seniority:\n${parts.seniorityNotes}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function highlightKeywords(text: string): string[] {
  const keywords = [
    "seniority",
    "qualification",
    "duties",
    "bump",
    "incumbent",
    "position",
    "classification",
  ];
  const lower = text.toLowerCase();
  return keywords.filter((k) => lower.includes(k));
}
