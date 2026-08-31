/**
 * Branded pocket PDFs for the Union Boards guide.
 */

import {
  COMMS_GUIDE_FOOTER,
  writeBrandedChecklistPdf,
  writeBrandedNotesPdf,
  type GuidePdfBrand,
  type GuidePdfLocale,
} from "@/lib/export/text-pdf-layout";
import { COMMS_SOURCES } from "@/lib/constants/comms-sources";
import type { BoardPdfReferenceId } from "@/lib/constants/board-materials";

function sourceLabel(id: string): string {
  return COMMS_SOURCES[id]?.label ?? id;
}

const BOARD_PRINT_CHECKLIST_COPY = {
  en: {
    title: "Union board print checklist",
    sections: [
      {
        heading: "Always print (bare minimum)",
        lines: [
          "Local header / logo (Brand Kit) — or a Board Banner strip from the Board Banner & Trim tool",
          "Socials flyer with QR to this hub or your local site",
          "Health & safety contacts (JHSC / steward H&S)",
          "LEC / steward contact list",
          "Events / rotating notice (meeting, bargaining update, or solidarity poster)",
        ],
      },
      {
        heading: "Standing resources (QR flyer or pocket)",
        lines: [
          "Your collective agreement (full-time / part-time as applicable)",
          sourceLabel("ontario-esa-guide"),
          "ESA poster (print PDF from UnionOps /assets)",
          sourceLabel("ontario-lra-s74"),
          sourceLabel("ohrc-code-rights"),
        ],
      },
      {
        heading: "Workplace health & safety",
        lines: [
          sourceLabel("ontario-ohsa-guide"),
          sourceLabel("ontario-ohsa"),
          "In case of injury at work (Form 82) — print PDF from UnionOps /assets",
          sourceLabel("ontario-required-posters"),
        ],
      },
      {
        heading: "Local documents (swap for yours)",
        lines: [
          "Local bylaws",
          "Latest GMM agenda / minutes (remove after the meeting)",
          "Part-time / next-meeting flyer",
          "National / parent-union constitution (if your local posts it)",
        ],
      },
      {
        heading: "Tip",
        lines: [
          "Keep ministry posters and contact lists permanent. Rotate only the events slot and solidarity filler so the board never looks empty or outdated.",
        ],
      },
    ],
  },
  fr: {
    title: "Liste d'impression — tableau syndical",
    sections: [
      {
        heading: "Toujours imprimer (minimum)",
        lines: [
          "En-tête / logo local (Trousse de marque) — ou une bande d'affichage via l'outil Bandeau et finition",
          "Affiche réseaux sociaux avec code QR vers ce hub ou votre site local",
          "Contacts santé et sécurité (CPPSST / délégué S&S)",
          "Liste du CEL / des délégués",
          "Événements / avis rotatif (assemblée, mise à jour de négociation ou affiche de solidarité)",
        ],
      },
      {
        heading: "Ressources permanentes (QR ou fiche)",
        lines: [
          "Votre convention collective (TP/TPS selon le cas)",
          sourceLabel("ontario-esa-guide"),
          "Affiche LNT (PDF imprimable depuis UnionOps /assets)",
          sourceLabel("ontario-lra-s74"),
          sourceLabel("ohrc-code-rights"),
        ],
      },
      {
        heading: "Santé et sécurité au travail",
        lines: [
          sourceLabel("ontario-ohsa-guide"),
          sourceLabel("ontario-ohsa"),
          "En cas de blessure au travail (formulaire 82) — PDF UnionOps /assets",
          sourceLabel("ontario-required-posters"),
        ],
      },
      {
        heading: "Documents locaux (remplacez par les vôtres)",
        lines: [
          "Règlements locaux",
          "Ordre du jour / procès-verbal de la dernière AGA (retirez après la réunion)",
          "Affiche temps partiel / prochaine assemblée",
          "Constitution nationale / parente (si votre local l'affiche)",
        ],
      },
      {
        heading: "Conseil",
        lines: [
          "Gardez les affiches ministérielles et les listes de contacts en place. Changez seulement la zone événements et le remplissage solidarité pour que le tableau reste à jour.",
        ],
      },
    ],
  },
} as const;

const OHSA_QR_TIP_COPY = {
  en: {
    title: "Accessing the OHSA from a phone",
    body: [
      "Post a small card next to your health & safety zone:",
      "",
      "1. Open the camera app",
      `2. Point at a QR code that links to ${sourceLabel("ontario-ohsa")}`,
      "3. Follow the on-screen prompt",
      "",
      `Also link ${sourceLabel("ontario-ohsa-guide")} for plain-language worker rights (right to know, participate, and refuse unsafe work).`,
      "",
      "Do not pin an outdated photocopy of the full Act — link the live statute so members always get current law.",
    ].join("\n"),
  },
  fr: {
    title: "Accéder à la LSST depuis un téléphone",
    body: [
      "Affichez une petite fiche près de votre zone santé et sécurité :",
      "",
      "1. Ouvrez l'application appareil photo",
      `2. Visez un code QR qui mène à ${sourceLabel("ontario-ohsa")}`,
      "3. Suivez l'invite à l'écran",
      "",
      `Ajoutez aussi ${sourceLabel("ontario-ohsa-guide")} pour les droits en langage clair (savoir, participer et refuser un travail dangereux).`,
      "",
      "N'affichez pas une photocopie périmée de la loi complète — liez le texte à jour pour que les membres aient toujours la loi actuelle.",
    ].join("\n"),
  },
} as const;

export async function downloadBoardReferencePdf(opts: {
  kind: BoardPdfReferenceId;
  localLabel: string;
  locale?: GuidePdfLocale;
  brand?: GuidePdfBrand;
}): Promise<void> {
  const locale = opts.locale ?? "en";
  const footer = COMMS_GUIDE_FOOTER[locale];

  if (opts.kind === "board-checklist") {
    const copy = BOARD_PRINT_CHECKLIST_COPY[locale];
    await writeBrandedChecklistPdf({
      title: copy.title,
      subtitle: opts.localLabel,
      sections: copy.sections.map((section) => ({
        heading: section.heading,
        lines: [...section.lines],
      })),
      filename: `unionops-board-print-checklist-${locale}.pdf`,
      footer,
      brand: opts.brand,
    });
    return;
  }

  const copy = OHSA_QR_TIP_COPY[locale];
  await writeBrandedNotesPdf({
    title: copy.title,
    body: copy.body,
    filename: `unionops-ohsa-qr-tip-${locale}.pdf`,
    footer,
    brand: opts.brand,
  });
}
