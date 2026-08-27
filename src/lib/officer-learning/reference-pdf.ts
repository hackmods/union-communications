/**
 * Pocket reference PDFs for Officer Learning floor use.
 * Dynamic-imports jsPDF inside each export (TOOL-004).
 */

import { saveBlob } from "@/lib/export/save-blob";

function slugPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 40);
}

async function writeSimplePdf(opts: {
  title: string;
  subtitle?: string;
  sections: { heading: string; lines: string[] }[];
  filename: string;
  footer: string;
}): Promise<void> {
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

  const write = (text: string, size: number, bold = false) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(text, maxWidth) as string[];
    for (const line of lines) {
      ensureSpace(size + 5);
      pdf.text(line, margin, y);
      y += size + 5;
    }
  };

  write(opts.title, 16, true);
  y += 4;
  if (opts.subtitle) {
    write(opts.subtitle, 10);
    y += 8;
  }

  for (const section of opts.sections) {
    y += 6;
    write(section.heading, 12, true);
    y += 2;
    for (const line of section.lines) {
      write(`☐  ${line}`, 10);
    }
  }

  y += 16;
  write(opts.footer, 8);
  await saveBlob(pdf.output("blob"), opts.filename);
}

/** Blank FAR sheet for Step 1 meetings (module 1 pocket card). */
export async function downloadFarSheetPdf(opts: {
  moduleTitle: string;
  localLabel: string;
}): Promise<void> {
  await writeSimplePdf({
    title: "FAR sheet — Facts / Argument / Resolution",
    subtitle: `${opts.moduleTitle} · ${opts.localLabel}`,
    sections: [
      {
        heading: "Facts (what happened — dates, people, documents)",
        lines: [
          "Who / when / where (attach notes):",
          "Contract article or practice cited:",
          "Evidence locations (email, time clock, witnesses):",
        ],
      },
      {
        heading: "Argument (why the employer breached a binding standard)",
        lines: [
          "5-point filter result (complaint vs grievance):",
          "Binding standard violated:",
          "Employer defence anticipated:",
        ],
      },
      {
        heading: "Resolution (specific, enforceable WANT)",
        lines: [
          "Make-whole remedy requested:",
          "Deadline / step requested:",
          "Member contacted; notes secured:",
        ],
      },
    ],
    filename: `unionops-far-sheet-${slugPart(opts.moduleTitle)}.pdf`,
    footer:
      "UnionOps Officer Learning — education only. Confirm every step against your collective agreement. Not legal advice.",
  });
}

/** Printable floor checklist from parsed module items. */
export async function downloadFloorChecklistPdf(opts: {
  moduleTitle: string;
  moduleNumber: number;
  items: string[];
  localLabel: string;
}): Promise<void> {
  await writeSimplePdf({
    title: `Floor checklist — Module ${opts.moduleNumber}`,
    subtitle: `${opts.moduleTitle} · ${opts.localLabel}`,
    sections: [
      {
        heading: "Before you leave the floor",
        lines: opts.items.length > 0 ? opts.items : ["(No checklist items found)"],
      },
    ],
    filename: `unionops-module-${opts.moduleNumber}-checklist-${slugPart(opts.moduleTitle)}.pdf`,
    footer:
      "UnionOps Officer Learning — education only. Confirm every step against your collective agreement. Not legal advice.",
  });
}

/** Collect checklist items from a parsed module (all sections). */
export function collectChecklistItems(
  sections: { blocks: { type: string; items?: string[] }[]; subsections?: { blocks: { type: string; items?: string[] }[] }[] }[],
): string[] {
  const items: string[] = [];
  for (const section of sections) {
    for (const block of section.blocks) {
      if (block.type === "checklist" && block.items) items.push(...block.items);
    }
    for (const sub of section.subsections ?? []) {
      for (const block of sub.blocks) {
        if (block.type === "checklist" && block.items) items.push(...block.items);
      }
    }
  }
  return items;
}
