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
    "/accessibility": {
      title: "Accessibility Statement",
      description:
        "UnionOps AODA / WCAG 2.1 Level AA commitment for stewards and officers using the toolkit.",
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
        "Browse strong local post patterns, see why they work, then make your own with the UnionOps tools.",
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
        "Reusable lunch-and-learn and hands-on workshop outline for starting local social communications.",
    },
    "/guide/union-boards": {
      title: "Union Boards Guide",
      description:
        "Workplace bulletin boards reach members who are not on social media. Board layout, what to print, notices, and solidarity posters.",
    },
    "/guide/print": {
      title: "Print Communications Guide",
      description:
        "When printing is worth it, and how to pair print with the digital channels your local already uses.",
    },
    "/guide/website": {
      title: "Local Website Guide",
      description:
        "Give members one stable link for who you are and how to find you, then publish it free on GitHub Pages.",
    },
    "/guide/email-broadcast": {
      title: "Email & Member Outreach Guide",
      description:
        "Copy-only meeting invites and officer reminders. UnionOps keeps no marketing lists and sends no mail for you.",
    },
    "/guide/resources": {
      title: "Comms Resources",
      description:
        "Orientation, practice, and sources for union locals building solidarity communications.",
    },
    "/guide/photo-consent": {
      title: "Photo Consent & Member Media",
      description:
        "A short checklist for stewards and locals before posting member photos.",
    },
    "/guide/crisis": {
      title: "Strike & Crisis Comms Guide",
      description:
        "How to keep local messaging calm and clear during strikes, bargaining, layoffs, and management pushback.",
    },
    "/guide/membership-signup": {
      title: "Grow membership with scan-to-sign materials",
      description:
        "Posters, wallet cards, and a welcome letter for members you rarely see in a hallway, especially part-time staff.",
    },
    "/guide/dfr": {
      title: "Duty of Fair Representation",
      description:
        "Foundational literacy for stewards and local officers on the duty of fair representation.",
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
  },
  fr: {
    "/privacy": {
      title: "Politique de confidentialité",
      description:
        "Comment UnionOps traite la confidentialité : les outils Comms restent sur votre appareil ; si vous hébergez un Hub, vous contrôlez cette instance.",
    },
    "/accessibility": {
      title: "Déclaration d'accessibilité",
      description:
        "Engagement AODA / WCAG 2.1 niveau AA d'UnionOps pour les délégués et dirigeants qui utilisent la trousse.",
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
        "Parcourez des modèles de publications locales, comprenez pourquoi ils fonctionnent, puis créez les vôtres.",
    },
    "/captions": {
      title: "Bibliothèque de légendes et de mot-clics",
      description:
        "Modèles de publications réutilisables au ton solidaire. Copiez, adaptez et collez dans vos réseaux.",
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
        "Plan réutilisable pour lunch-and-learn et atelier pratique pour démarrer les communications sociales locales.",
    },
    "/guide/union-boards": {
      title: "Guide des tableaux syndicaux",
      description:
        "Les tableaux d'affichage rejoignent les membres hors réseaux sociaux. Mise en page du tableau, quoi imprimer, avis et affiches de solidarité.",
    },
    "/guide/print": {
      title: "Guide des communications imprimées",
      description:
        "Quand l'impression en vaut la peine, et comment la combiner aux canaux numériques que votre section utilise déjà.",
    },
    "/guide/website": {
      title: "Guide du site Web local",
      description:
        "Donnez aux membres un lien stable pour savoir qui vous êtes et où vous trouver, puis publiez-le gratuitement sur GitHub Pages.",
    },
    "/guide/email-broadcast": {
      title: "Guide courriel et diffusion",
      description:
        "Invitations de réunion à copier-coller et rappels aux dirigeants. UnionOps ne tient aucune liste marketing et n'envoie rien à votre place.",
    },
    "/guide/resources": {
      title: "Ressources de communication",
      description:
        "Orientation, pratique et sources pour les sections qui bâtissent des communications solidaires.",
    },
    "/guide/photo-consent": {
      title: "Consentement photo et médias des membres",
      description:
        "Une courte liste pour délégués et sections avant de publier des photos de membres.",
    },
    "/guide/crisis": {
      title: "Guide de communication - grève et crise",
      description:
        "Comment garder des messages locaux calmes et clairs pendant les grèves, la négociation, les mises à pied et les réactions de la direction.",
    },
    "/guide/membership-signup": {
      title: "Faire croître l'adhésion avec du matériel à scanner",
      description:
        "Affiches, cartes de poche et lettre de bienvenue pour les membres que vous croisez rarement, surtout le personnel à temps partiel.",
    },
    "/guide/dfr": {
      title: "Devoir de représentation équitable",
      description:
        "Littératie de base pour les délégués et dirigeants locaux sur le devoir de représentation équitable.",
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
