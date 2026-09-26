/**
 * Generated-site chrome strings (nav, CTAs, section titles).
 * Builder UI stays in messages/*.json; exported HTML uses this table.
 */

export type WebsiteSiteLocale = "en" | "fr";

export type WebsiteSiteStrings = {
  locale: WebsiteSiteLocale;
  home: string;
  about: string;
  officers: string;
  stewards: string;
  committees: string;
  resources: string;
  events: string;
  contact: string;
  privacy: string;
  getInTouch: string;
  toggleMenu: string;
  skipToContent: string;
  executiveTitle: string;
  executiveIntro: string;
  stewardsTitle: string;
  stewardsIntro: string;
  committeesTitle: string;
  aboutLocal: (localNumber: string) => string;
  contactHeading: (unionName: string) => string;
  contactIntro: string;
  membershipIntro: string;
  facebookGroup: string;
  officeHours: string;
  phone: string;
  unionOffice: string;
  membership: string;
  unionResources: string;
  rightsPartners: string;
  privacyTitle: string;
  privacyBody: string;
  privacyBack: string;
  upcomingEvents: string;
  downloadCalendar: string;
  openGraphSiteName: string;
};

const EN: WebsiteSiteStrings = {
  locale: "en",
  home: "Home",
  about: "About",
  officers: "Officers",
  stewards: "Stewards",
  committees: "Committees",
  resources: "Resources",
  events: "Events",
  contact: "Contact",
  privacy: "Privacy",
  getInTouch: "Get In Touch",
  toggleMenu: "Toggle menu",
  skipToContent: "Skip to content",
  executiveTitle: "Your Executive Committee",
  executiveIntro:
    "Contact your officers for support, questions about your Collective Agreement, or to get more involved.",
  stewardsTitle: "Stewards",
  stewardsIntro: "Your workplace stewards are the first point of contact on the floor.",
  committeesTitle: "Committees",
  aboutLocal: (localNumber) => `About Local ${localNumber}`,
  contactHeading: (unionName) => `Contact ${unionName}`,
  contactIntro:
    "For general inquiries, membership questions, or media requests:",
  membershipIntro: "To apply or update your membership:",
  facebookGroup: "Facebook group",
  officeHours: "Office hours",
  phone: "Phone",
  unionOffice: "Union Office",
  membership: "Membership",
  unionResources: "Union Resources",
  rightsPartners: "Rights & Partners",
  privacyTitle: "Privacy",
  privacyBody:
    "This is a static local website. It does not set analytics cookies or track visitors. Contact forms are not hosted here — email links open in your own mail app. Photos of members should only appear with appropriate consent.",
  privacyBack: "Back to home",
  upcomingEvents: "Upcoming events",
  downloadCalendar: "Download calendar (.ics)",
  openGraphSiteName: "Union local website",
};

const FR: WebsiteSiteStrings = {
  locale: "fr",
  home: "Accueil",
  about: "À propos",
  officers: "Direction",
  stewards: "Délégués",
  committees: "Comités",
  resources: "Ressources",
  events: "Événements",
  contact: "Contact",
  privacy: "Confidentialité",
  getInTouch: "Nous joindre",
  toggleMenu: "Ouvrir le menu",
  skipToContent: "Passer au contenu",
  executiveTitle: "Votre comité exécutif",
  executiveIntro:
    "Communiquez avec vos dirigeants pour du soutien, des questions sur votre convention collective, ou pour vous impliquer.",
  stewardsTitle: "Délégués et déléguées",
  stewardsIntro:
    "Vos délégués et déléguées sont le premier point de contact sur le plancher.",
  committeesTitle: "Comités",
  aboutLocal: (localNumber) => `À propos de la section locale ${localNumber}`,
  contactHeading: (unionName) => `Contacter ${unionName}`,
  contactIntro:
    "Pour les demandes générales, l’adhésion ou les médias :",
  membershipIntro: "Pour adhérer ou mettre à jour votre adhésion :",
  facebookGroup: "Groupe Facebook",
  officeHours: "Heures de bureau",
  phone: "Téléphone",
  unionOffice: "Bureau syndical",
  membership: "Adhésion",
  unionResources: "Ressources syndicales",
  rightsPartners: "Droits et partenaires",
  privacyTitle: "Confidentialité",
  privacyBody:
    "Ceci est un site local statique. Il n’installe pas de témoins d’analyse et ne suit pas les visiteurs. Aucun formulaire n’est hébergé ici — les liens courriel s’ouvrent dans votre application de messagerie. Les photos de membres ne doivent paraître qu’avec un consentement approprié.",
  privacyBack: "Retour à l’accueil",
  upcomingEvents: "Événements à venir",
  downloadCalendar: "Télécharger le calendrier (.ics)",
  openGraphSiteName: "Site de la section locale",
};

export function resolveWebsiteSiteStrings(
  locale: WebsiteSiteLocale | undefined | null,
): WebsiteSiteStrings {
  return locale === "fr" ? FR : EN;
}

export function coerceWebsiteSiteLocale(
  value: unknown,
): WebsiteSiteLocale {
  return value === "fr" ? "fr" : "en";
}
