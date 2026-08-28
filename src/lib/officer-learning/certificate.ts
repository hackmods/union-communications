import { resolveLocalNumber } from "@/lib/utils/local";
import { saveBlob } from "@/lib/export/save-blob";
import type { BrandLogoBytes } from "@/lib/export/brand-logo-bytes";
import {
  GUIDE_PDF_PALETTE,
  certificateBrandLogoPlacement,
  certificatePlatformMarkPlacement,
  logoDataUrlFromBytes,
  registerGuidePdfFonts,
  resolveUnionOpsMarkBytes,
  type GuidePdfBrand,
  type GuidePdfLocale,
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
  locale?: GuidePdfLocale;
  brand?: GuidePdfBrand;
};

const CERTIFICATE_COPY = {
  en: {
    learningCenter: "OFFICER LEARNING CENTER",
    certifies: "This certifies that",
    completedPath: "has completed the full Officer Learning path",
    completedModule: "has completed and passed",
    modulePrefix: (n: number, title: string) => `Module ${n}: ${title}`,
    local: (n: string) => `Local ${n}`,
    defaultName: "Union steward",
    disclaimer:
      "Self-paced education on this device. Confirm practice against your collective agreement. Not a licence or legal credential.",
  },
  fr: {
    learningCenter: "CENTRE DE FORMATION DES DIRIGEANTS",
    certifies: "Ceci certifie que",
    completedPath: "a terminé le parcours complet de formation des dirigeants",
    completedModule: "a terminé et réussi",
    modulePrefix: (n: number, title: string) => `Module ${n} : ${title}`,
    local: (n: string) => `Local ${n}`,
    defaultName: "Délégué syndical",
    disclaimer:
      "Formation à votre rythme sur cet appareil. Vérifiez la pratique avec votre convention collective. Pas un permis ni un titre juridique.",
  },
} as const;

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
  const locale = input.locale ?? "en";
  const copy = CERTIFICATE_COPY[locale];
  const name = input.recipientName.trim() || copy.defaultName;
  const { navy, brand, brandLight } = GUIDE_PDF_PALETTE;

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "in",
    format: "letter",
  });

  const faces = await registerGuidePdfFonts(
    pdf as unknown as Parameters<typeof registerGuidePdfFonts>[0],
    input.brand,
  );

  const w = 11;
  const h = 8.5;

  pdf.setFillColor(navy.r, navy.g, navy.b);
  pdf.rect(0, 0, w, h, "F");

  pdf.setDrawColor(brand.r, brand.g, brand.b);
  pdf.setLineWidth(0.04);
  pdf.rect(0.35, 0.35, w - 0.7, h - 0.7, "S");

  pdf.setDrawColor(brandLight.r, brandLight.g, brandLight.b);
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

  const setFace = (bold: boolean) => {
    const face = bold ? faces.headline : faces.body;
    const style =
      face === "helvetica" ? (bold ? "bold" : "normal") : bold ? "bold" : "normal";
    pdf.setFont(face, style);
  };

  // Wordmark fallback when platform mark did not draw
  if (!platformPlacement) {
    pdf.setTextColor(brandLight.r, brandLight.g, brandLight.b);
    setFace(true);
    pdf.setFontSize(14);
    pdf.text("UNIONOPS", w / 2, 1.35, { align: "center" });
  }

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(11);
  setFace(false);
  pdf.text(copy.learningCenter, w / 2, platformPlacement ? 1.55 : 1.7, {
    align: "center",
  });

  pdf.setFontSize(12);
  pdf.setTextColor(148, 163, 184);
  pdf.text(copy.certifies, w / 2, 2.55, { align: "center" });

  pdf.setTextColor(255, 255, 255);
  setFace(true);
  pdf.setFontSize(28);
  pdf.text(name, w / 2, 3.25, { align: "center" });

  setFace(false);
  pdf.setFontSize(12);
  pdf.setTextColor(148, 163, 184);
  pdf.text(
    input.kind === "path" ? copy.completedPath : copy.completedModule,
    w / 2,
    3.85,
    { align: "center" },
  );

  pdf.setTextColor(brand.r, brand.g, brand.b);
  setFace(true);
  pdf.setFontSize(18);
  const title =
    input.kind === "module" && input.moduleNumber
      ? copy.modulePrefix(input.moduleNumber, input.achievementTitle)
      : input.achievementTitle;
  pdf.text(title, w / 2, 4.5, { align: "center", maxWidth: 9 });

  pdf.setTextColor(203, 213, 225);
  setFace(false);
  pdf.setFontSize(11);
  pdf.text(copy.local(local), w / 2, 5.35, { align: "center" });
  pdf.text(
    completedAt.toLocaleDateString(locale === "fr" ? "fr-CA" : "en-CA", {
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
  pdf.text(copy.disclaimer, w / 2, 7.55, {
    align: "center",
    maxWidth: 9,
  });

  const blob = pdf.output("blob");
  const filename =
    input.kind === "path"
      ? `unionops-officer-learning-path-${slugPart(name)}.pdf`
      : `unionops-officer-learning-module-${input.moduleNumber ?? "x"}-${slugPart(name)}.pdf`;
  await saveBlob(blob, filename);
}
