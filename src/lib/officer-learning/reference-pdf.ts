/**
 * Pocket reference PDFs for Officer Learning floor use.
 * Chrome via text-pdf-layout (UnionOps mark + education footer).
 */

import {
  EDUCATION_FOOTER,
  writeBrandedChecklistPdf,
  type GuidePdfBrand,
  type GuidePdfLocale,
} from "@/lib/export/text-pdf-layout";

function slugPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 40);
}

export type ReferencePdfLocale = GuidePdfLocale;

type ModulePdfContext = {
  moduleTitle: string;
  localLabel: string;
  locale?: ReferencePdfLocale;
  brand?: GuidePdfBrand;
};

function resolveLocale(locale?: ReferencePdfLocale): ReferencePdfLocale {
  return locale ?? "en";
}

/** Blank FAR sheet for Step 1 meetings (module 1 pocket card). */
export async function downloadFarSheetPdf(opts: ModulePdfContext): Promise<void> {
  const locale = resolveLocale(opts.locale);
  const copy =
    locale === "fr"
      ? {
          title: "Feuille FAR — Faits / Argument / Résolution",
          sections: [
            {
              heading: "Faits (quoi s'est passé — dates, personnes, documents)",
              lines: [
                "Qui / quand / où (joindre notes) :",
                "Article ou pratique invoqué :",
                "Emplacement des preuves (courriel, horaire, témoins) :",
              ],
            },
            {
              heading: "Argument (pourquoi l'employeur a violé une norme contraignante)",
              lines: [
                "Résultat du filtre en 5 points (plainte ou grief) :",
                "Norme contraignante violée :",
                "Défense anticipée de l'employeur :",
              ],
            },
            {
              heading: "Résolution (demande précise et exécutoire)",
              lines: [
                "Réparation intégrale demandée :",
                "Échéance / étape demandée :",
                "Membre contacté; notes sécurisées :",
              ],
            },
          ],
        }
      : {
          title: "FAR sheet — Facts / Argument / Resolution",
          sections: [
            {
              heading: "Facts (what happened — dates, people, documents)",
              lines: [
                "Who / when / where (attach notes):",
                "Contract article or practice cited:",
                "Evidence locations (email, time clock, witnesses):",
              ],
            },
            {
              heading: "Argument (why the employer breached a binding standard)",
              lines: [
                "5-point filter result (complaint vs grievance):",
                "Binding standard violated:",
                "Employer defence anticipated:",
              ],
            },
            {
              heading: "Resolution (specific, enforceable WANT)",
              lines: [
                "Make-whole remedy requested:",
                "Deadline / step requested:",
                "Member contacted; notes secured:",
              ],
            },
          ],
        };

  await writeBrandedChecklistPdf({
    title: copy.title,
    subtitle: `${opts.moduleTitle} · ${opts.localLabel}`,
    sections: copy.sections,
    filename: `unionops-far-sheet-${slugPart(opts.moduleTitle)}.pdf`,
    footer: EDUCATION_FOOTER[locale],
    brand: opts.brand,
  });
}

/** Discipline meeting rights sheet (module 2). */
export async function downloadDisciplineRightsPdf(opts: ModulePdfContext): Promise<void> {
  const locale = resolveLocale(opts.locale);
  const copy =
    locale === "fr"
      ? {
          title: "Rencontre disciplinaire — fiche de poche du délégué",
          sections: [
            {
              heading: "Avant la rencontre",
              lines: [
                "Préavis raisonnable du caractère disciplinaire donné?",
                "Le membre connaît ses droits à la représentation?",
                "Divulgation complète demandée avant les réponses?",
                "Étapes antérieures de l'échelle documentées?",
              ],
            },
            {
              heading: "Probes de cause juste",
              lines: [
                "Règle prévisible communiquée?",
                "Enquête avant la sanction?",
                "Sanction proportionnée à l'infraction et au dossier?",
                "Facteurs atténuants au dossier?",
              ],
            },
            {
              heading: "Au dossier",
              lines: [
                "Notes prises; le membre ne spécule pas",
                "Question obéir-maintenant-grever-plus-tard signalée si pertinent",
                "Lettre de conseil proposée si approprié",
              ],
            },
          ],
        }
      : {
          title: "Discipline meeting — steward pocket sheet",
          sections: [
            {
              heading: "Before the meeting",
              lines: [
                "Reasonable notice of disciplinary focus given?",
                "Member knows representation rights?",
                "Full disclosure requested before answers?",
                "Prior rungs on ladder documented?",
              ],
            },
            {
              heading: "Just cause probes",
              lines: [
                "Foreseeable rule communicated?",
                "Investigation before penalty?",
                "Penalty fits offence and record?",
                "Mitigating factors on the record?",
              ],
            },
            {
              heading: "On the record",
              lines: [
                "Notes taken; member not speculating",
                "Obey-now-grieve-later issue flagged if relevant",
                "Letter of counsel proposed if appropriate",
              ],
            },
          ],
        };

  await writeBrandedChecklistPdf({
    title: copy.title,
    subtitle: `${opts.moduleTitle} · ${opts.localLabel}`,
    sections: copy.sections,
    filename: `unionops-discipline-rights-${slugPart(opts.moduleTitle)}.pdf`,
    footer: EDUCATION_FOOTER[locale],
    brand: opts.brand,
  });
}

/** Meiorin BFOR test worksheet (module 3). */
export async function downloadMeiorinSheetPdf(opts: ModulePdfContext): Promise<void> {
  const locale = resolveLocale(opts.locale);
  const copy =
    locale === "fr"
      ? {
          title: "Test Meiorin (EPJ) — fiche d'adaptation",
          sections: [
            {
              heading: "Test Meiorin en trois étapes",
              lines: [
                "1. Lien rationnel avec l'exécution du poste?",
                "2. Adopté de bonne foi?",
                "3. Impossible d'accommoder sans contrainte excessive?",
              ],
            },
            {
              heading: "Contrainte excessive — l'employeur doit prouver",
              lines: [
                "Coût (avec preuve)",
                "Financement externe exploré",
                "Risque pour la santé et la sécurité documenté",
              ],
            },
            {
              heading: "Pas une contrainte excessive (contester)",
              lines: [
                "Moral des collègues ou préférence",
                "Préférence de la clientèle",
                "Conflit avec la convention seulement",
              ],
            },
          ],
        }
      : {
          title: "Meiorin BFOR test — accommodation worksheet",
          sections: [
            {
              heading: "Meiorin three-step test",
              lines: [
                "1. Rational connection to performing the job?",
                "2. Adopted in honest good faith?",
                "3. Impossible to accommodate without undue hardship?",
              ],
            },
            {
              heading: "Undue hardship — employer must prove",
              lines: [
                "Cost (with evidence)",
                "Outside funding explored",
                "Health and safety risk documented",
              ],
            },
            {
              heading: "Not undue hardship (push back)",
              lines: [
                "Co-worker morale or preference",
                "Customer preference",
                "Collective agreement conflict alone",
              ],
            },
          ],
        };

  await writeBrandedChecklistPdf({
    title: copy.title,
    subtitle: `${opts.moduleTitle} · ${opts.localLabel}`,
    sections: copy.sections,
    filename: `unionops-meiorin-sheet-${slugPart(opts.moduleTitle)}.pdf`,
    footer: EDUCATION_FOOTER[locale],
    brand: opts.brand,
  });
}

/** Quorum + motion template (module 4). */
export async function downloadQuorumMotionPdf(opts: ModulePdfContext): Promise<void> {
  const locale = resolveLocale(opts.locale);
  const copy =
    locale === "fr"
      ? {
          title: "Quorum de réunion et modèle de motion",
          sections: [
            {
              heading: "Vérification du quorum",
              lines: [
                "Quorum de réunion ordinaire atteint?",
                "Préavis de réunion spéciale + quorum atteints?",
                "Participation électronique comptée selon les règlements?",
              ],
            },
            {
              heading: "Motion en séance",
              lines: [
                "Proposée par :",
                "Appuyée par :",
                "Libellé (axé sur la décision, pas le débat) :",
                "Résultat du vote (pour / contre / abstention) :",
              ],
            },
            {
              heading: "Après le vote",
              lines: [
                "Responsable de l'action assigné",
                "Échéance jointe",
                "Projet de procès-verbal dans les 48 heures",
              ],
            },
          ],
        }
      : {
          title: "Meeting quorum & motion template",
          sections: [
            {
              heading: "Quorum check",
              lines: [
                "Regular meeting quorum met?",
                "Special meeting notice + quorum met?",
                "Electronic participation counted per bylaws?",
              ],
            },
            {
              heading: "Motion on the floor",
              lines: [
                "Moved by:",
                "Seconded by:",
                "Wording (decision-focused, not debate):",
                "Vote result (for / against / abstain):",
              ],
            },
            {
              heading: "After the vote",
              lines: [
                "Action owner assigned",
                "Deadline attached",
                "Minutes draft within 48 hours",
              ],
            },
          ],
        };

  await writeBrandedChecklistPdf({
    title: copy.title,
    subtitle: `${opts.moduleTitle} · ${opts.localLabel}`,
    sections: copy.sections,
    filename: `unionops-quorum-motion-${slugPart(opts.moduleTitle)}.pdf`,
    footer: EDUCATION_FOOTER[locale],
    brand: opts.brand,
  });
}

/** Financial controls audit trail (module 5). */
export async function downloadAuditControlsPdf(opts: ModulePdfContext): Promise<void> {
  const locale = resolveLocale(opts.locale);
  const copy =
    locale === "fr"
      ? {
          title: "Contrôles financiers — du reçu à la piste d'audit",
          sections: [
            {
              heading: "Chaque décaissement",
              lines: [
                "Reçu original joint",
                "Deux signatures autorisées avant le décaissement",
                "Chèque / TEF correspond au montant approuvé",
              ],
            },
            {
              heading: "Audit semestriel des fiduciaires",
              lines: [
                "Échantillon de pièces retracé au relevé bancaire",
                "Chèques en circulation rapprochés",
                "Rapport aux membres planifié",
              ],
            },
          ],
        }
      : {
          title: "Financial controls — receipt to audit trail",
          sections: [
            {
              heading: "Every disbursement",
              lines: [
                "Original receipt attached",
                "Two authorized signatures before release",
                "Cheque / EFT matches approved amount",
              ],
            },
            {
              heading: "Trustee six-month audit",
              lines: [
                "Sample vouchers traced to bank statement",
                "Outstanding cheques reconciled",
                "Member report scheduled",
              ],
            },
          ],
        };

  await writeBrandedChecklistPdf({
    title: copy.title,
    subtitle: `${opts.moduleTitle} · ${opts.localLabel}`,
    sections: copy.sections,
    filename: `unionops-audit-controls-${slugPart(opts.moduleTitle)}.pdf`,
    footer: EDUCATION_FOOTER[locale],
    brand: opts.brand,
  });
}

/** Equity clause negotiation worksheet (module 6). */
export async function downloadEquityClausePdf(opts: ModulePdfContext): Promise<void> {
  const locale = resolveLocale(opts.locale);
  const copy =
    locale === "fr"
      ? {
          title: "Clause d'équité — de l'obstacle à la reddition de comptes",
          sections: [
            {
              heading: "Nommer l'obstacle",
              lines: [
                "Qui est exclu ou sous-protégé?",
                "Schéma selon les quarts / classifications?",
                "Preuves documentées (pas seulement des anecdotes)?",
              ],
            },
            {
              heading: "Proposer un libellé contractuel",
              lines: [
                "Clause précise ou projet de lettre d'entente :",
                "Révision conjointe / échéance de rapport :",
                "Réparation si l'employeur manque l'échéance :",
              ],
            },
            {
              heading: "Suivi auprès des membres",
              lines: [
                "Résumé en langage clair pour l'assemblée",
                "Voie réparatrice avant grief formel si c'est sûr",
              ],
            },
          ],
        }
      : {
          title: "Equity clause — barrier to accountability",
          sections: [
            {
              heading: "Name the barrier",
              lines: [
                "Who is excluded or under-protected?",
                "Pattern across shifts / classifications?",
                "Evidence documented (not anecdote only)?",
              ],
            },
            {
              heading: "Propose contract language",
              lines: [
                "Specific clause or LOU draft:",
                "Joint review / reporting deadline:",
                "Remedy if employer misses deadline:",
              ],
            },
            {
              heading: "Member follow-up",
              lines: [
                "Plain-language summary for the floor",
                "Restorative path before formal grievance if safe",
              ],
            },
          ],
        };

  await writeBrandedChecklistPdf({
    title: copy.title,
    subtitle: `${opts.moduleTitle} · ${opts.localLabel}`,
    sections: copy.sections,
    filename: `unionops-equity-clause-${slugPart(opts.moduleTitle)}.pdf`,
    footer: EDUCATION_FOOTER[locale],
    brand: opts.brand,
  });
}

const BYLAWS_ADOPTION_COPY = {
  en: {
    title: "Local bylaws — adoption & amendment checklist",
    sections: [
      {
        heading: "Before notice",
        lines: [
          "Read the national/provincial constitution article on local bylaws",
          "Compare peer guides (CUPE bylaws guide or your national model) for missing articles",
          "Draft clean article text members can read aloud",
          "Confirm notice days and 2/3 threshold in the current amendment clause",
        ],
      },
      {
        heading: "Notice and GMM",
        lines: [
          "Post and email the exact wording with the GMM date",
          "Write down current GMM quorum and how you will count members present",
          "Hold the vote at a quorate GMM",
          "Record the 2/3 result in signed minutes",
        ],
      },
      {
        heading: "After the vote",
        lines: [
          "Submit the package for national/provincial approval when required",
          "Wait for written approval before treating the text as in force",
          "Publish the approved PDF to boards, website, and members",
          "Update Org Chart / LEC directory if officer seats changed",
        ],
      },
    ],
  },
  fr: {
    title: "Règlements locaux — liste d'adoption et de modification",
    sections: [
      {
        heading: "Avant le préavis",
        lines: [
          "Lire l'article de la constitution nationale ou provinciale sur les règlements locaux",
          "Comparer les guides pairs (guide des règlements du SCFP ou votre modèle national) pour les articles manquants",
          "Rédiger un texte d'articles clair que les membres peuvent lire à voix haute",
          "Confirmer le délai de préavis et le seuil des 2/3 dans la clause de modification actuelle",
        ],
      },
      {
        heading: "Préavis et AGM",
        lines: [
          "Afficher et envoyer le libellé exact avec la date de l'AGM",
          "Noter le quorum actuel de l'AGM et comment compter les membres présents",
          "Tenir le vote à une AGM avec quorum",
          "Consigner le résultat des 2/3 dans un procès-verbal signé",
        ],
      },
      {
        heading: "Après le vote",
        lines: [
          "Soumettre le dossier pour approbation nationale ou provinciale lorsque c'est exigé",
          "Attendre l'approbation écrite avant de traiter le texte comme en vigueur",
          "Publier le PDF approuvé aux tableaux, au site et aux membres",
          "Mettre à jour l'organigramme / l'annuaire du CEL si les postes ont changé",
        ],
      },
    ],
  },
} as const;

/** Printable adoption checklist for the public Local Bylaws guide. */
export async function downloadBylawsAdoptionChecklistPdf(opts: {
  localLabel: string;
  locale?: ReferencePdfLocale;
  brand?: GuidePdfBrand;
}): Promise<void> {
  const locale = resolveLocale(opts.locale);
  const copy = BYLAWS_ADOPTION_COPY[locale];
  await writeBrandedChecklistPdf({
    title: copy.title,
    subtitle: opts.localLabel,
    sections: copy.sections.map((section) => ({
      heading: section.heading,
      lines: [...section.lines],
    })),
    filename: `unionops-bylaws-adoption-checklist-${locale}.pdf`,
    footer: EDUCATION_FOOTER[locale],
    brand: opts.brand,
  });
}

/** Printable floor checklist from parsed module items. */
export async function downloadFloorChecklistPdf(opts: {
  moduleTitle: string;
  moduleNumber: number;
  items: string[];
  localLabel: string;
  locale?: ReferencePdfLocale;
  brand?: GuidePdfBrand;
}): Promise<void> {
  const locale = resolveLocale(opts.locale);
  const copy =
    locale === "fr"
      ? {
          title: `Liste de vérification — Module ${opts.moduleNumber}`,
          heading: "Avant de quitter l'assemblée",
          empty: "(Aucun élément de liste trouvé)",
        }
      : {
          title: `Floor checklist — Module ${opts.moduleNumber}`,
          heading: "Before you leave the floor",
          empty: "(No checklist items found)",
        };

  await writeBrandedChecklistPdf({
    title: copy.title,
    subtitle: `${opts.moduleTitle} · ${opts.localLabel}`,
    sections: [
      {
        heading: copy.heading,
        lines: opts.items.length > 0 ? opts.items : [copy.empty],
      },
    ],
    filename: `unionops-module-${opts.moduleNumber}-checklist-${slugPart(opts.moduleTitle)}.pdf`,
    footer: EDUCATION_FOOTER[locale],
    brand: opts.brand,
  });
}

/** Collect checklist items from a parsed module (all sections). */
export function collectChecklistItems(
  sections: { blocks: { type: string; items?: string[] }[]; subsections?: { blocks: { type: string; items?: string[] }[] }[] }[],
): string[] {
  const items: string[] = [];
  for (const section of sections) {
    for (const block of section.blocks) {
      if (block.type === "checklist" && block.items) items.push(...block.items);
    }
    for (const sub of section.subsections ?? []) {
      for (const block of sub.blocks) {
        if (block.type === "checklist" && block.items) items.push(...block.items);
      }
    }
  }
  return items;
}
