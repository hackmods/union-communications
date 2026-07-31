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
        "Step-by-step Brand Kit setup for your local — colours, logo, and links that drive every Comms tool.",
    },
    "/brand-kit": {
      title: "Your local Brand Kit",
      description:
        "Colours, logo, local number, and key links that drive boards, print, social graphics, and the website template.",
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
        "Your Brand Kit colours and logo for local solidarity communications — customize everything in Brand Kit.",
    },
    "/tools": {
      title: "Tools",
      description:
        "Makers for brand, union boards, print, social, and web — all run on your device.",
    },
    "/guide": {
      title: "The Blueprint",
      description:
        "A handbook for ongoing local communications practice — platforms, tone, rhythm, and accessibility.",
    },
    "/guide/social-media-plan": {
      title: "First week",
      description:
        "After Brand Kit: boards, print, socials, and a simple website — one message, four channels.",
    },
    "/guide/union-boards": {
      title: "Union Boards Guide",
      description:
        "Workplace bulletin boards reach members who are not on social media — layout, notices, and solidarity posters.",
    },
    "/guide/print": {
      title: "Print Communications Guide",
      description:
        "When to print and how to pair print with digital channels for your local.",
    },
    "/guide/website": {
      title: "Local Website Guide",
      description:
        "Give members one stable link for who you are and how to find you — then publish it free on GitHub Pages.",
    },
    "/guide/email-broadcast": {
      title: "Email & Member Outreach Guide",
      description:
        "Copy-only invites and officer reminders — no marketing lists in UnionOps.",
    },
    "/guide/resources": {
      title: "Comms Resources",
      description:
        "Orientation, practice, and sources for union locals building solidary communications.",
    },
    "/guide/photo-consent": {
      title: "Photo Consent & Member Media",
      description:
        "A short checklist for stewards and locals before posting member photos.",
    },
    "/guide/crisis": {
      title: "Strike & Crisis Comms Guide",
      description:
        "High-level guidance for local unions during strikes, bargaining, and workplace crises.",
    },
    "/guide/membership-signup": {
      title: "Grow membership with scan-to-sign materials",
      description:
        "Posters, wallet cards, and a welcome letter for hard-to-reach members — especially part-time staff.",
    },
    "/guide/dfr": {
      title: "Duty of Fair Representation",
      description:
        "Foundational literacy for stewards and local officers on the duty of fair representation.",
    },
    "/guide/seniority-bumping": {
      title: "Seniority & bumping playbook",
      description:
        "A manual walkthrough aid for stability committees — not a calculator.",
    },
    "/guide/right-to-refuse": {
      title: "Right to refuse unsafe work",
      description:
        "Ontario OHSA section 43 right to refuse — jurisdiction-specific literacy for stewards.",
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
        "Configuration pas à pas de la trousse de marque — couleurs, logo et liens qui alimentent chaque outil Comms.",
    },
    "/brand-kit": {
      title: "Trousse de marque de votre section",
      description:
        "Couleurs, logo, numéro de section et liens clés pour tableaux, impression, graphiques sociaux et modèle de site.",
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
        "Les couleurs et le logo de votre trousse de marque pour les communications locales de solidarité — personnalisez tout dans la trousse.",
    },
    "/tools": {
      title: "Outils",
      description:
        "Créateurs pour la marque, les tableaux syndicaux, l'impression, le social et le web — tout reste sur votre appareil.",
    },
    "/guide": {
      title: "Le Plan directeur",
      description:
        "Un manuel pour la pratique continue des communications locales — plateformes, ton, rythme et accessibilité.",
    },
    "/guide/social-media-plan": {
      title: "Première semaine",
      description:
        "Après la trousse de marque : tableaux, impression, médias sociaux et un site simple — un message, quatre canaux.",
    },
    "/guide/union-boards": {
      title: "Guide des tableaux syndicaux",
      description:
        "Les tableaux d'affichage rejoignent les membres hors réseaux sociaux — mise en page, avis et affiches de solidarité.",
    },
    "/guide/print": {
      title: "Guide des communications imprimées",
      description:
        "Quand imprimer et comment combiner l'impression avec le numérique pour votre section.",
    },
    "/guide/website": {
      title: "Guide du site Web local",
      description:
        "Donnez aux membres un lien stable pour savoir qui vous êtes et où vous trouver — puis publiez-le gratuitement sur GitHub Pages.",
    },
    "/guide/email-broadcast": {
      title: "Guide courriel et diffusion",
      description:
        "Invitations à copier et rappels aux dirigeants — pas de listes marketing dans UnionOps.",
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
        "Orientation de haut niveau pour les sections locales pendant les grèves, la négociation et les crises.",
    },
    "/guide/membership-signup": {
      title: "Faire croître l'adhésion avec du matériel à scanner",
      description:
        "Affiches, cartes de poche et lettre de bienvenue pour les membres difficiles à joindre — surtout le personnel à temps partiel.",
    },
    "/guide/dfr": {
      title: "Devoir de représentation équitable",
      description:
        "Littératie de base pour les délégués et dirigeants locaux sur le devoir de représentation équitable.",
    },
    "/guide/seniority-bumping": {
      title: "Guide d'ancienneté et de bumping",
      description:
        "Aide manuelle pour les comités de stabilité — pas un calculateur.",
    },
    "/guide/right-to-refuse": {
      title: "Droit de refuser un travail dangereux",
      description:
        "LSST de l'Ontario article 43 — littératie propre à cette compétence pour les délégués.",
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
