import type { PublicDocumentPayload } from "@/lib/db/schema/public-documents";

export type LaunchDraftSeed = {
  slug: string;
  title: { en: string; fr: string };
  summary: { en: string; fr: string };
  purpose: { en: string; fr: string };
  audience: { en: string; fr: string };
  visibility: "public" | "internal";
  hostWidePolicy: boolean;
};

/** Baseline legal statements stay review drafts; non-policy catalogue items retain their existing import behavior. */
export function initialRegistryImportStatus(kind: PublicDocumentPayload["kind"]): "draft" | "published" {
  return kind === "policy" ? "draft" : "published";
}

const draftMark = { en: "[DRAFT / NOT YET IN EFFECT]", fr: "[BROUILLON / PAS ENCORE EN VIGUEUR]" };
export function policyDraftStatusCopy(locale: string) {
  return locale === "fr"
    ? {
      label: draftMark.fr,
      effectiveDate: "Pas encore en vigueur",
      notice: "Ce texte de référence n’a pas été approuvé ni mis en vigueur pour le lancement client hébergé.",
    }
    : {
      label: draftMark.en,
      effectiveDate: "Not yet in effect",
      notice: "This baseline has not been approved or made effective for hosted customer launch.",
    };
}

const reviewSummary = {
  en: "Draft record only. No approved text is included. Assign an owner and obtain qualified review before publication or use.",
  fr: "Fiche de brouillon seulement. Aucun texte approuvé n’est inclus. Désignez une personne responsable et obtenez une révision qualifiée avant toute publication ou utilisation.",
};
const reviewPurpose = {
  en: "Prepare the document for accountable drafting and qualified review",
  fr: "Préparer le document pour une rédaction responsable et une révision qualifiée",
};
const reviewAudience = { en: "UnionOps review team", fr: "Équipe de révision UnionOps" };

function internal(slug: string, titleEn: string, titleFr: string): LaunchDraftSeed {
  return {
    slug,
    title: { en: `${draftMark.en} ${titleEn}`, fr: `${draftMark.fr} ${titleFr}` },
    summary: reviewSummary,
    purpose: reviewPurpose,
    audience: reviewAudience,
    visibility: "internal",
    hostWidePolicy: false,
  };
}

export const LAUNCH_DRAFT_SEEDS: readonly LaunchDraftSeed[] = [
  {
    slug: "terms",
    title: { en: `${draftMark.en} Terms of Use`, fr: `${draftMark.fr} Conditions d’utilisation` },
    summary: reviewSummary,
    purpose: reviewPurpose,
    audience: { en: "UnionOps users", fr: "Personnes qui utilisent UnionOps" },
    visibility: "public",
    hostWidePolicy: true,
  },
  {
    slug: "dpa",
    title: { en: `${draftMark.en} Data Processing Addendum`, fr: `${draftMark.fr} Addenda sur le traitement des données` },
    summary: reviewSummary,
    purpose: reviewPurpose,
    audience: { en: "Contracting unions and locals", fr: "Syndicats et sections contractants" },
    visibility: "public",
    hostWidePolicy: true,
  },
  internal("incident-response", "Incident response procedure", "Procédure d’intervention en cas d’incident"),
  internal("privacy-requests", "Privacy request handling", "Traitement des demandes relatives à la vie privée"),
  internal("retention-deletion", "Retention and deletion procedure", "Procédure de conservation et de suppression"),
  internal("access-mfa", "Access review and MFA procedure", "Procédure de revue des accès et de l’authentification multifacteur"),
  internal("security-operations", "Security operations procedure", "Procédure des opérations de sécurité"),
  internal("vulnerability-management", "Vulnerability management procedure", "Procédure de gestion des vulnérabilités"),
  internal("logging-alerts", "Logging and alert response procedure", "Procédure de journalisation et de réponse aux alertes"),
  internal("backup-restore", "Backup and restore procedure", "Procédure de sauvegarde et de restauration"),
  internal("casl-marketing", "Product-news consent procedure", "Procédure de consentement aux nouvelles du produit"),
  internal("subprocessor-review", "Subprocessor review procedure", "Procédure de révision des sous-traitants"),
  internal("data-inventory", "Data inventory maintenance procedure", "Procédure de tenue de l’inventaire des données"),
  internal("privacy-impact-assessment", "Privacy impact assessment procedure", "Procédure d’évaluation des facteurs relatifs à la vie privée"),
  internal("accessibility-remediation", "Accessibility remediation procedure", "Procédure de correction des enjeux d’accessibilité"),
];

export function toLaunchDraftPayload(seed: LaunchDraftSeed): PublicDocumentPayload {
  return {
    kind: "policy",
    visibility: seed.visibility,
    title: seed.title,
    summary: seed.summary,
    purpose: seed.purpose,
    audience: seed.audience,
    format: "Web page",
    language: "en-fr",
    owner: "Unassigned",
    source: seed.visibility === "internal" ? "UnionOps internal operating draft" : "UnionOps customer-terms draft",
    hosting: "UnionOps",
    linkedSurfaces: [],
    requiresAcceptance: false,
    humanApproved: false,
    required: false,
  };
}
