import {
  COMMS_GUIDE_FOOTER,
  writeBrandedChecklistPdf,
  type GuidePdfBrand,
  type GuidePdfLocale,
} from "@/lib/export/text-pdf-layout";

const WORKSHEET_COPY = {
  en: {
    title: "Land acknowledgement writing worksheet",
    subtitle: "Solo draft or group workshop — research, write, commit",
    sections: [
      {
        heading: "Before you start",
        lines: [
          "Path: □ On my own  □ Group workshop",
          "Local / committee: ________________________________",
          "Date: ______________  Facilitator (if workshop): ______",
          "Meeting territory (city/campus): ____________________",
        ],
      },
      {
        heading: "Step 1 — Research (~20 min solo · ~25 min workshop)",
        lines: [
          "Nations for where we meet: ______________________________________",
          "Treaties / agreements: __________________________________________",
          "Federation guide used (OFL / national union / CUPE / other): ______",
          "Questions for Friendship Centre or band office: ___________________",
        ],
      },
      {
        heading: "Step 2 — Reflect (~10 min solo · opening block in workshop)",
        lines: [
          "Why acknowledgement matters to me / our local (one sentence):",
          "________________________________________________________________",
          "________________________________________________________________",
        ],
      },
      {
        heading: "Step 3 — Draft (~15 min solo · ~25 min in pairs at workshop)",
        lines: [
          "Draft (territory → history or action → commitment):",
          "________________________________________________________________",
          "________________________________________________________________",
          "________________________________________________________________",
          "________________________________________________________________",
        ],
      },
      {
        heading: "Step 4 — Review and commit (~10 min solo · ~20 min workshop close)",
        lines: [
          "□ Accurate for this territory (not copied from another city)",
          "□ Speaker can explain every phrase without notes",
          "□ Pairs words with one concrete local action",
          "□ Indigenous Circle / equity contact consulted if unsure",
          "Who reads it at the next meeting? _______________________________",
          "Executive review date: __________________________________________",
        ],
      },
      {
        heading: "Reminder",
        lines: [
          "This worksheet helps you write your own words. It is not a script to paste unchanged — confirm everything with Indigenous sources and your federation guide.",
        ],
      },
    ],
  },
  fr: {
    title: "Feuille de rédaction — reconnaissance territoriale",
    subtitle: "Seul·e ou atelier de groupe — recherche, rédaction, engagement",
    sections: [
      {
        heading: "Avant de commencer",
        lines: [
          "Voie : □ Seul·e  □ Atelier de groupe",
          "Section / comité : ______________________________________________",
          "Date : ______________  Facilitateur·rice (si atelier) : ________",
          "Territoire de la réunion (ville/campus) : _________________________",
        ],
      },
      {
        heading: "Étape 1 — Recherche (~20 min seul·e · ~25 min en atelier)",
        lines: [
          "Nations où nous nous réunissons : _______________________________",
          "Traités / ententes : ____________________________________________",
          "Guide fédéral utilisé (FTO / syndicat national / SCFP / autre) : _",
          "Questions pour centre d'amitié ou bureau de bande : _______________",
        ],
      },
      {
        heading: "Étape 2 — Réflexion (~10 min seul·e · ouverture en atelier)",
        lines: [
          "Pourquoi la reconnaissance compte pour moi / notre section (une phrase) :",
          "________________________________________________________________",
          "________________________________________________________________",
        ],
      },
      {
        heading: "Étape 3 — Rédaction (~15 min seul·e · ~25 min en duo à l'atelier)",
        lines: [
          "Ébauche (territoire → histoire ou action → engagement) :",
          "________________________________________________________________",
          "________________________________________________________________",
          "________________________________________________________________",
          "________________________________________________________________",
        ],
      },
      {
        heading: "Étape 4 — Réviser et s'engager (~10 min seul·e · ~20 min clôture)",
        lines: [
          "□ Exact pour ce territoire (pas copié d'une autre ville)",
          "□ La personne qui lit peut expliquer chaque phrase sans notes",
          "□ Les mots sont liés à une action locale concrète",
          "□ Cercle autochtone / contact équité consulté si incertain",
          "Qui lit à la prochaine réunion? _________________________________",
          "Date de revue exécutif : ________________________________________",
        ],
      },
      {
        heading: "Rappel",
        lines: [
          "Cette feuille aide à rédiger vos propres mots. Ce n'est pas un texte à coller tel quel — confirmez tout auprès de sources autochtones et du guide de votre fédération.",
        ],
      },
    ],
  },
} as const;

export async function downloadLandAcknowledgementWorksheetPdf(opts: {
  localLabel: string;
  locale: GuidePdfLocale;
  brand?: GuidePdfBrand | null;
}): Promise<void> {
  const locale = opts.locale === "fr" ? "fr" : "en";
  const copy = WORKSHEET_COPY[locale];

  await writeBrandedChecklistPdf({
    title: copy.title,
    subtitle: `${copy.subtitle} · ${opts.localLabel}`,
    sections: copy.sections.map((section) => ({
      heading: section.heading,
      lines: [...section.lines],
    })),
    filename:
      locale === "fr"
        ? "unionops-reconnaissance-territoriale-feuille.pdf"
        : "unionops-land-acknowledgement-worksheet.pdf",
    footer: COMMS_GUIDE_FOOTER[locale],
    brand: opts.brand,
  });
}
