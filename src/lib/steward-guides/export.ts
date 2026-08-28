/**
 * Markdown + printable PDF export for steward meeting guide workspaces.
 * PDF chrome via text-pdf-layout (UnionOps mark + education footer).
 */

import { downloadBlob } from "@/lib/export/image-export";
import {
  STEWARD_WORKSPACE_FOOTER,
  writeBrandedNotesPdf,
  type GuidePdfBrand,
  type GuidePdfLocale,
} from "@/lib/export/text-pdf-layout";

export async function exportWorkspaceMarkdown(
  markdown: string,
  filename: string,
): Promise<void> {
  const safe = filename.endsWith(".md") ? filename : `${filename}.md`;
  await downloadBlob(
    new Blob([markdown], { type: "text/markdown;charset=utf-8" }),
    safe,
  );
}

/** Render plain-text notes to a multi-page PDF (branded platform chrome). */
export async function exportWorkspacePdf(
  title: string,
  body: string,
  filename: string,
  opts?: { locale?: GuidePdfLocale; brand?: GuidePdfBrand },
): Promise<void> {
  const locale = opts?.locale ?? "en";
  await writeBrandedNotesPdf({
    title,
    body,
    filename,
    footer: STEWARD_WORKSPACE_FOOTER[locale],
    brand: opts?.brand,
  });
}
