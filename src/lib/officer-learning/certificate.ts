import { resolveLocalNumber } from "@/lib/utils/local";
import { saveBlob } from "@/lib/export/save-blob";
import type { BrandLogoBytes } from "@/lib/export/brand-logo-bytes";

export type CertificateKind = "module" | "path";

export type CertificateInput = {
  kind: CertificateKind;
  /** Recipient display name (typed by learner). */
  recipientName: string;
  /** Module title or full-path label. */
  achievementTitle: string;
  moduleNumber?: number;
  localNumber?: string | null;
  completedAt?: Date;
  /** Optional Brand Kit logo (PNG bytes). Falls back to wordmark-only. */
  logo?: BrandLogoBytes | null;
};

function slugPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 40);
}

function logoDataUrl(logo: BrandLogoBytes): string {
  if (logo.src.startsWith("data:")) return logo.src;
  let binary = "";
  for (let i = 0; i < logo.bytes.length; i++) {
    binary += String.fromCharCode(logo.bytes[i]!);
  }
  return `data:image/png;base64,${btoa(binary)}`;
}

/** Pure layout helpers — unit-tested without jsPDF. */
export function certificateLogoPlacement(logo: BrandLogoBytes | null | undefined): {
  draw: boolean;
  x: number;
  y: number;
  widthIn: number;
  heightIn: number;
} | null {
  if (!logo?.bytes?.length) return null;
  const maxW = 1.35;
  const maxH = 0.55;
  const aspect =
    logo.widthPx > 0 && logo.heightPx > 0
      ? logo.widthPx / logo.heightPx
      : 2.4;
  let widthIn = maxW;
  let heightIn = widthIn / aspect;
  if (heightIn > maxH) {
    heightIn = maxH;
    widthIn = heightIn * aspect;
  }
  return { draw: true, x: 0.65, y: 0.65, widthIn, heightIn };
}

/**
 * Client-side landscape certificate PDF (Phase A).
 * Dynamic-imports jsPDF — no server round-trip.
 */
export async function downloadOfficerLearningCertificate(
  input: CertificateInput,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const completedAt = input.completedAt ?? new Date();
  const local = resolveLocalNumber(input.localNumber);
  const name = input.recipientName.trim() || "Union steward";

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "in",
    format: "letter",
  });

  const w = 11;
  const h = 8.5;

  pdf.setFillColor(11, 19, 43);
  pdf.rect(0, 0, w, h, "F");

  pdf.setDrawColor(20, 184, 166);
  pdf.setLineWidth(0.04);
  pdf.rect(0.35, 0.35, w - 0.7, h - 0.7, "S");

  pdf.setDrawColor(245, 158, 11);
  pdf.setLineWidth(0.015);
  pdf.rect(0.5, 0.5, w - 1, h - 1, "S");

  const placement = certificateLogoPlacement(input.logo);
  if (placement && input.logo) {
    try {
      pdf.addImage(
        logoDataUrl(input.logo),
        "PNG",
        placement.x,
        placement.y,
        placement.widthIn,
        placement.heightIn,
      );
    } catch {
      // Brand logo optional — continue with wordmark-only.
    }
  }

  pdf.setTextColor(245, 158, 11);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text("UNIONOPS", w / 2, 1.35, { align: "center" });

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  pdf.text("OFFICER LEARNING CENTER", w / 2, 1.7, { align: "center" });

  pdf.setFontSize(12);
  pdf.setTextColor(148, 163, 184);
  pdf.text("This certifies that", w / 2, 2.55, { align: "center" });

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(28);
  pdf.text(name, w / 2, 3.25, { align: "center" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(12);
  pdf.setTextColor(148, 163, 184);
  pdf.text(
    input.kind === "path"
      ? "has completed the full Officer Learning path"
      : "has completed and passed",
    w / 2,
    3.85,
    { align: "center" },
  );

  pdf.setTextColor(20, 184, 166);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  const title =
    input.kind === "module" && input.moduleNumber
      ? `Module ${input.moduleNumber}: ${input.achievementTitle}`
      : input.achievementTitle;
  pdf.text(title, w / 2, 4.5, { align: "center", maxWidth: 9 });

  pdf.setTextColor(203, 213, 225);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.text(`Local ${local}`, w / 2, 5.35, { align: "center" });
  pdf.text(
    completedAt.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    w / 2,
    5.75,
    { align: "center" },
  );

  pdf.setFontSize(8);
  pdf.setTextColor(100, 116, 139);
  pdf.text(
    "Self-paced education on this device. Confirm practice against your collective agreement. Not a licence or legal credential.",
    w / 2,
    7.55,
    { align: "center", maxWidth: 9 },
  );

  const blob = pdf.output("blob");
  const filename =
    input.kind === "path"
      ? `unionops-officer-learning-path-${slugPart(name)}.pdf`
      : `unionops-officer-learning-module-${input.moduleNumber ?? "x"}-${slugPart(name)}.pdf`;
  await saveBlob(blob, filename);
}
