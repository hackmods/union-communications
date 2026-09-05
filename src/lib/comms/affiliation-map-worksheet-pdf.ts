import {
  COMMS_GUIDE_FOOTER,
  writeBrandedWorksheetPdf,
  type GuidePdfBrand,
  type GuidePdfLocale,
  type WorksheetSection,
} from "@/lib/export/text-pdf-layout";

const WORKSHEET_COPY = {
  en: {
    title: "Affiliation map: floor handout",
    subtitle: "Two tracks, not one ladder",
    instructions:
      "Pen in hand at executive or a steward meeting. Fill the names, then confirm standing before you speak for the local.",
    reminder:
      "Teaching map only. Not a certificate of affiliation and not legal advice. Confirm standing with your executive and parent union.",
    tips: {
      heading: "Floor tips",
      lines: [
        "Two tracks share the CLC. The local does not report to NUPGE, and NUPGE does not run the labour council.",
        "Area council is your union's locals in the city. Labour council is every affiliated union in the city.",
      ],
    },
    sections: [
      {
        heading: "Your local",
        intro: "One line you can print on a website and a board.",
        lines: [
          {
            kind: "fieldPair",
            left: { label: "Local name and number" },
            right: { label: "Employer or bargaining unit" },
          },
          {
            kind: "fieldPair",
            left: { label: "Who is filling this" },
            right: { label: "Date" },
          },
        ],
      },
      {
        heading: "Union family",
        intro: "Local to parent to national federation (if any) to the CLC.",
        lines: [
          { kind: "field", label: "Parent union" },
          {
            kind: "fieldPair",
            left: { label: "National federation (or none)" },
            right: { label: "CLC seat sits with" },
          },
          {
            kind: "text",
            text: "CUPE, Unifor, and many others skip the federation box and affiliate to the CLC as national unions.",
          },
        ],
      },
      {
        heading: "Geographic house",
        intro: "Local (or parent) to labour council to provincial federation to the CLC.",
        lines: [
          { kind: "field", label: "Labour council" },
          {
            kind: "fieldPair",
            left: { label: "Provincial or territorial federation" },
            right: { label: "Labour-council delegate" },
          },
          {
            kind: "field",
            label: "Union area or district council (if any)",
          },
        ],
      },
      {
        heading: "Confirm before you speak",
        intro: "A listing on someone else's website is not good standing.",
        lines: [
          {
            kind: "checkPair",
            left: "Executive confirmed the names",
            right: "Council secretary confirmed standing",
          },
          {
            kind: "checkPair",
            left: "Québec or non-CLC map checked",
            right: "Area council is not the labour council",
          },
          {
            kind: "field",
            label: "Next GMM: who reports labour council / area council",
          },
        ],
      },
    ] satisfies WorksheetSection[],
  },
  fr: {
    title: "Carte d'affiliation : feuille de terrain",
    subtitle: "Deux voies, pas une seule échelle",
    instructions:
      "Remplir à la main en exécutif ou en réunion de délégués. Inscrivez les noms, puis confirmez le statut avant de parler pour la section.",
    reminder:
      "Carte d'enseignement seulement. Pas un certificat d'affiliation et pas un avis juridique. Confirmez le statut auprès de votre exécutif et de votre syndicat parent.",
    tips: {
      heading: "Conseils sur le plancher",
      lines: [
        "Deux voies partagent le CTC. La section ne relève pas du NUPGE, et le NUPGE ne dirige pas le conseil du travail.",
        "Le conseil de secteur, ce sont les sections de votre syndicat dans la ville. Le conseil du travail, c'est chaque syndicat affilié dans la ville.",
      ],
    },
    sections: [
      {
        heading: "Votre section",
        intro: "Une ligne que vous pouvez imprimer sur un site et un tableau.",
        lines: [
          {
            kind: "fieldPair",
            left: { label: "Nom et numéro de la section" },
            right: { label: "Employeur ou unité de négociation" },
          },
          {
            kind: "fieldPair",
            left: { label: "Qui remplit cette feuille" },
            right: { label: "Date" },
          },
        ],
      },
      {
        heading: "Famille syndicale",
        intro:
          "Section, syndicat parent, fédération nationale (s'il y en a une), puis le CTC.",
        lines: [
          { kind: "field", label: "Syndicat parent" },
          {
            kind: "fieldPair",
            left: { label: "Fédération nationale (ou aucune)" },
            right: { label: "Le siège au CTC appartient à" },
          },
          {
            kind: "text",
            text: "Le SCFP, Unifor et beaucoup d'autres sautent la case fédération et s'affilient au CTC comme syndicats nationaux.",
          },
        ],
      },
      {
        heading: "Maison géographique",
        intro:
          "Section (ou parent), conseil du travail, fédération provinciale, puis le CTC.",
        lines: [
          { kind: "field", label: "Conseil du travail" },
          {
            kind: "fieldPair",
            left: { label: "Fédération provinciale ou territoriale" },
            right: { label: "Délégué au conseil du travail" },
          },
          {
            kind: "field",
            label: "Conseil de secteur ou de district (s'il y en a un)",
          },
        ],
      },
      {
        heading: "Confirmez avant de parler",
        intro: "Une mention sur le site de quelqu'un d'autre n'est pas un statut en règle.",
        lines: [
          {
            kind: "checkPair",
            left: "L'exécutif a confirmé les noms",
            right: "Le secrétaire du conseil a confirmé le statut",
          },
          {
            kind: "checkPair",
            left: "Carte hors CTC ou Québec vérifiée",
            right: "Le conseil de secteur n'est pas le conseil du travail",
          },
          {
            kind: "field",
            label: "Prochaine assemblée : qui rapporte le conseil du travail / de secteur",
          },
        ],
      },
    ] satisfies WorksheetSection[],
  },
} as const;

export async function downloadAffiliationMapWorksheetPdf(opts: {
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
        ? "unionops-carte-affiliation.pdf"
        : "unionops-affiliation-map.pdf",
    footer: COMMS_GUIDE_FOOTER[locale],
    brand: opts.brand,
  });
}
