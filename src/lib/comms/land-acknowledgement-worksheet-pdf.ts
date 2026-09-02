import {
  COMMS_GUIDE_FOOTER,
  writeBrandedChecklistPdf,
  type GuidePdfBrand,
  type GuidePdfLocale,
} from "@/lib/export/text-pdf-layout";

const WORKSHEET_COPY = {
  en: {
    title: "Land acknowledgement writing walkthrough",
    subtitle: "Four-person worksheet — research, draft, and commit",
    sections: [
      {
        heading: "Before you meet",
        lines: [
          "Local / committee: ________________________________",
          "Date: ______________  Facilitator: __________________",
          "Meeting territory (city/campus): ____________________",
        ],
      },
      {
        heading: "Step 1 — Assign roles (~5 min)",
        lines: [
          "Research lead (Native-Land.ca, Whose Land, federation PDF): ________",
          "History lead (treaties, local context, spellings): __________________",
          "Draft lead (combines wording in the room's voice): _________________",
          "Action lead (follow-up owner + executive date): ___________________",
        ],
      },
      {
        heading: "Step 2 — Research together (~20 min)",
        lines: [
          "Nations for where we meet: ______________________________________",
          "Treaties / agreements: __________________________________________",
          "Federation guide used (OFL / national union / CUPE / other): ______",
          "Questions for Friendship Centre or band office: ___________________",
        ],
      },
      {
        heading: "Step 3 — Reflect and draft (~25 min)",
        lines: [
          "Each person — why acknowledgement matters to you (one sentence):",
          "________________________________________________________________",
          "________________________________________________________________",
          "Combined draft (territory → history or action → commitment):",
          "________________________________________________________________",
          "________________________________________________________________",
          "________________________________________________________________",
        ],
      },
      {
        heading: "Step 4 — Review and commit (~10 min)",
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
    title: "Atelier de rédaction — reconnaissance territoriale",
    subtitle: "Feuille pour quatre personnes — recherche, rédaction, engagement",
    sections: [
      {
        heading: "Avant la rencontre",
        lines: [
          "Section / comité : ______________________________________________",
          "Date : ______________  Facilitateur·rice : ______________________",
          "Territoire de la réunion (ville/campus) : _________________________",
        ],
      },
      {
        heading: "Étape 1 — Répartir les rôles (~5 min)",
        lines: [
          "Recherche (Native-Land.ca, Whose Land, PDF fédéral) : _____________",
          "Histoire (traités, contexte local, orthographes) : ________________",
          "Rédaction (combine les mots dans la voix du groupe) : _____________",
          "Action (responsable du suivi + date exécutif) : _________________",
        ],
      },
      {
        heading: "Étape 2 — Rechercher ensemble (~20 min)",
        lines: [
          "Nations où nous nous réunissons : _______________________________",
          "Traités / ententes : ____________________________________________",
          "Guide fédéral utilisé (FTO / syndicat national / SCFP / autre) : _",
          "Questions pour centre d'amitié ou bureau de bande : _______________",
        ],
      },
      {
        heading: "Étape 3 — Réfléchir et rédiger (~25 min)",
        lines: [
          "Chaque personne — pourquoi la reconnaissance compte (une phrase) :",
          "________________________________________________________________",
          "________________________________________________________________",
          "Ébauche combinée (territoire → histoire ou action → engagement) :",
          "________________________________________________________________",
          "________________________________________________________________",
          "________________________________________________________________",
        ],
      },
      {
        heading: "Étape 4 — Réviser et s'engager (~10 min)",
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
        ? "unionops-reconnaissance-territoriale-atelier.pdf"
        : "unionops-land-acknowledgement-writing-walkthrough.pdf",
    footer: COMMS_GUIDE_FOOTER[locale],
    brand: opts.brand,
  });
}
