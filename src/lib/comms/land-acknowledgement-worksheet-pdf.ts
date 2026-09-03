import {
  COMMS_GUIDE_FOOTER,
  writeBrandedWorksheetPdf,
  type GuidePdfBrand,
  type GuidePdfLocale,
  type WorksheetSection,
} from "@/lib/export/text-pdf-layout";

const WORKSHEET_COPY = {
  en: {
    title: "Land acknowledgement writing worksheet",
    subtitle: "Solo draft or group workshop — research, write, commit",
    reminder:
      "This worksheet helps you write your own words. It is not a script to paste unchanged — confirm everything with Indigenous sources and your federation guide.",
    sections: [
      {
        heading: "Before you start",
        lines: [
          { kind: "text", text: "Path: □ On my own    □ Group workshop" },
          { kind: "field", label: "Local / committee" },
          { kind: "field", label: "Date" },
          { kind: "field", label: "Facilitator (if workshop)" },
          { kind: "field", label: "Meeting territory (city / campus)" },
        ],
      },
      {
        heading: "Step 1 — Research (~20 min solo · ~25 min workshop)",
        lines: [
          { kind: "field", label: "Nations for where we meet" },
          { kind: "field", label: "Treaties / agreements" },
          {
            kind: "field",
            label: "Federation guide used (OFL / national union / CUPE / other)",
          },
          {
            kind: "field",
            label: "Questions for Friendship Centre or band office",
          },
        ],
      },
      {
        heading: "Step 2 — Reflect (~10 min solo · opening block in workshop)",
        lines: [
          {
            kind: "text",
            text: "Why acknowledgement matters to me / our local (one sentence):",
          },
          { kind: "ruled", count: 3 },
        ],
      },
      {
        heading: "Step 3 — Draft (~15 min solo · ~25 min in pairs at workshop)",
        lines: [
          {
            kind: "text",
            text: "Draft (territory → history or action → commitment):",
          },
          { kind: "ruled", count: 5, rowHeight: 18 },
        ],
      },
      {
        heading: "Step 4 — Review and commit (~10 min solo · ~20 min workshop close)",
        lines: [
          {
            kind: "check",
            text: "Accurate for this territory (not copied from another city)",
          },
          {
            kind: "check",
            text: "Speaker can explain every phrase without notes",
          },
          {
            kind: "check",
            text: "Pairs words with one concrete local action",
          },
          {
            kind: "check",
            text: "Indigenous Circle / equity contact consulted if unsure",
          },
          { kind: "field", label: "Who reads it at the next meeting?" },
          { kind: "field", label: "Executive review date" },
        ],
      },
    ] satisfies WorksheetSection[],
  },
  fr: {
    title: "Feuille de rédaction — reconnaissance territoriale",
    subtitle: "Seul·e ou atelier de groupe — recherche, rédaction, engagement",
    reminder:
      "Cette feuille aide à rédiger vos propres mots. Ce n'est pas un texte à coller tel quel — confirmez tout auprès de sources autochtones et du guide de votre fédération.",
    sections: [
      {
        heading: "Avant de commencer",
        lines: [
          { kind: "text", text: "Voie : □ Seul·e    □ Atelier de groupe" },
          { kind: "field", label: "Section / comité" },
          { kind: "field", label: "Date" },
          { kind: "field", label: "Facilitateur·rice (si atelier)" },
          { kind: "field", label: "Territoire de la réunion (ville / campus)" },
        ],
      },
      {
        heading: "Étape 1 — Recherche (~20 min seul·e · ~25 min en atelier)",
        lines: [
          { kind: "field", label: "Nations où nous nous réunissons" },
          { kind: "field", label: "Traités / ententes" },
          {
            kind: "field",
            label: "Guide fédéral utilisé (FTO / syndicat national / SCFP / autre)",
          },
          {
            kind: "field",
            label: "Questions pour centre d'amitié ou bureau de bande",
          },
        ],
      },
      {
        heading: "Étape 2 — Réflexion (~10 min seul·e · ouverture en atelier)",
        lines: [
          {
            kind: "text",
            text: "Pourquoi la reconnaissance compte pour moi / notre section (une phrase) :",
          },
          { kind: "ruled", count: 3 },
        ],
      },
      {
        heading: "Étape 3 — Rédaction (~15 min seul·e · ~25 min en duo à l'atelier)",
        lines: [
          {
            kind: "text",
            text: "Ébauche (territoire → histoire ou action → engagement) :",
          },
          { kind: "ruled", count: 5, rowHeight: 18 },
        ],
      },
      {
        heading: "Étape 4 — Réviser et s'engager (~10 min seul·e · ~20 min clôture)",
        lines: [
          {
            kind: "check",
            text: "Exact pour ce territoire (pas copié d'une autre ville)",
          },
          {
            kind: "check",
            text: "La personne qui lit peut expliquer chaque phrase sans notes",
          },
          {
            kind: "check",
            text: "Les mots sont liés à une action locale concrète",
          },
          {
            kind: "check",
            text: "Cercle autochtone / contact équité consulté si incertain",
          },
          { kind: "field", label: "Qui lit à la prochaine réunion?" },
          { kind: "field", label: "Date de revue exécutif" },
        ],
      },
    ] satisfies WorksheetSection[],
  },
} as const;

export async function downloadLandAcknowledgementWorksheetPdf(opts: {
  localLabel: string;
  locale: GuidePdfLocale;
  brand?: GuidePdfBrand | null;
}): Promise<void> {
  const locale = opts.locale === "fr" ? "fr" : "en";
  const copy = WORKSHEET_COPY[locale];

  await writeBrandedWorksheetPdf({
    title: copy.title,
    subtitle: `${copy.subtitle} · ${opts.localLabel}`,
    sections: copy.sections.map((section) => ({
      heading: section.heading,
      lines: section.lines.map((line) => ({ ...line })),
    })),
    reminder: copy.reminder,
    filename:
      locale === "fr"
        ? "unionops-reconnaissance-territoriale-feuille.pdf"
        : "unionops-land-acknowledgement-worksheet.pdf",
    footer: COMMS_GUIDE_FOOTER[locale],
    brand: opts.brand,
  });
}
