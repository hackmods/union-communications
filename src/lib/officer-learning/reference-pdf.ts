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

/** Workplace map worksheet (module 7). */
export async function downloadWorkplaceMapPdf(opts: ModulePdfContext): Promise<void> {
  const locale = resolveLocale(opts.locale);
  const copy =
    locale === "fr"
      ? {
          title: "Carte du milieu de travail — fiche d'organisation",
          sections: [
            {
              heading: "Grille du site",
              lines: [
                "Départements / unités dessinés :",
                "Quarts et classifications notés :",
                "Statut d'emploi (temporaire vs permanent) :",
                "Langues et îlots isolés :",
              ],
            },
            {
              heading: "Leaders et lacunes",
              lines: [
                "Leaders organiques (pas seulement les délégués titulaires) :",
                "Poches non engagées à recruter :",
                "Contacts de plancher assignés :",
              ],
            },
            {
              heading: "Prochaine escalade",
              lines: [
                "Échelon prévu (chandails → application → mini-campagne…) :",
                "Avis juridique / service avant work-to-rule? :",
              ],
            },
          ],
        }
      : {
          title: "Workplace map — organizing worksheet",
          sections: [
            {
              heading: "Site grid",
              lines: [
                "Departments / units drawn:",
                "Shifts and classifications marked:",
                "Employment status (temp vs permanent):",
                "Languages and isolated islands:",
              ],
            },
            {
              heading: "Leaders and gaps",
              lines: [
                "Organic leaders (not only titled stewards):",
                "Unengaged pockets to recruit:",
                "Floor contacts assigned:",
              ],
            },
            {
              heading: "Next escalation",
              lines: [
                "Planned rung (shirts → enforcement → mini-campaign…):",
                "Legal / servicing notice before work-to-rule?:",
              ],
            },
          ],
        };

  await writeBrandedChecklistPdf({
    title: copy.title,
    subtitle: `${opts.moduleTitle} · ${opts.localLabel}`,
    sections: copy.sections,
    filename: `unionops-workplace-map-${slugPart(opts.moduleTitle)}.pdf`,
    footer: EDUCATION_FOOTER[locale],
    brand: opts.brand,
  });
}

/** Four corners settlement checklist (module 8). */
export async function downloadSettlementCornersPdf(opts: ModulePdfContext): Promise<void> {
  const locale = resolveLocale(opts.locale);
  const copy =
    locale === "fr"
      ? {
          title: "Règlement — quatre coins et porte ouverte",
          sections: [
            {
              heading: "Avant de signer",
              lines: [
                "Chaque promesse verbale écrite dans le mémoire?",
                "Sans préjudice / sans précédent cochés si voulus?",
                "Réparation intégrale (paye, avantages, dossier) précise?",
                "Délais et qui fait quoi nommé?",
              ],
            },
            {
              heading: "Grief — porte ouverte",
              lines: [
                "Article X et/ou tout autre article pertinent?",
                "Remède : rendre le plaignant entier à tous égards?",
                "Chronologie et preuves jointes?",
              ],
            },
            {
              heading: "Après la signature",
              lines: [
                "Copie au membre et au dossier sécurisé",
                "Suivi des échéances du mémoire",
              ],
            },
          ],
        }
      : {
          title: "Settlement — four corners & open door",
          sections: [
            {
              heading: "Before you sign",
              lines: [
                "Every verbal promise written into the MOS?",
                "Without prejudice / without precedent checked if wanted?",
                "Make-whole (pay, benefits, record) spelled out?",
                "Deadlines and who does what named?",
              ],
            },
            {
              heading: "Grievance — open door",
              lines: [
                "Article X and/or any other relevant article?",
                "Remedy: make the grievor whole in every aspect?",
                "Chronology and evidence attached?",
              ],
            },
            {
              heading: "After signing",
              lines: [
                "Copy to member and secured file",
                "Calendar MOS deadlines",
              ],
            },
          ],
        };

  await writeBrandedChecklistPdf({
    title: copy.title,
    subtitle: `${opts.moduleTitle} · ${opts.localLabel}`,
    sections: copy.sections,
    filename: `unionops-settlement-corners-${slugPart(opts.moduleTitle)}.pdf`,
    footer: EDUCATION_FOOTER[locale],
    brand: opts.brand,
  });
}

/** Medical privacy boundary sheet (module 9). */
export async function downloadMedicalPrivacyPdf(opts: ModulePdfContext): Promise<void> {
  const locale = resolveLocale(opts.locale);
  const copy =
    locale === "fr"
      ? {
          title: "Confidentialité médicale — capacités fonctionnelles",
          sections: [
            {
              heading: "L'employeur peut demander",
              lines: [
                "Limitations et restrictions (capacités fonctionnelles)",
                "Durée prévue / date de révision",
                "Aménagements nécessaires pour un travail sécuritaire",
              ],
            },
            {
              heading: "L'employeur n'a pas droit à",
              lines: [
                "Diagnostic, symptômes, médicaments",
                "Notes cliniques ou de thérapie",
                "Dossier médical complet",
              ],
            },
            {
              heading: "Prochaines étapes du délégué",
              lines: [
                "Refuser la pêche au diagnostic par écrit",
                "Orienter vers le comité d'assurance conjoint si déni",
                "Auditer le PAM pour absences liées au handicap",
              ],
            },
          ],
        }
      : {
          title: "Medical privacy — functional abilities only",
          sections: [
            {
              heading: "Employer may request",
              lines: [
                "Limitations and restrictions (functional abilities)",
                "Expected duration / review date",
                "Accommodations needed for safe work",
              ],
            },
            {
              heading: "Employer has no right to",
              lines: [
                "Diagnosis, symptoms, medications",
                "Clinical or therapy notes",
                "Full medical file",
              ],
            },
            {
              heading: "Steward next steps",
              lines: [
                "Refuse diagnosis fishing in writing",
                "Route denials to joint insurance oversight",
                "Audit AMP for disability-related absences",
              ],
            },
          ],
        };

  await writeBrandedChecklistPdf({
    title: copy.title,
    subtitle: `${opts.moduleTitle} · ${opts.localLabel}`,
    sections: copy.sections,
    filename: `unionops-medical-privacy-${slugPart(opts.moduleTitle)}.pdf`,
    footer: EDUCATION_FOOTER[locale],
    brand: opts.brand,
  });
}

/** United caucus briefing sheet (module 10). */
export async function downloadCaucusBriefingPdf(opts: ModulePdfContext): Promise<void> {
  const locale = resolveLocale(opts.locale);
  const copy =
    locale === "fr"
      ? {
          title: "Caucus uni — fiche de préparation du comité",
          sections: [
            {
              heading: "Avant la rencontre conjointe",
              lines: [
                "Caucus syndical tenu (sans la direction)?",
                "Objectif unique et rôles assignés?",
                "Désaccords réglés derrière la porte?",
                "Forum : JHSC, LMC, ou grief?",
              ],
            },
            {
              heading: "Pendant",
              lines: [
                "Front uni — pas de débat interne devant la direction",
                "Demander réponses écrites (délai LSST pour le JHSC)",
                "Noter engagements et échéances",
              ],
            },
            {
              heading: "Après",
              lines: [
                "Débrief caucus : qui suit quoi",
                "Escalade multi-comités si blocage",
              ],
            },
          ],
        }
      : {
          title: "United caucus — committee prep sheet",
          sections: [
            {
              heading: "Before the joint meeting",
              lines: [
                "Union caucus held (no management)?",
                "Single objective and roles assigned?",
                "Disagreements settled behind closed doors?",
                "Forum: JHSC, LMC, or grievance?",
              ],
            },
            {
              heading: "During",
              lines: [
                "United front — no internal debate in front of management",
                "Demand written answers (OHSA timeline for JHSC)",
                "Log commitments and deadlines",
              ],
            },
            {
              heading: "After",
              lines: [
                "Caucus debrief: who follows what",
                "Multi-committee escalate if stalled",
              ],
            },
          ],
        };

  await writeBrandedChecklistPdf({
    title: copy.title,
    subtitle: `${opts.moduleTitle} · ${opts.localLabel}`,
    sections: copy.sections,
    filename: `unionops-caucus-briefing-${slugPart(opts.moduleTitle)}.pdf`,
    footer: EDUCATION_FOOTER[locale],
    brand: opts.brand,
  });
}

/** Membership list directive pocket sheet (module 11). */
export async function downloadListDirectivePdf(opts: ModulePdfContext): Promise<void> {
  const locale = resolveLocale(opts.locale);
  const copy =
    locale === "fr"
      ? {
          title: "Directive sur les listes — fiche de plancher",
          sections: [
            {
              heading: "Ce que la liste n'est pas",
              lines: [
                "Pas un fichier marketing pour un partenaire commercial",
                "Pas une liste à remettre à une campagne politique",
                "Pas un dossier à stocker sur OneDrive / Teams employeur",
              ],
            },
            {
              heading: "Réconciliation mensuelle",
              lines: [
                "Rapport de cotisations employeur ↔ cartes signées",
                "Signaler les payeurs sans carte pour le recrutement",
                "Vérifier classifications et arriérés de cotisations",
              ],
            },
            {
              heading: "Stockage sécurisé",
              lines: [
                "Drive ou base chiffrée contrôlée par le syndicat + 2FA",
                "Jamais d'USB dans un casier partagé",
                "Accès limité aux dirigeants autorisés",
              ],
            },
          ],
        }
      : {
          title: "Membership list directive — floor sheet",
          sections: [
            {
              heading: "What the list is not",
              lines: [
                "Not a marketing file for any commercial partner",
                "Not a contact dump for a political campaign",
                "Not a file to store on employer OneDrive / Teams",
              ],
            },
            {
              heading: "Monthly reconciliation",
              lines: [
                "Employer dues report ↔ signed membership cards",
                "Flag dues payers without cards for signup outreach",
                "Check classifications and dues arrears",
              ],
            },
            {
              heading: "Secure storage",
              lines: [
                "Encrypted union-controlled drive or database + 2FA",
                "Never a USB left in a shared locker",
                "Access limited to authorized officers",
              ],
            },
          ],
        };

  await writeBrandedChecklistPdf({
    title: copy.title,
    subtitle: `${opts.moduleTitle} · ${opts.localLabel}`,
    sections: copy.sections,
    filename: `unionops-list-directive-${slugPart(opts.moduleTitle)}.pdf`,
    footer: EDUCATION_FOOTER[locale],
    brand: opts.brand,
  });
}

/** Expense policy & hardship controls sheet (module 12). */
export async function downloadExpenseHardshipPdf(opts: ModulePdfContext): Promise<void> {
  const locale = resolveLocale(opts.locale);
  const copy =
    locale === "fr"
      ? {
          title: "Dépenses, honoraires et fonds de détresse",
          sections: [
            {
              heading: "Politique de dépenses (approuvée en AG)",
              lines: [
                "Kilométrage (taux fixe) documenté",
                "Per diem repas — pas si le repas est fourni",
                "Soins aux personnes à charge avec reçu",
              ],
            },
            {
              heading: "Honoraires",
              lines: [
                "Montant et poste dans les règlements + vote AG",
                "Revenus imposables — feuillet fiscal si seuil atteint",
                "Bon mensuel des heures et tâches",
              ],
            },
            {
              heading: "Fonds de détresse",
              lines: [
                "Comité indépendant (pas président/trésorier)",
                "Demandes à l'aveugle selon critères écrits",
                "Deux signatures exécutives même en urgence",
              ],
            },
          ],
        }
      : {
          title: "Expenses, honoraria & hardship controls",
          sections: [
            {
              heading: "Expense policy (GMM-approved)",
              lines: [
                "Documented mileage at a fixed rate",
                "Meal per diems — not when a meal is provided",
                "Dependent care with caregiver receipt",
              ],
            },
            {
              heading: "Honoraria",
              lines: [
                "Amount and office in bylaws + GMM vote",
                "Taxable income — tax slip if threshold met",
                "Monthly voucher of hours and duties",
              ],
            },
            {
              heading: "Hardship fund",
              lines: [
                "Independent committee (not president/treasurer)",
                "Blind applications against written criteria",
                "Two executive signatures even in emergencies",
              ],
            },
          ],
        };

  await writeBrandedChecklistPdf({
    title: copy.title,
    subtitle: `${opts.moduleTitle} · ${opts.localLabel}`,
    sections: copy.sections,
    filename: `unionops-expense-hardship-${slugPart(opts.moduleTitle)}.pdf`,
    footer: EDUCATION_FOOTER[locale],
    brand: opts.brand,
  });
}

/** Officer transition & retention sheet (module 13). */
export async function downloadTransitionChecklistPdf(opts: ModulePdfContext): Promise<void> {
  const locale = resolveLocale(opts.locale);
  const copy =
    locale === "fr"
      ? {
          title: "Transition et rétention — fiche secrétaire",
          sections: [
            {
              heading: "Architecture des dossiers",
              lines: [
                "01 Gouvernance / 02 Finances / 03 Griefs / 04 Négociation",
                "Griefs actifs chiffrés et à accès restreint",
              ],
            },
            {
              heading: "Rétention",
              lines: [
                "Permanent : PV, règlements, conventions signées",
                "7 ans : grands livres, reçus, feuillets fiscaux",
                "Griefs : ≥7 ans après clôture (précédents : résumé permanent)",
              ],
            },
            {
              heading: "Liste de transition",
              lines: [
                "Autorités bancaires mises à jour immédiatement",
                "Propriété admin des comptes (pas de mots de passe SMS)",
                "Gestionnaire de mots de passe + 2FA partout",
                "Aucun appareil ou drive employeur",
              ],
            },
          ],
        }
      : {
          title: "Transition & retention — secretary sheet",
          sections: [
            {
              heading: "Folder architecture",
              lines: [
                "01 Governance / 02 Financials / 03 Grievances / 04 Bargaining",
                "Active grievances encrypted and access-restricted",
              ],
            },
            {
              heading: "Retention",
              lines: [
                "Permanent: minutes, bylaws, signed collective agreements",
                "7 years: ledgers, receipts, tax slips",
                "Grievances: ≥7 years after close (precedents: permanent summary)",
              ],
            },
            {
              heading: "Transition checklist",
              lines: [
                "Bank signing authorities updated immediately",
                "Admin ownership of accounts (no SMS password sharing)",
                "Password manager + 2FA everywhere",
                "No employer devices or employer cloud drives",
              ],
            },
          ],
        };

  await writeBrandedChecklistPdf({
    title: copy.title,
    subtitle: `${opts.moduleTitle} · ${opts.localLabel}`,
    sections: copy.sections,
    filename: `unionops-transition-checklist-${slugPart(opts.moduleTitle)}.pdf`,
    footer: EDUCATION_FOOTER[locale],
    brand: opts.brand,
  });
}

/** Day-1 orientation kit sheet (module 14). */
export async function downloadOrientationKitPdf(opts: ModulePdfContext): Promise<void> {
  const locale = resolveLocale(opts.locale);
  const copy =
    locale === "fr"
      ? {
          title: "Trousse d'orientation Jour 1 — 15 minutes",
          sections: [
            {
              heading: "Avant la séance",
              lines: [
                "Bloc obligatoire négocié dans l'intégration employeur?",
                "Trousse : lettre, convention, carte du délégué, carte de membre",
                "Carte d'affinité prête — sans partager la liste",
              ],
            },
            {
              heading: "Pendant (15 minutes)",
              lines: [
                "Accueil chaleureux — pas un cours de grief",
                "La convention garantit salaire et sécurité",
                "Faire signer la carte de membre sur place",
              ],
            },
            {
              heading: "Après",
              lines: [
                "Inscrire le nouveau membre dans la base sécurisée",
                "Présenter le délégué de secteur",
                "Inviter à la prochaine AG / activité solidaire",
              ],
            },
          ],
        }
      : {
          title: "Day-1 orientation kit — 15 minutes",
          sections: [
            {
              heading: "Before the session",
              lines: [
                "Mandatory block negotiated into employer onboarding?",
                "Kit: welcome letter, CA, steward card, membership card",
                "Affinity discount card ready — never share the list",
              ],
            },
            {
              heading: "During (15 minutes)",
              lines: [
                "Warm welcome — not a grievance lecture",
                "The contract guarantees wages and safety",
                "Have them sign the membership card on the spot",
              ],
            },
            {
              heading: "After",
              lines: [
                "Enter the new member in the secure database",
                "Introduce their area steward",
                "Invite to the next GMM / solidarity event",
              ],
            },
          ],
        };

  await writeBrandedChecklistPdf({
    title: copy.title,
    subtitle: `${opts.moduleTitle} · ${opts.localLabel}`,
    sections: copy.sections,
    filename: `unionops-orientation-kit-${slugPart(opts.moduleTitle)}.pdf`,
    footer: EDUCATION_FOOTER[locale],
    brand: opts.brand,
  });
}

/** DFR duty pocket sheet (module 15). */
export async function downloadDfrDutyPdf(opts: ModulePdfContext): Promise<void> {
  const locale = resolveLocale(opts.locale);
  const copy =
    locale === "fr"
      ? {
          title: "DRE — fiche de devoir de représentation équitable",
          sections: [
            {
              heading: "Avant de décider",
              lines: [
                "Journal d'admission daté (membre, résumé, témoins)",
                "Vérification de la convention et des délais de grief",
                "Balayage des témoins et documents",
                "Comparaison avec des dossiers similaires (traitement égal)",
              ],
            },
            {
              heading: "Communiquer avec le membre",
              lines: [
                "Accuser réception et donner un délai réaliste",
                "Mettre à jour si retard — nommer la prochaine étape",
                "Refus par écrit avec motifs et voie d'appel",
                "Ne pas promettre l'arbitrage au jour 1",
              ],
            },
            {
              heading: "Respecter les délais",
              lines: [
                "Délais de grief de la convention notés au calendrier",
                "Fenêtres statutaires (DRE) — escalader tôt au service",
                "Documenter chaque prolongation acceptée",
                "Appeler le service avant le silence ou le refus arbitraire",
              ],
            },
          ],
        }
      : {
          title: "DFR — duty of fair representation pocket sheet",
          sections: [
            {
              heading: "Before you decide",
              lines: [
                "Dated intake log (member, summary, witnesses)",
                "Contract and grievance deadline check",
                "Witness and document sweep",
                "Comparator scan for equal treatment",
              ],
            },
            {
              heading: "Communicate with the member",
              lines: [
                "Acknowledge receipt and give a realistic timeline",
                "Update on delays — name the next step",
                "Written decline with reasons and appeal path",
                "Do not promise arbitration on day one",
              ],
            },
            {
              heading: "Meet the clocks",
              lines: [
                "CA grievance deadlines on the calendar",
                "Statutory DFR windows — escalate to servicing early",
                "Document every agreed extension",
                "Call servicing before silence or arbitrary refusal",
              ],
            },
          ],
        };

  await writeBrandedChecklistPdf({
    title: copy.title,
    subtitle: `${opts.moduleTitle} · ${opts.localLabel}`,
    sections: copy.sections,
    filename: `unionops-dfr-duty-${slugPart(opts.moduleTitle)}.pdf`,
    footer: EDUCATION_FOOTER[locale],
    brand: opts.brand,
  });
}

/** Bumping intake pocket sheet (module 16). */
export async function downloadBumpingIntakePdf(opts: ModulePdfContext): Promise<void> {
  const locale = resolveLocale(opts.locale);
  const copy =
    locale === "fr"
      ? {
          title: "Mise à pied et bumping — fiche d'admission",
          sections: [
            {
              heading: "Lire la liste d'ancienneté",
              lines: [
                "Identifier le bassin (unité, classification, site)",
                "Comparer les dates de service à la CC",
                "Conserver la liste publiée (PDF avec horodatage)",
                "Signaler les écarts avant d'accepter le classement",
              ],
            },
            {
              heading: "Tracer l'arbre de bumping",
              lines: [
                "Lire mise à pied + ancienneté + annexe bumping ensemble",
                "Dessiner la cascade par classification",
                "Marquer les seuils de qualification à chaque branche",
                "Comparer à la carte RH — chaque écart est une question",
              ],
            },
            {
              heading: "Calendrier et accommodement",
              lines: [
                "Préavis de mise à pied et fenêtre de rappel au calendrier",
                "Période d'essai / familiarisation si la CC le prévoit",
                "Signaler les postes en accommodement (module 3)",
                "Admission module 1 avant dépôt de grief",
              ],
            },
          ],
        }
      : {
          title: "Layoff & bumping — intake pocket sheet",
          sections: [
            {
              heading: "Read the seniority list",
              lines: [
                "Identify the pool (unit, classification, site)",
                "Match service dates to the CA",
                "Preserve the published list (timestamped PDF)",
                "Flag discrepancies before accepting rank",
              ],
            },
            {
              heading: "Trace the bumping tree",
              lines: [
                "Read layoff + seniority + bumping appendix together",
                "Sketch the cascade by classification",
                "Mark qualification gates at each branch",
                "Compare to HR chart — every gap is a question",
              ],
            },
            {
              heading: "Clocks and accommodation",
              lines: [
                "Layoff notice and recall window on the calendar",
                "Trial / familiarization period if the CA provides one",
                "Flag accommodation holds (Module 3)",
                "Module 1 intake before filing grievance",
              ],
            },
          ],
        };

  await writeBrandedChecklistPdf({
    title: copy.title,
    subtitle: `${opts.moduleTitle} · ${opts.localLabel}`,
    sections: copy.sections,
    filename: `unionops-bumping-intake-${slugPart(opts.moduleTitle)}.pdf`,
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
