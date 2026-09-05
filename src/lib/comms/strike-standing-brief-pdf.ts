import {
  COMMS_GUIDE_FOOTER,
  writeBrandedWorksheetPdf,
  type GuidePdfBrand,
  type GuidePdfLocale,
  type WorksheetSection,
} from "@/lib/export/text-pdf-layout";

/** Compact ruled rows for “facts in bounds today.” */
export const STRIKE_BRIEF_FACTS_ROWS = 2;
export const STRIKE_BRIEF_FACTS_ROW_HEIGHT = 12;

const BRIEF_COPY = {
  en: {
    title: "Captains' standing brief",
    subtitle: "Fill before the first gate opens",
    instructions:
      "Same facts as the notice at the gate. Confirm the Act and your union's strike protocol with your Staff Representative. Do not invent amounts or dates.",
    reminder:
      "Not legal advice. Not a national strike manual. Local executive and the strike committee decide. This sheet does not.",
    tips: {
      heading: "Floor tips",
      lines: [
        "If the notice disagrees with this brief, fix the brief, then copy it out.",
        "Captains hear the facts before any public note. Rumours go to the huddle, not the comment thread.",
      ],
    },
    sections: [
      {
        heading: "Who carries this",
        intro: "One captain, one named gate, one rotation.",
        lines: [
          {
            kind: "fieldPair",
            left: { label: "Captain" },
            right: { label: "Gate name" },
          },
          {
            kind: "fieldPair",
            left: { label: "Date" },
            right: { label: "Rotation / relief" },
          },
          { kind: "field", label: "Committee lead phone" },
        ],
      },
      {
        heading: "Named command",
        intro: "Volunteers rotate; jobs do not.",
        lines: [
          {
            kind: "fieldPair",
            left: { label: "President" },
            right: { label: "Strike committee lead" },
          },
          {
            kind: "fieldPair",
            left: { label: "Hardship contact" },
            right: { label: "Spokesperson" },
          },
          { kind: "field", label: "Staff Representative" },
        ],
      },
      {
        heading: "Gate facts",
        intro: "Use the same gate name as the strike page and the notice at the entrance.",
        lines: [
          { kind: "field", label: "Location (match the notice)" },
          {
            kind: "fieldPair",
            left: { label: "Indoor fallback" },
            right: { label: "Washrooms / weather cover" },
          },
          { kind: "text", text: "Facts in bounds today (no amounts you cannot pay):" },
          {
            kind: "ruled",
            count: STRIKE_BRIEF_FACTS_ROWS,
            rowHeight: STRIKE_BRIEF_FACTS_ROW_HEIGHT,
          },
        ],
      },
      {
        heading: "Before the shift",
        intro: "Tick these. A missing name is a leak.",
        lines: [
          {
            kind: "check",
            text: "Hardship path is who / how / when — no invented amount",
          },
          {
            kind: "check",
            text: "Captains hear facts before any public note",
          },
          {
            kind: "check",
            text: "Visitors go to the captain first",
          },
          {
            kind: "check",
            text: "Emergency first; do not film; injunctions go to servicing the same hour",
          },
        ],
      },
    ] satisfies WorksheetSection[],
  },
  fr: {
    title: "Consigne permanente des capitaines",
    subtitle: "Remplir avant l'ouverture de la première entrée",
    instructions:
      "Les mêmes faits que l'avis à l'entrée. Confirmez la loi et le protocole de grève de votre syndicat avec votre représentant de service. N'inventez pas de montants ni de dates.",
    reminder:
      "Pas un avis juridique. Pas un manuel national de grève. L'exécutif local et le comité de grève décident. Cette feuille ne le fait pas.",
    tips: {
      heading: "Conseils sur le plancher",
      lines: [
        "Si l'avis contredit cette consigne, corrigez la consigne, puis copiez-la.",
        "Les capitaines entendent les faits avant toute note publique. Les rumeurs vont au point des capitaines, pas au fil de commentaires.",
      ],
    },
    sections: [
      {
        heading: "Qui porte cette feuille",
        intro: "Un capitaine, une entrée nommée, une rotation.",
        lines: [
          {
            kind: "fieldPair",
            left: { label: "Capitaine" },
            right: { label: "Nom de l'entrée" },
          },
          {
            kind: "fieldPair",
            left: { label: "Date" },
            right: { label: "Rotation / relève" },
          },
          { kind: "field", label: "Téléphone du responsable de comité" },
        ],
      },
      {
        heading: "Commandement nommé",
        intro: "Les bénévoles tournent ; les jobs ne tournent pas.",
        lines: [
          {
            kind: "fieldPair",
            left: { label: "Président" },
            right: { label: "Responsable du comité de grève" },
          },
          {
            kind: "fieldPair",
            left: { label: "Contact d'aide d'urgence" },
            right: { label: "Porte-parole" },
          },
          { kind: "field", label: "Représentant de service" },
        ],
      },
      {
        heading: "Faits à l'entrée",
        intro: "Utilisez le même nom d'entrée que la page de grève et l'avis à l'entrée.",
        lines: [
          { kind: "field", label: "Lieu (identique à l'avis)" },
          {
            kind: "fieldPair",
            left: { label: "Repli intérieur" },
            right: { label: "Toilettes / abri météo" },
          },
          {
            kind: "text",
            text: "Faits dans les limites aujourd'hui (aucun montant que vous ne pouvez pas payer) :",
          },
          {
            kind: "ruled",
            count: STRIKE_BRIEF_FACTS_ROWS,
            rowHeight: STRIKE_BRIEF_FACTS_ROW_HEIGHT,
          },
        ],
      },
      {
        heading: "Avant le quart",
        intro: "Cochez. Un nom manquant est une fuite.",
        lines: [
          {
            kind: "check",
            text: "Le chemin d'aide d'urgence est qui / comment / quand — aucun montant inventé",
          },
          {
            kind: "check",
            text: "Les capitaines entendent les faits avant toute note publique",
          },
          {
            kind: "check",
            text: "Les visiteurs passent d'abord par le capitaine",
          },
          {
            kind: "check",
            text: "L'urgence d'abord ; ne filmez pas ; les injonctions vont au service dans l'heure",
          },
        ],
      },
    ] satisfies WorksheetSection[],
  },
} as const;

export async function downloadStrikeStandingBriefPdf(opts: {
  localLabel: string;
  locale: GuidePdfLocale;
  brand?: GuidePdfBrand | null;
}): Promise<void> {
  const locale = opts.locale === "fr" ? "fr" : "en";
  const copy = BRIEF_COPY[locale];

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
        ? "unionops-consigne-permanente-greve.pdf"
        : "unionops-strike-standing-brief.pdf",
    footer: COMMS_GUIDE_FOOTER[locale],
    brand: opts.brand,
  });
}
