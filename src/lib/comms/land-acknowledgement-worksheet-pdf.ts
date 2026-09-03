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
          { kind: "field", label: "Local / committee" },
          { kind: "field", label: "Date" },
          { kind: "field", label: "Facilitator (if workshop)" },
          { kind: "field", label: "Meeting territory (city / campus)" },
        ],
      },
      {
        heading: "Step 1 — Research (~20 min solo · ~25 min workshop)",
        intro: "Native-Land.ca, Whose Land, and your federation territory PDF — introductions, not final authority.",
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
        intro: "One honest sentence — why this matters to you or your local.",
        lines: [
          {
            kind: "text",
            text: "Why acknowledgement matters to me / our local:",
          },
          { kind: "ruled", count: 3 },
        ],
      },
      {
        heading: "Step 3 — Draft (~15 min solo · ~25 min in pairs at workshop)",
        intro: "Territory → one history thread or local action → commitment to follow up.",
        lines: [
          { kind: "text", text: "Draft in your own words:" },
          { kind: "ruled", count: 5, rowHeight: 18 },
        ],
      },
      {
        heading: "Step 4 — Review and commit (~10 min solo · ~20 min workshop close)",
        intro: "Run every check before executive adoption or reading aloud.",
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
          { kind: "field", label: "Section / comité" },
          { kind: "field", label: "Date" },
          { kind: "field", label: "Facilitateur·rice (si atelier)" },
          { kind: "field", label: "Territoire de la réunion (ville / campus)" },
        ],
      },
      {
        heading: "Étape 1 — Recherche (~20 min seul·e · ~25 min en atelier)",
        intro:
          "Native-Land.ca, Whose Land et PDF territorial fédéral — introductions, pas autorité finale.",
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
        intro: "Une phrase honnête — pourquoi cela compte pour vous ou votre section.",
        lines: [
          {
            kind: "text",
            text: "Pourquoi la reconnaissance compte pour moi / notre section :",
          },
          { kind: "ruled", count: 3 },
        ],
      },
      {
        heading: "Étape 3 — Rédaction (~15 min seul·e · ~25 min en duo à l'atelier)",
        intro:
          "Territoire → fil historique ou action locale → engagement de suivi.",
        lines: [
          { kind: "text", text: "Ébauche dans vos propres mots :" },
          { kind: "ruled", count: 5, rowHeight: 18 },
        ],
      },
      {
        heading: "Étape 4 — Réviser et s'engager (~10 min seul·e · ~20 min clôture)",
        intro:
          "Cochez chaque point avant l'adoption exécutive ou une lecture à voix haute.",
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
    instructions: copy.instructions,
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
