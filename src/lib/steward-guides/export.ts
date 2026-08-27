/**
 * Markdown + printable PDF export for steward meeting guide workspaces.
 * Heavy PDF lib is dynamic-imported inside the export function.
 */

import { downloadBlob } from "@/lib/export/image-export";

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

/** Render plain-text notes to a multi-page PDF (no HTML capture). */
export async function exportWorkspacePdf(
  title: string,
  body: string,
  filename: string,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 48;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  const writeWrapped = (
    text: string,
    opts?: { bold?: boolean; size?: number },
  ) => {
    const size = opts?.size ?? 11;
    pdf.setFont("helvetica", opts?.bold ? "bold" : "normal");
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(text, maxWidth) as string[];
    for (const line of lines) {
      ensureSpace(size + 4);
      pdf.text(line, margin, y);
      y += size + 4;
    }
  };

  writeWrapped(title, { bold: true, size: 16 });
  y += 8;

  for (const paragraph of body.split(/\n/)) {
    if (!paragraph.trim()) {
      y += 6;
      continue;
    }
    const isHeading = paragraph.startsWith("#");
    const cleaned = paragraph.replace(/^#+\s*/, "").replace(/\*\*/g, "");
    writeWrapped(cleaned, {
      bold: isHeading,
      size: isHeading ? 13 : 11,
    });
  }

  const safe = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  await downloadBlob(pdf.output("blob"), safe);
}
