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

const EDUCATION_FOOTER =
  "UnionOps Officer Learning — education only. Confirm every step against your collective agreement. Not legal advice.";

type ModulePdfContext = {
  moduleTitle: string;
  localLabel: string;
};

/** Blank FAR sheet for Step 1 meetings (module 1 pocket card). */
export async function downloadFarSheetPdf(opts: ModulePdfContext): Promise<void> {
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
    footer: EDUCATION_FOOTER,
  });
}

/** Discipline meeting rights sheet (module 2). */
export async function downloadDisciplineRightsPdf(opts: ModulePdfContext): Promise<void> {
  await writeSimplePdf({
    title: "Discipline meeting — steward pocket sheet",
    subtitle: `${opts.moduleTitle} · ${opts.localLabel}`,
    sections: [
      {
        heading: "Before the meeting",
        lines: [
          "Reasonable notice of disciplinary focus given?",
          "Member knows representation rights?",
          "Full disclosure requested before answers?",
          "Prior rungs on ladder documented?",
        ],
      },
      {
        heading: "Just cause probes",
        lines: [
          "Foreseeable rule communicated?",
          "Investigation before penalty?",
          "Penalty fits offence and record?",
          "Mitigating factors on the record?",
        ],
      },
      {
        heading: "On the record",
        lines: [
          "Notes taken; member not speculating",
          "Obey-now-grieve-later issue flagged if relevant",
          "Letter of counsel proposed if appropriate",
        ],
      },
    ],
    filename: `unionops-discipline-rights-${slugPart(opts.moduleTitle)}.pdf`,
    footer: EDUCATION_FOOTER,
  });
}

/** Meiorin BFOR test worksheet (module 3). */
export async function downloadMeiorinSheetPdf(opts: ModulePdfContext): Promise<void> {
  await writeSimplePdf({
    title: "Meiorin BFOR test — accommodation worksheet",
    subtitle: `${opts.moduleTitle} · ${opts.localLabel}`,
    sections: [
      {
        heading: "Meiorin three-step test",
        lines: [
          "1. Rational connection to performing the job?",
          "2. Adopted in honest good faith?",
          "3. Impossible to accommodate without undue hardship?",
        ],
      },
      {
        heading: "Undue hardship — employer must prove",
        lines: ["Cost (with evidence)", "Outside funding explored", "Health and safety risk documented"],
      },
      {
        heading: "Not undue hardship (push back)",
        lines: [
          "Co-worker morale or preference",
          "Customer preference",
          "Collective agreement conflict alone",
        ],
      },
    ],
    filename: `unionops-meiorin-sheet-${slugPart(opts.moduleTitle)}.pdf`,
    footer: EDUCATION_FOOTER,
  });
}

/** Quorum + motion template (module 4). */
export async function downloadQuorumMotionPdf(opts: ModulePdfContext): Promise<void> {
  await writeSimplePdf({
    title: "Meeting quorum & motion template",
    subtitle: `${opts.moduleTitle} · ${opts.localLabel}`,
    sections: [
      {
        heading: "Quorum check",
        lines: [
          "Regular meeting quorum met?",
          "Special meeting notice + quorum met?",
          "Electronic participation counted per bylaws?",
        ],
      },
      {
        heading: "Motion on the floor",
        lines: [
          "Moved by:",
          "Seconded by:",
          "Wording (decision-focused, not debate):",
          "Vote result (for / against / abstain):",
        ],
      },
      {
        heading: "After the vote",
        lines: ["Action owner assigned", "Deadline attached", "Minutes draft within 48 hours"],
      },
    ],
    filename: `unionops-quorum-motion-${slugPart(opts.moduleTitle)}.pdf`,
    footer: EDUCATION_FOOTER,
  });
}

/** Financial controls audit trail (module 5). */
export async function downloadAuditControlsPdf(opts: ModulePdfContext): Promise<void> {
  await writeSimplePdf({
    title: "Financial controls — receipt to audit trail",
    subtitle: `${opts.moduleTitle} · ${opts.localLabel}`,
    sections: [
      {
        heading: "Every disbursement",
        lines: [
          "Original receipt attached",
          "Two authorized signatures before release",
          "Cheque / EFT matches approved amount",
        ],
      },
      {
        heading: "Trustee six-month audit",
        lines: [
          "Sample vouchers traced to bank statement",
          "Outstanding cheques reconciled",
          "Member report scheduled",
        ],
      },
    ],
    filename: `unionops-audit-controls-${slugPart(opts.moduleTitle)}.pdf`,
    footer: EDUCATION_FOOTER,
  });
}

/** Equity clause negotiation worksheet (module 6). */
export async function downloadEquityClausePdf(opts: ModulePdfContext): Promise<void> {
  await writeSimplePdf({
    title: "Equity clause — barrier to accountability",
    subtitle: `${opts.moduleTitle} · ${opts.localLabel}`,
    sections: [
      {
        heading: "Name the barrier",
        lines: [
          "Who is excluded or under-protected?",
          "Pattern across shifts / classifications?",
          "Evidence documented (not anecdote only)?",
        ],
      },
      {
        heading: "Propose contract language",
        lines: [
          "Specific clause or LOU draft:",
          "Joint review / reporting deadline:",
          "Remedy if employer misses deadline:",
        ],
      },
      {
        heading: "Member follow-up",
        lines: [
          "Plain-language summary for the floor",
          "Restorative path before formal grievance if safe",
        ],
      },
    ],
    filename: `unionops-equity-clause-${slugPart(opts.moduleTitle)}.pdf`,
    footer: EDUCATION_FOOTER,
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
    footer: EDUCATION_FOOTER,
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
