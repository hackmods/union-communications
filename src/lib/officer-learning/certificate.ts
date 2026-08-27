import { resolveLocalNumber } from "@/lib/utils/local";
import { saveBlob } from "@/lib/export/save-blob";
import type { BrandLogoBytes } from "@/lib/export/brand-logo-bytes";
import {
  GUIDE_PDF_PALETTE,
  certificateBrandLogoPlacement,
  certificatePlatformMarkPlacement,
  logoDataUrlFromBytes,
  resolveUnionOpsMarkBytes,
} from "@/lib/export/text-pdf-layout";

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
  /** Optional Brand Kit logo (PNG bytes). Secondary to UnionOps platform mark. */
  logo?: BrandLogoBytes | null;
};

function slugPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 40);
}

/** @deprecated Prefer certificateBrandLogoPlacement — kept for existing tests. */
export function certificateLogoPlacement(logo: BrandLogoBytes | null | undefined): {
  draw: boolean;
  x: number;
  y: number;
  widthIn: number;
  heightIn: number;
} | null {
  return certificateBrandLogoPlacement(logo, { withPlatformMark: false });
}

/**
 * Client-side landscape certificate PDF.
 * Dynamic-imports jsPDF — no server round-trip.
 * Header: UnionOps platform mark (awareness) + optional Brand Kit logo.
 */
export async function downloadOfficerLearningCertificate(
  input: CertificateInput,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const completedAt = input.completedAt ?? new Date();
  const local = resolveLocalNumber(input.localNumber);
  const name = input.recipientName.trim() || "Union steward";
  const { navy, teal, amber } = GUIDE_PDF_PALETTE;

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "in",
    format: "letter",
  });

  const w = 11;
  const h = 8.5;

  pdf.setFillColor(navy.r, navy.g, navy.b);
  pdf.rect(0, 0, w, h, "F");

  pdf.setDrawColor(teal.r, teal.g, teal.b);
  pdf.setLineWidth(0.04);
  pdf.rect(0.35, 0.35, w - 0.7, h - 0.7, "S");

  pdf.setDrawColor(amber.r, amber.g, amber.b);
  pdf.setLineWidth(0.015);
  pdf.rect(0.5, 0.5, w - 1, h - 1, "S");

  const platformMark = await resolveUnionOpsMarkBytes();
  const platformPlacement = certificatePlatformMarkPlacement(platformMark);
  if (platformPlacement && platformMark) {
    try {
      pdf.addImage(
        logoDataUrlFromBytes(platformMark),
        "PNG",
        platformPlacement.x,
        platformPlacement.y,
        platformPlacement.widthIn,
        platformPlacement.heightIn,
      );
    } catch {
      // Platform mark optional — continue with text fallback below.
    }
  }

  const brandPlacement = certificateBrandLogoPlacement(input.logo, {
    withPlatformMark: Boolean(platformPlacement),
  });
  if (brandPlacement && input.logo) {
    try {
      pdf.addImage(
        logoDataUrlFromBytes(input.logo),
        "PNG",
        brandPlacement.x,
        brandPlacement.y,
        brandPlacement.widthIn,
        brandPlacement.heightIn,
      );
    } catch {
      // Brand logo optional.
    }
  }

  // Wordmark fallback when platform mark did not draw
  if (!platformPlacement) {
    pdf.setTextColor(amber.r, amber.g, amber.b);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text("UNIONOPS", w / 2, 1.35, { align: "center" });
  }

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  pdf.text("OFFICER LEARNING CENTER", w / 2, platformPlacement ? 1.55 : 1.7, {
    align: "center",
  });

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

  pdf.setTextColor(teal.r, teal.g, teal.b);
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
