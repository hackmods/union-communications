import { BYLAW_ARTICLE_KEYS, type BylawArticleKey } from "./articles";

export type BylawArticleSlice = {
  key: BylawArticleKey;
  title: string;
  body: string;
};

/** Split plain-text bylaws into numbered articles when possible. */
export function parseBylawArticles(text: string): BylawArticleSlice[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const chunks = trimmed.split(/\n(?=Article\s+\d+)/i).filter(Boolean);
  if (chunks.length <= 1) {
    return [
      {
        key: "name",
        title: "Full text",
        body: trimmed,
      },
    ];
  }

  return chunks.map((chunk, index) => {
    const firstLine = chunk.split("\n")[0]?.trim() ?? "";
    const titleMatch = /^Article\s+(\d+)[^.\n]*/i.exec(firstLine);
    const articleNum = titleMatch
      ? Number.parseInt(titleMatch[1] ?? String(index + 1), 10)
      : index + 1;
    const key = BYLAW_ARTICLE_KEYS[articleNum - 1] ?? "conflict";
    return {
      key,
      title: firstLine || `Article ${articleNum}`,
      body: chunk.trim(),
    };
  });
}

export type BylawRedlineRow = {
  key: BylawArticleKey | "full";
  title: string;
  status: "added" | "removed" | "changed" | "unchanged";
  before?: string;
  after?: string;
};

function normalizeArticleBody(body: string): string {
  return body.replace(/\s+/g, " ").trim().toLowerCase();
}

/** Compare existing bylaws text to a generated draft by article. */
export function summarizeBylawRedline(
  existingText: string,
  draftText: string,
): BylawRedlineRow[] {
  const existing = parseBylawArticles(existingText);
  const draft = parseBylawArticles(draftText);

  if (existing.length === 1 && existing[0]?.key === "name" && existing[0]?.title === "Full text") {
    const before = existing[0]?.body ?? "";
    const after = draftText.trim();
    if (!before) return [];
    if (normalizeArticleBody(before) === normalizeArticleBody(after)) {
      return [
        {
          key: "full",
          title: "Full text",
          status: "unchanged",
          before,
          after,
        },
      ];
    }
    return [
      {
        key: "full",
        title: "Full text",
        status: "changed",
        before,
        after,
      },
    ];
  }

  const byKey = (slices: BylawArticleSlice[]) =>
    new Map(slices.map((slice) => [slice.key, slice]));

  const existingByKey = byKey(existing);
  const draftByKey = byKey(draft);
  const keys = new Set<BylawArticleKey>([
    ...existingByKey.keys(),
    ...draftByKey.keys(),
  ]);

  const rows: BylawRedlineRow[] = [];
  for (const key of BYLAW_ARTICLE_KEYS) {
    if (!keys.has(key)) continue;
    const before = existingByKey.get(key)?.body;
    const after = draftByKey.get(key)?.body;
    const title =
      draftByKey.get(key)?.title ??
      existingByKey.get(key)?.title ??
      key;

    if (before && after) {
      rows.push({
        key,
        title,
        status:
          normalizeArticleBody(before) === normalizeArticleBody(after)
            ? "unchanged"
            : "changed",
        before,
        after,
      });
    } else if (before && !after) {
      rows.push({ key, title, status: "removed", before });
    } else if (!before && after) {
      rows.push({ key, title, status: "added", after });
    }
  }
  return rows;
}

export function changedBylawRedlineCount(rows: BylawRedlineRow[]): number {
  return rows.filter((row) => row.status !== "unchanged").length;
}
