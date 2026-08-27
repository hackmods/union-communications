import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/build-page-metadata";

type PageSeoEntry = { title: string; description: string };

/**
 * Bilingual SEO for public sitemap routes that are not home / manifesto /
 * support / install (inline metadata) or tool layouts (`TOOL_SEO`).
 */
export const PUBLIC_PAGE_SEO: Record<
  "en" | "fr",
  Record<string, PageSeoEntry>
> = {
  en: {
    "/privacy": {
      title: "Privacy Policy",
      description:
        "How UnionOps handles privacy: Comms tools stay on your device; if you host an Officer Hub, you control that instance.",
    },
    "/security": {
      title: "Security",
      description:
        "How UnionOps protects hosted sign-in: HTTPS, access control, and honest limits on encryption for Comms, Officer Hub, and Local Portal.",
    },
    "/accessibility": {
      title: "Accessibility Statement",
      description:
        "The UnionOps commitment to AODA and WCAG 2.1 Level AA, so stewards and officers with disabilities can use these tools, plus the gaps we still know about.",
    },
    "/feedback": {
      title: "Site feedback",
      description:
        "Send UnionOps an idea, a bug, an accessibility barrier, or a workshop note. Optional email is for a reply only, never a mailing list.",
    },
    "/onboarding": {
      title: "Set up your local brand",
      description:
        "Set up your local's Brand Kit step by step: colours, logo, local number, and links that every Comms tool reuses automatically.",
    },
    "/brand-kit": {
      title: "Your local Brand Kit",
      description:
        "Set your colours, logo, local number, and key links once, then reuse them across boards, print, social graphics, and the website template.",
    },
    "/examples": {
      title: "Social Examples",
      description:
        "Browse post patterns that work for real locals, read why each one works, then build your own version with the UnionOps tools in your local's colours.",
    },
    "/updates": {
      title: "What's new",
      description:
        "New tools, guides, and improvements as UnionOps grows. Newest first, with links into the makers and handbooks they mention.",
    },
    "/captions": {
      title: "Caption & Hashtag Library",
      description:
        "Reusable post templates with a solidarity-first tone. Copy, customize, and paste into your social channels.",
    },
    "/assets": {
      title: "Brand Assets",
      description:
        "Your Brand Kit colours and logo, plus reference starter files for workshops. Change any of it in Brand Kit.",
    },
    "/tools": {
      title: "Tools",
      description:
        "Makers for your brand, union boards, print, social, and the web. They all run on your device, with no account needed.",
    },
    "/guide": {
      title: "The Blueprint",
      description:
        "A handbook for ongoing local communications practice: which platforms to choose, tone of voice, posting rhythm, and accessibility.",
    },
    "/guide/social-media-plan": {
      title: "First week",
      description:
        "What to do after Brand Kit: boards, print, socials, and a simple website. One message, four channels, in order.",
    },
    "/guide/workshop": {
      title: "Workshop outline",
      description:
        "A beginner hour for volunteer executives: platforms and posting rhythm, a local logo, Social Examples, Graphic Maker, Quote Card, and a website ZIP.",
    },
    "/guide/union-boards": {
      title: "Union Boards Guide",
      description:
        "Workplace bulletin boards reach members who are not on social media. Board layout, what to print, notices, and solidarity posters.",
    },
    "/guide/print": {
      title: "Print Communications Guide",
      description:
        "Why print still reaches members social media misses, how to design flyers that pass a three-second glance, and how to print on a local budget.",
    },
    "/guide/website": {
      title: "Local Website Guide",
      description:
        "Write a simple local site, download the ZIP from Website Template, then publish it free on GitHub Pages.",
    },
    "/guide/email-broadcast": {
      title: "Email & Member Outreach Guide",
      description:
        "Write the official meeting, vote, or bargaining note here, then paste it into your inbox. Use BCC and personal addresses. UnionOps does not keep your list.",
    },
    "/guide/short-form": {
      title: "Short-form Video Guide",
      description:
        "Film on a phone, keep member privacy, and point short videos at a meeting, petition, or your local site. Covers and captions stay in UnionOps.",
    },
    "/guide/resources": {
      title: "Comms Resources",
      description:
        "Orientation, a practice checklist, and the sources behind this toolkit, for locals building solidarity communications on their own or in a workshop.",
    },
    "/guide/photo-consent": {
      title: "Photo Consent & Member Media",
      description:
        "Protect members before you post a photo: three consent settings, an immediate take-down, and a checklist for faces, minors, and workplace details.",
    },
    "/guide/crisis": {
      title: "Strike & Crisis Comms Guide",
      description:
        "How to keep local messaging calm and clear during strikes, bargaining, layoffs, and management pushback.",
    },
    "/guide/membership-signup": {
      title: "Membership signup playbook",
      description:
        "Build density with real conversations, safe records, and scan-to-sign materials for stewards signing up coworkers.",
    },
    "/guide/dfr": {
      title: "Duty of Fair Representation",
      description:
        "What the duty of fair representation asks of stewards and local officers in practice, where complaints usually start, and how to keep a clean record.",
    },
    "/guide/steward-101": {
      title: "Steward 101: Your Role and Rights",
      description:
        "Orientation for new stewards: what the role is, the three hats, representation in discipline meetings, DFR basics, and a worked example. Not legal advice.",
    },
    "/guide/steward-playbooks": {
      title: "Steward playbooks",
      description:
        "Start here for steward and officer training: Steward 101, Officer Learning modules with self-tests, grievance process, DFR, and more floor playbooks.",
    },
    "/guide/grievance-process": {
      title: "The Steward's Guide to Grievances",
      description:
        "Pick the right forum, log the 6 W's, count CA clocks, and print an intake sheet. Confirm your agreement. Not legal advice.",
    },
    "/guide/seniority-bumping": {
      title: "Seniority & bumping playbook",
      description:
        "A manual walkthrough aid for stability committees: worked examples, cascading displacement, and a paper worksheet. Not a calculator.",
    },
    "/guide/right-to-refuse": {
      title: "Right to refuse unsafe work",
      description:
        "The Ontario OHSA section 43 refusal steps, written for stewards and JHSC members. Ontario only, and not legal advice.",
    },
    "/guide/joint-committee": {
      title: "Joint committee playbook",
      description:
        "Walk a campus issue to the provincial table, keep caucus notes private, then explain signed minutes to members with flyers and email.",
    },
    "/guide/workplace-mapping": {
      title: "Workplace Mapping & Finding Organic Leaders",
      description:
        "Chart coworkers by department and shift, find organic leaders, and score support 1 to 5. Keep the map on a personal device, never on employer systems.",
    },
    "/guide/officer-learning": {
      title: "Officer Learning Center",
      description:
        "Six expanded steward modules with scenarios, drills, and quizzes. Draws on CLC, CUPE, Unifor, and OHRC education — progress stays on your device.",
    },
    "/guide/officer-learning/contract-enforcement": {
      title: "Module 1: Contract Enforcement",
      description:
        "Complaint vs grievance, the 5-point filter, 6 W's investigation, FAR sheets, and union representative immunity. Self-test quiz included.",
    },
    "/guide/officer-learning/progressive-discipline": {
      title: "Module 2: Progressive Discipline",
      description:
        "Just cause, mitigating factors, obey-now-grieve-later, and off-duty nexus tests for stewards defending members. Self-test quiz included.",
    },
    "/guide/officer-learning/human-rights-accommodation": {
      title: "Module 3: Human Rights & Accommodation",
      description:
        "Meiorin test, undue hardship, medical privacy, and return-to-work planning for stewards and local leaders. Self-test quiz included.",
    },
    "/guide/officer-learning/democratic-governance": {
      title: "Module 4: Democratic Governance",
      description:
        "Quorum math, decision-focused minutes, and multi-round secret ballot elections for local secretaries and officers. Self-test quiz included.",
    },
    "/guide/officer-learning/financial-health": {
      title: "Module 5: Financial Health & Audits",
      description:
        "Double-signature controls, program budgets, and trustee-led six-month audits for treasurers and local officers. Self-test quiz included.",
    },
    "/guide/officer-learning/building-collective-power": {
      title: "Module 6: Building Collective Power",
      description:
        "Systemic barriers, equity-focused bargaining, anti-racism contract language, and restorative dispute paths. Self-test quiz included.",
    },
  },
  fr: {
    "/privacy": {
      title: "Politique de confidentialité",
      description:
        "Comment UnionOps traite la confidentialité : les outils Comms restent sur votre appareil ; si vous hébergez un Hub, vous contrôlez cette instance.",
    },
    "/security": {
      title: "Sécurité",
      description:
        "Comment UnionOps protège la connexion hébergée : HTTPS, contrôle d'accès et limites honnêtes sur le chiffrement pour Comms, Hub et Portail local.",
    },
    "/accessibility": {
      title: "Déclaration d'accessibilité",
      description:
        "L'engagement d'UnionOps envers la LAPHO et le WCAG 2.1 niveau AA, pour que les délégués et les dirigeants en situation de handicap puissent utiliser ces outils.",
    },
    "/feedback": {
      title: "Commentaires sur le site",
      description:
        "Envoyez à UnionOps une idée, un bogue, un obstacle d'accessibilité ou une note d'atelier. Le courriel facultatif sert seulement à une réponse.",
    },
    "/onboarding": {
      title: "Configurer la marque de votre section",
      description:
        "Configurez la trousse de marque de votre section pas à pas : couleurs, logo, numéro de section et liens que chaque outil Comms réutilise automatiquement.",
    },
    "/brand-kit": {
      title: "Trousse de marque de votre section",
      description:
        "Réglez une seule fois vos couleurs, logo, numéro de section et liens clés, puis réutilisez-les sur tableaux, impressions, graphiques sociaux et le modèle de site.",
    },
    "/examples": {
      title: "Exemples sociaux",
      description:
        "Parcourez des modèles de publications qui fonctionnent pour de vraies sections, voyez pourquoi, puis créez votre version avec les outils UnionOps à vos couleurs.",
    },
    "/updates": {
      title: "Nouveautés",
      description:
        "Nouveaux outils, guides et améliorations à mesure qu'UnionOps grandit. Du plus récent au plus ancien, avec des liens vers les créateurs et les manuels.",
    },
    "/captions": {
      title: "Bibliothèque de légendes et de mot-clics",
      description:
        "Modèles de publications réutilisables au ton solidaire. Copiez-les, adaptez-les à votre section, puis collez-les dans vos réseaux sociaux.",
    },
    "/assets": {
      title: "Actifs de marque",
      description:
        "Les couleurs et le logo de votre Trousse de marque, plus des fichiers de départ pour les ateliers. Changez tout dans la Trousse de marque.",
    },
    "/tools": {
      title: "Outils",
      description:
        "Des créateurs pour votre marque, les tableaux syndicaux, l'impression, le social et le web. Tout reste sur votre appareil, sans compte à créer.",
    },
    "/guide": {
      title: "Le Plan directeur",
      description:
        "Un manuel pour la pratique continue des communications locales : quelles plateformes choisir, le ton, le rythme de publication et l'accessibilité.",
    },
    "/guide/social-media-plan": {
      title: "Première semaine",
      description:
        "Quoi faire après la Trousse de marque : tableaux, impression, médias sociaux et un site simple. Un message, quatre canaux, dans l'ordre.",
    },
    "/guide/workshop": {
      title: "Plan d'atelier",
      description:
        "Une heure pour les cadres bénévoles : plateformes et rythme, un logo local, les Exemples sociaux, le Créateur de graphiques, la Carte de citation et un ZIP de site.",
    },
    "/guide/union-boards": {
      title: "Guide des tableaux syndicaux",
      description:
        "Les tableaux d'affichage rejoignent les membres hors réseaux sociaux. Mise en page du tableau, quoi imprimer, avis et affiches de solidarité.",
    },
    "/guide/print": {
      title: "Guide des communications imprimées",
      description:
        "Pourquoi l'imprimé rejoint les membres hors réseaux sociaux, comment concevoir un tract lisible en trois secondes, et comment imprimer à petit budget.",
    },
    "/guide/website": {
      title: "Guide du site Web local",
      description:
        "Rédigez un site local simple, téléchargez le ZIP depuis le modèle, puis publiez-le gratuitement sur GitHub Pages.",
    },
    "/guide/email-broadcast": {
      title: "Guide courriel et diffusion",
      description:
        "Rédigez l'avis officiel de réunion ou de vote, puis collez-le dans votre boîte. Utilisez la CCI et des adresses personnelles. UnionOps ne tient pas votre liste.",
    },
    "/guide/short-form": {
      title: "Guide de la vidéo courte",
      description:
        "Filmez au téléphone, protégez la vie privée des membres, et orientez les vidéos courtes vers une réunion, une pétition ou le site de votre section.",
    },
    "/guide/resources": {
      title: "Ressources de communication",
      description:
        "Orientation, liste de pratique et sources derrière cette boîte à outils, pour les sections qui bâtissent des communications solidaires, en solo ou en atelier.",
    },
    "/guide/photo-consent": {
      title: "Consentement photo et médias des membres",
      description:
        "Protégez les membres avant de publier une photo : trois contextes, un retrait immédiat, et une liste pour les visages, les mineurs et le lieu de travail.",
    },
    "/guide/crisis": {
      title: "Guide de communication - grève et crise",
      description:
        "Comment garder des messages locaux calmes et clairs pendant les grèves, la négociation, les mises à pied et les réactions de la direction.",
    },
    "/guide/membership-signup": {
      title: "Guide pratique d'adhésion",
      description:
        "Renforcer la densité par des conversations, des dossiers sécurisés et du matériel à scanner pour les délégués qui inscrivent des collègues.",
    },
    "/guide/dfr": {
      title: "Devoir de représentation équitable",
      description:
        "Ce que le devoir de représentation équitable exige en pratique des délégués et dirigeants locaux, d'où viennent les plaintes et comment garder un dossier propre.",
    },
    "/guide/steward-101": {
      title: "Délégué 101 : votre rôle et vos droits",
      description:
        "Orientation pour nouveaux délégués : rôle, trois chapeaux, représentation disciplinaire, bases de la DRE et exemple commenté. Pas un avis juridique.",
    },
    "/guide/steward-playbooks": {
      title: "Guides pratiques pour délégués",
      description:
        "Commencez ici : Délégué 101, modules du Centre de formation des dirigeants avec autoévaluations, processus de grief, DRE et autres guides sur le terrain.",
    },
    "/guide/grievance-process": {
      title: "Le guide du délégué sur les griefs",
      description:
        "Choisissez le bon forum, consignez les 6 W, comptez les délais et imprimez une feuille d'accueil. Confirmez votre convention. Pas un avis juridique.",
    },
    "/guide/seniority-bumping": {
      title: "Guide d'ancienneté et de bumping",
      description:
        "Aide manuelle pour les comités de stabilité : exemples concrets, déplacements en cascade et feuille de travail papier. Pas un calculateur.",
    },
    "/guide/right-to-refuse": {
      title: "Droit de refuser un travail dangereux",
      description:
        "Les étapes de refus prévues à l'article 43 de la LSST de l'Ontario, pour les délégués et les membres du CSS. Ontario seulement, et pas un avis juridique.",
    },
    "/guide/joint-committee": {
      title: "Guide des comités conjoints",
      description:
        "Passez d'un dossier de campus à la table provinciale, gardez le caucus privé, puis expliquez les procès-verbaux signés aux membres par tracts et courriel.",
    },
    "/guide/workplace-mapping": {
      title: "Cartographie du lieu de travail et leaders organiques",
      description:
        "Recensez les collègues par service et quart, trouvez les leaders organiques et cotez l'appui de 1 à 5. Gardez-la sur votre appareil, jamais chez l'employeur.",
    },
    "/guide/officer-learning": {
      title: "Centre de formation des dirigeants",
      description:
        "Six modules approfondis avec scénarios, exercices et quiz. S'appuie sur la formation du CTC, de la SCFP, d'Unifor et de la CODP — progression sur votre appareil.",
    },
    "/guide/officer-learning/contract-enforcement": {
      title: "Module 1 : Application de la convention",
      description:
        "Plainte vs grief, filtre en 5 points, enquête 6 W, fiches FAR et immunité du représentant syndical. Quiz d'autoévaluation inclus.",
    },
    "/guide/officer-learning/progressive-discipline": {
      title: "Module 2 : Discipline progressive",
      description:
        "Cause juste, facteurs atténuants, obéir-maintenant-grief-après et test de lien pour la conduite hors service. Quiz d'autoévaluation inclus.",
    },
    "/guide/officer-learning/human-rights-accommodation": {
      title: "Module 3 : Droits de la personne et accommodation",
      description:
        "Test Meiorin, contrainte excessive, confidentialité médicale et retour au travail pour délégués et dirigeants. Quiz d'autoévaluation inclus.",
    },
    "/guide/officer-learning/democratic-governance": {
      title: "Module 4 : Gouvernance démocratique",
      description:
        "Calcul du quorum, procès-verbaux axés sur les décisions et élections au scrutin secret en plusieurs tours. Quiz d'autoévaluation inclus.",
    },
    "/guide/officer-learning/financial-health": {
      title: "Module 5 : Santé financière et vérifications",
      description:
        "Double signature, budgets par programme et vérifications semestrielles par les fiduciaires. Quiz d'autoévaluation inclus.",
    },
    "/guide/officer-learning/building-collective-power": {
      title: "Module 6 : Bâtir le pouvoir collectif",
      description:
        "Barrières systémiques, négociation axée sur l'équité, clauses antiracistes et voies de règlement restauratrices. Quiz d'autoévaluation inclus.",
    },
  },
};

/** Paths covered by PUBLIC_PAGE_SEO (sorted). */
export const PUBLIC_PAGE_SEO_PATHS = Object.keys(
  PUBLIC_PAGE_SEO.en,
).sort() as string[];

export function getPublicPageSeo(
  locale: string,
  path: string,
): PageSeoEntry | undefined {
  const loc = locale === "fr" ? "fr" : "en";
  return PUBLIC_PAGE_SEO[loc][path];
}

export async function buildPublicPageMetadata(
  path: string,
  params: Promise<{ locale: string }>,
  options?: { noIndex?: boolean },
): Promise<Metadata> {
  const { locale } = await params;
  const entry = getPublicPageSeo(locale, path);
  if (!entry) {
    throw new Error(`Missing PUBLIC_PAGE_SEO for path: ${path}`);
  }
  return buildPageMetadata({
    locale,
    path,
    title: entry.title,
    description: entry.description,
    noIndex: options?.noIndex,
  });
}
