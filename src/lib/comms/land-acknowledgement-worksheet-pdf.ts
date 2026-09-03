import {
  COMMS_GUIDE_FOOTER,
  writeBrandedWorksheetPdf,
  type GuidePdfBrand,
  type GuidePdfLocale,
  type WorksheetSection,
} from "@/lib/export/text-pdf-layout";

const WORKSHEET_COPY = {
  en: {
    title: "Land acknowledgement — floor handout",
    subtitle: "Solo draft or group workshop · research, write, commit",
    instructions:
      "Fill in pen. Steps match unionops.org/guide/land-acknowledgement — confirm nation names and spellings before your next meeting.",
    reminder:
      "Education only — not a script to paste unchanged. Confirm territory, treaties, and follow-up action with Indigenous sources and your federation guide.",
    tips: {
      heading: "Floor tips",
      lines: [
        "Territory first — name the nations and treaties for where you meet, not another city.",
        "If you cannot explain a phrase without notes, cut it or rewrite in your own words.",
      ],
    },
    sections: [
      {
        heading: "Before you start",
        lines: [
          { kind: "text", text: "Path: □ On my own    □ Group workshop" },
          {
            kind: "fieldPair",
            left: { label: "Local / committee" },
            right: { label: "Date" },
          },
          {
            kind: "fieldPair",
            left: { label: "Facilitator (if workshop)" },
            right: { label: "Meeting territory (city / campus)" },
          },
        ],
      },
      {
        heading: "Step 1 — Research (~20 min solo · ~25 min workshop)",
        lines: [
          {
            kind: "text",
            text: "Native-Land.ca, Whose Land, federation territory PDF — introductions, not final authority.",
          },
          { kind: "field", label: "Nations for where we meet" },
          {
            kind: "fieldPair",
            left: { label: "Treaties / agreements" },
            right: { label: "Federation guide (OFL / national / CUPE / other)" },
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
            text: "One honest sentence — why acknowledgement matters to me / our local:",
          },
          { kind: "ruled", count: 2, rowHeight: 18 },
        ],
      },
      {
        heading: "Step 3 — Draft (~15 min solo · ~25 min in pairs at workshop)",
        lines: [
          {
            kind: "text",
            text: "Territory → one history thread or local action → commitment to follow up. Draft in your own words:",
          },
          { kind: "ruled", fill: true, minRows: 5, rowHeight: 20 },
        ],
      },
    ] satisfies WorksheetSection[],
    closingSections: [
      {
        heading: "Step 4 — Review and commit (~10 min solo · ~20 min workshop close)",
        lines: [
          {
            kind: "checkPair",
            left: "Accurate for this territory (not another city)",
            right: "Speaker can explain every phrase without notes",
          },
          {
            kind: "checkPair",
            left: "Pairs words with one concrete local action",
            right: "Indigenous Circle / equity contact consulted if unsure",
          },
          {
            kind: "fieldPair",
            left: { label: "Who reads it at the next meeting?" },
            right: { label: "Executive review date" },
          },
        ],
      },
    ] satisfies WorksheetSection[],
  },
  fr: {
    title: "Reconnaissance territoriale — feuille de terrain",
    subtitle: "Seul·e ou atelier de groupe · recherche, rédaction, engagement",
    instructions:
      "Remplir à la main. Les étapes suivent unionops.org/guide/land-acknowledgement — confirmez noms de nations et orthographes avant la prochaine réunion.",
    reminder:
      "Formation seulement — pas un texte à coller tel quel. Confirmez territoire, traités et action de suivi auprès de sources autochtones et du guide fédéral.",
    tips: {
      heading: "Conseils sur le plancher",
      lines: [
        "Territoire d'abord — nommez nations et traités où vous vous réunissez, pas une autre ville.",
        "Si vous ne pouvez pas expliquer une phrase sans notes, coupez-la ou réécrivez-la.",
      ],
    },
    sections: [
      {
        heading: "Avant de commencer",
        lines: [
          { kind: "text", text: "Voie : □ Seul·e    □ Atelier de groupe" },
          {
            kind: "fieldPair",
            left: { label: "Section / comité" },
            right: { label: "Date" },
          },
          {
            kind: "fieldPair",
            left: { label: "Facilitateur·rice (si atelier)" },
            right: { label: "Territoire de la réunion (ville / campus)" },
          },
        ],
      },
      {
        heading: "Étape 1 — Recherche (~20 min seul·e · ~25 min en atelier)",
        lines: [
          {
            kind: "text",
            text: "Native-Land.ca, Whose Land et PDF territorial fédéral — introductions, pas autorité finale.",
          },
          { kind: "field", label: "Nations où nous nous réunissons" },
          {
            kind: "fieldPair",
            left: { label: "Traités / ententes" },
            right: { label: "Guide fédéral (FTO / national / SCFP / autre)" },
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
            text: "Une phrase honnête — pourquoi la reconnaissance compte pour moi / notre section :",
          },
          { kind: "ruled", count: 2, rowHeight: 18 },
        ],
      },
      {
        heading: "Étape 3 — Rédaction (~15 min seul·e · ~25 min en duo à l'atelier)",
        lines: [
          {
            kind: "text",
            text: "Territoire → fil historique ou action locale → engagement de suivi. Ébauche dans vos propres mots :",
          },
          { kind: "ruled", fill: true, minRows: 5, rowHeight: 20 },
        ],
      },
    ] satisfies WorksheetSection[],
    closingSections: [
      {
        heading: "Étape 4 — Réviser et s'engager (~10 min seul·e · ~20 min clôture)",
        lines: [
          {
            kind: "checkPair",
            left: "Exact pour ce territoire (pas une autre ville)",
            right: "La personne qui lit peut expliquer chaque phrase sans notes",
          },
          {
            kind: "checkPair",
            left: "Les mots sont liés à une action locale concrète",
            right: "Cercle autochtone / contact équité consulté si incertain",
          },
          {
            kind: "fieldPair",
            left: { label: "Qui lit à la prochaine réunion?" },
            right: { label: "Date de revue exécutif" },
          },
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
    instructions: copy.instructions,
    sections: copy.sections.map((section) => ({
      heading: section.heading,
      lines: section.lines.map((line) => ({ ...line })),
    })),
    closingSections: copy.closingSections.map((section) => ({
      heading: section.heading,
      lines: section.lines.map((line) => ({ ...line })),
    })),
    tips: copy.tips,
    reminder: copy.reminder,
    filename:
      locale === "fr"
        ? "unionops-reconnaissance-territoriale-feuille.pdf"
        : "unionops-land-acknowledgement-worksheet.pdf",
    footer: COMMS_GUIDE_FOOTER[locale],
    brand: opts.brand,
  });
}
