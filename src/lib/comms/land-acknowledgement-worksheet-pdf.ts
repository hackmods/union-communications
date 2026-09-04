import {
  COMMS_GUIDE_FOOTER,
  writeBrandedWorksheetPdf,
  type GuidePdfBrand,
  type GuidePdfLocale,
  type WorksheetSection,
} from "@/lib/export/text-pdf-layout";

/** Fixed ruled rows for the Step 3 draft block (pen-and-paper paragraph space). */
export const LAND_ACK_DRAFT_ROWS = 5;
export const LAND_ACK_REFLECT_ROWS = 2;
export const LAND_ACK_RULE_ROW_HEIGHT = 15;
/** Tighter ruled rows when the prompt sits directly above (Step 2 reflect). */
export const LAND_ACK_REFLECT_ROW_HEIGHT = 10;

const WORKSHEET_COPY = {
  en: {
    title: "Land acknowledgement — floor handout",
    subtitle: "Research, write, commit — solo or workshop",
    instructions:
      "Pen in hand. Steps mirror the Land Acknowledgement Guide — confirm nation names before your next meeting.",
    reminder:
      "Education only — not a script to paste unchanged. Confirm territory, treaties, and follow-up with Indigenous sources and your federation guide.",
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
        intro: "Choose your path and note where your local meets.",
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
        heading: "Step 1 — Research",
        intro: "~20 min solo · ~25 min workshop · Complete before you draft.",
        lines: [
          {
            kind: "text",
            text: "Native-Land.ca, Whose Land, federation territory PDF — introductions, not final authority.",
          },
          { kind: "field", label: "Nations for where we meet" },
          {
            kind: "fieldPair",
            left: { label: "Treaties / agreements" },
            right: { label: "National / federation territory guide" },
          },
          {
            kind: "field",
            label: "Questions for Friendship Centre or band office",
          },
        ],
      },
      {
        heading: "Step 2 — Reflect",
        intro: "~10 min solo · opening round in workshop",
        lines: [
          {
            kind: "text",
            text: "One honest sentence — why this matters to your local:",
          },
          { kind: "ruled", count: LAND_ACK_REFLECT_ROWS, rowHeight: LAND_ACK_REFLECT_ROW_HEIGHT },
        ],
      },
      {
        heading: "Step 3 — Draft",
        intro: "~15 min solo · ~25 min in pairs at workshop",
        lines: [
          {
            kind: "text",
            text: "Territory, then one history thread or local action, then a commitment — in your own words:",
          },
          { kind: "ruled", count: LAND_ACK_DRAFT_ROWS, rowHeight: LAND_ACK_RULE_ROW_HEIGHT },
        ],
      },
      {
        heading: "Step 4 — Review and commit",
        intro: "~10 min solo · ~20 min workshop close · Checklist before you share.",
        lines: [
          {
            kind: "checkPair",
            left: "Accurate for this territory",
            right: "Speaker explains every phrase",
          },
          {
            kind: "checkPair",
            left: "Words paired with local action",
            right: "Indigenous Circle consulted if unsure",
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
    subtitle: "Recherche, rédaction, engagement — seul·e ou en atelier",
    instructions:
      "Remplir à la main. Les étapes reprennent le guide Reconnaissance territoriale — confirmez les noms de nations avant la prochaine réunion.",
    reminder:
      "Formation seulement — pas un texte à coller tel quel. Confirmez territoire, traités et suivi auprès de sources autochtones et du guide fédéral.",
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
        intro: "Choisissez votre voie et notez où votre section se réunit.",
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
        heading: "Étape 1 — Recherche",
        intro: "~20 min seul·e · ~25 min en atelier · Complétez avant de rédiger.",
        lines: [
          {
            kind: "text",
            text: "Native-Land.ca, Whose Land et PDF territorial fédéral — introductions, pas autorité finale.",
          },
          { kind: "field", label: "Nations où nous nous réunissons" },
          {
            kind: "fieldPair",
            left: { label: "Traités / ententes" },
            right: { label: "Guide territorial national / fédéral" },
          },
          {
            kind: "field",
            label: "Questions pour centre d'amitié ou bureau de bande",
          },
        ],
      },
      {
        heading: "Étape 2 — Réflexion",
        intro: "~10 min seul·e · tour d'ouverture en atelier",
        lines: [
          {
            kind: "text",
            text: "Une phrase honnête — pourquoi cela compte pour votre section :",
          },
          { kind: "ruled", count: LAND_ACK_REFLECT_ROWS, rowHeight: LAND_ACK_REFLECT_ROW_HEIGHT },
        ],
      },
      {
        heading: "Étape 3 — Rédaction",
        intro: "~15 min seul·e · ~25 min en duo à l'atelier",
        lines: [
          {
            kind: "text",
            text: "Territoire, puis un fil historique ou une action locale, puis un engagement — dans vos propres mots :",
          },
          { kind: "ruled", count: LAND_ACK_DRAFT_ROWS, rowHeight: LAND_ACK_RULE_ROW_HEIGHT },
        ],
      },
      {
        heading: "Étape 4 — Réviser et s'engager",
        intro: "~10 min seul·e · ~20 min clôture · Liste de contrôle avant de partager.",
        lines: [
          {
            kind: "checkPair",
            left: "Exact pour ce territoire",
            right: "La personne qui lit explique chaque phrase",
          },
          {
            kind: "checkPair",
            left: "Mots liés à une action locale",
            right: "Cercle autochtone consulté si incertain",
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
    layoutMode: "flow",
    sections: copy.sections.map((section) => ({
      heading: section.heading,
      intro: section.intro,
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
