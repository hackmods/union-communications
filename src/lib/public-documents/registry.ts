export type PublicDocument = {
  slug: string;
  title: string;
  summary: string;
  purpose: string;
  audience: string;
  format: string;
  language: "en" | "fr" | "en-fr";
  owner: string;
  source: string;
  hosting: "UnionOps" | "External source";
  version?: string;
  effectiveDate?: string;
  currency?: string;
  unionBrand?: string;
  inlineContent?: string;
  requiresAcceptance?: boolean;
  required?: boolean;
  linkedSurfaces?: readonly string[];
  file?: string;
  externalUrl?: string;
  relatedGuide?: string;
};

/** Public links resolve through this registry so metadata and provenance are consistent. */
export const PUBLIC_DOCUMENTS: PublicDocument[] = [
  { slug: "privacy", title: "Privacy policy", summary: "How UnionOps handles privacy across on-device Comms and hosted Hub services.", purpose: "Understand data handling", audience: "Everyone", format: "Web page", language: "en-fr", owner: "UnionOps", source: "UnionOps privacy policy", hosting: "UnionOps", required: true, linkedSurfaces: ["site footer", "home privacy callout", "access request forms", "sign-in and install pages"] },
  { slug: "security", title: "Security", summary: "Security controls and known limits for UnionOps services.", purpose: "Understand security practices", audience: "Everyone", format: "Web page", language: "en-fr", owner: "UnionOps", source: "UnionOps security statement", hosting: "UnionOps", required: true, linkedSurfaces: ["site footer", "privacy policy"] },
  { slug: "accessibility", title: "Accessibility statement", summary: "Accessibility approach, known gaps, and display settings.", purpose: "Use UnionOps accessibly", audience: "Everyone", format: "Web page", language: "en-fr", owner: "UnionOps", source: "UnionOps accessibility statement", hosting: "UnionOps", required: true, linkedSurfaces: ["site footer", "display settings", "Brand Kit"] },
  { slug: "workplace-map-template", title: "Workplace map template", summary: "A CSV starter for mapping worksites and organizing conversations.", purpose: "Plan workplace outreach", audience: "Stewards and local officers", format: "CSV", language: "en", owner: "UnionOps", source: "UnionOps Comms template", hosting: "UnionOps", file: "templates/unionops-workplace-map.csv", relatedGuide: "/learn/steward", linkedSurfaces: ["Workplace Mapping guide"] },
  { slug: "steward-intake-template", title: "Steward intake template", summary: "A CSV starter for organizing steward intake notes.", purpose: "Structure intake workflows", audience: "Stewards", format: "CSV", language: "en", owner: "UnionOps", source: "UnionOps Comms template", hosting: "UnionOps", file: "templates/unionops-steward-intake.csv", relatedGuide: "/learn/steward", linkedSurfaces: ["Steward 101 guide"] },
  { slug: "workplace-map-example", title: "Workplace map example", summary: "An example CSV showing the workplace map structure with sample data.", purpose: "See how to organize a workplace map", audience: "Stewards and local officers", format: "CSV", language: "en", owner: "UnionOps", source: "UnionOps Comms sample", hosting: "UnionOps", file: "templates/unionops-workplace-map-example.csv", relatedGuide: "/learn/steward", linkedSurfaces: ["Workplace Mapping guide"] },
  { slug: "board-tracker-sample", title: "Union board tracker sample", summary: "An anonymized sample CSV for tracking union board material.", purpose: "Organize board content", audience: "Local officers", format: "CSV", language: "en", owner: "UnionOps", source: "UnionOps anonymized sample", hosting: "UnionOps", file: "demo/union-boards/board-tracker-sample.csv", linkedSurfaces: ["Union Boards guide"] },
  { slug: "jhsc-member-list-sample", title: "JHSC member list sample", summary: "An anonymized sample CSV for a joint health and safety committee roster.", purpose: "Organize committee records", audience: "Joint health and safety committee members", format: "CSV", language: "en", owner: "UnionOps", source: "UnionOps anonymized sample", hosting: "UnionOps", file: "demo/union-boards/jhsc-member-list-sample.csv", linkedSurfaces: ["Union Boards guide"] },
  { slug: "esa-employment-poster", title: "Ontario Employment Standards poster", summary: "Official Employment Standards information from the Government of Ontario.", purpose: "Display workplace standards", audience: "Ontario workplaces", format: "Official source", language: "en", owner: "Government of Ontario", source: "Ontario.ca", hosting: "External source", externalUrl: "https://www.ontario.ca/document/your-guide-employment-standards-act-0/poster-employment-standards-act", linkedSurfaces: ["Union Boards guide"] },
  { slug: "ontario-required-posters", title: "Ontario required workplace posters", summary: "Official Ontario workplace poster collection and current versions.", purpose: "Find required workplace posters", audience: "Ontario workplaces", format: "Official source", language: "en", owner: "Government of Ontario", source: "Ontario.ca", hosting: "External source", externalUrl: "https://www.ontario.ca/page/health-and-safety-workplace-posters", linkedSurfaces: ["Union Boards guide"] },
  { slug: "wsib-form-82", title: "WSIB In Case of Injury poster", summary: "Official WSIB workplace injury reporting poster and current download.", purpose: "Display injury reporting steps", audience: "Ontario workplaces", format: "Official source", language: "en", owner: "Workplace Safety and Insurance Board", source: "WSIB", hosting: "External source", externalUrl: "https://www.wsib.ca/en/businesses/health-and-safety/resources-health-and-safety/in-case-injury-poster", linkedSurfaces: ["Union Boards guide"] },
  { slug: "opseu-collective-agreements", title: "OPSEU / SEFPO collective agreements", summary: "Find current agreements through the union's official resource page.", purpose: "Find a collective agreement", audience: "OPSEU / SEFPO members", format: "External resource", language: "en-fr", owner: "OPSEU / SEFPO", source: "Official OPSEU / SEFPO website", hosting: "External source", unionBrand: "OPSEU / SEFPO", externalUrl: "https://opseu.org/information/find-your-collective-agreement/12967/" },
  { slug: "opseu-eerc-minutes", title: "OPSEU / SEFPO CAAT Support EERC minutes", summary: "Official posting for CAAT Support employee-employer relations committee minutes.", purpose: "Read committee minutes", audience: "OPSEU / SEFPO CAAT Support", format: "External resource", language: "en", owner: "OPSEU / SEFPO", source: "Official OPSEU / SEFPO website", hosting: "External source", unionBrand: "OPSEU / SEFPO", externalUrl: "https://opseu.org/information/minutes/caat-support-employee-employer-relations-committee-eerc-and-minutes/9643/" },
];

export function publicDocument(slug: string): PublicDocument | undefined {
  return PUBLIC_DOCUMENTS.find((doc) => doc.slug === slug);
}

const FRENCH_DOCUMENT_COPY: Record<string, Partial<Pick<PublicDocument, "title" | "summary" | "purpose" | "audience" | "format">>> = {
  privacy: { title: "Politique de confidentialité", summary: "Comment UnionOps protège la confidentialité dans les outils Comms sur appareil et les services Hub hébergés.", purpose: "Comprendre le traitement des données", audience: "Tout le monde", format: "Page Web" },
  security: { title: "Sécurité", summary: "Mesures de sécurité et limites connues des services UnionOps.", purpose: "Comprendre les pratiques de sécurité", audience: "Tout le monde", format: "Page Web" },
  accessibility: { title: "Déclaration d’accessibilité", summary: "Approche d’accessibilité, lacunes connues et réglages d’affichage.", purpose: "Utiliser UnionOps de façon accessible", audience: "Tout le monde", format: "Page Web" },
  "workplace-map-template": { title: "Modèle de cartographie du milieu de travail", summary: "Un fichier CSV de départ pour cartographier les lieux de travail et organiser les conversations.", purpose: "Planifier le travail de proximité", audience: "Délégués et dirigeants locaux", format: "CSV" },
  "steward-intake-template": { title: "Modèle de prise de notes du délégué", summary: "Un fichier CSV de départ pour structurer les notes de prise en charge.", purpose: "Structurer la prise de notes", audience: "Délégués", format: "CSV" },
  "workplace-map-example": { title: "Exemple de cartographie du milieu de travail", summary: "Un exemple CSV qui montre la structure de la carte avec des données fictives.", purpose: "Voir comment organiser une carte du milieu de travail", audience: "Délégués et dirigeants locaux", format: "CSV" },
  "board-tracker-sample": { title: "Exemple de suivi du babillard syndical", summary: "Un CSV anonymisé pour suivre le contenu du babillard syndical.", purpose: "Organiser le contenu du babillard", audience: "Dirigeants locaux", format: "CSV" },
  "jhsc-member-list-sample": { title: "Exemple de liste des membres du CMSST", summary: "Un CSV anonymisé pour organiser la liste d’un comité mixte de santé et sécurité au travail.", purpose: "Organiser les dossiers du comité", audience: "Membres du CMSST", format: "CSV" },
  "esa-employment-poster": { title: "Affiche sur les normes d’emploi de l’Ontario", summary: "Information officielle du gouvernement de l’Ontario sur les normes d’emploi.", purpose: "Afficher les normes en milieu de travail", audience: "Milieux de travail ontariens", format: "Source officielle" },
  "ontario-required-posters": { title: "Affiches obligatoires en milieu de travail en Ontario", summary: "Collection officielle des affiches de travail de l’Ontario et versions à jour.", purpose: "Trouver les affiches obligatoires", audience: "Milieux de travail ontariens", format: "Source officielle" },
  "wsib-form-82": { title: "Affiche de la WSIB : En cas de blessure", summary: "Affiche officielle de la WSIB sur les déclarations de blessure au travail.", purpose: "Afficher les étapes à suivre après une blessure", audience: "Milieux de travail ontariens", format: "Source officielle" },
  "opseu-collective-agreements": { title: "Conventions collectives OPSEU / SEFPO", summary: "Trouvez les conventions à jour sur la page de ressources officielle du syndicat.", purpose: "Trouver une convention collective", audience: "Membres OPSEU / SEFPO", format: "Ressource externe" },
  "opseu-eerc-minutes": { title: "Procès-verbaux du comité EERC du soutien CAAT d’OPSEU / SEFPO", summary: "Publication officielle des procès-verbaux du comité des relations employeur-employés du soutien CAAT.", purpose: "Lire les procès-verbaux du comité", audience: "Soutien CAAT d’OPSEU / SEFPO", format: "Ressource externe" },
};

export function localizedPublicDocument(slug: string, locale: string): PublicDocument | undefined {
  const doc = publicDocument(slug);
  if (!doc) return undefined;
  const french = locale === "fr";
  return {
    ...doc,
    ...((french ? FRENCH_DOCUMENT_COPY[slug] : undefined) ?? {}),
    version: doc.version ?? ( ["privacy", "security", "accessibility"].includes(slug) ? (french ? "Version de base migrée" : "Migrated baseline") : (french ? "Fiche de registre v1" : "Registry record v1")),
    currency: doc.currency ?? (doc.externalUrl ? (french ? "Vérifier la version actuelle auprès de la source officielle" : "Check the official source for the current version") : (french ? "Aucune date d’entrée en vigueur fournie" : "No effective date supplied")),
  };
}
