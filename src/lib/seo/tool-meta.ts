type ToolSeoEntry = { title: string; description: string };

/** Absolute page titles (template appends " | UnionOps"). */
export const TOOL_SEO: Record<"en" | "fr", Record<string, ToolSeoEntry>> = {
  en: {
    "flyer-maker": {
      title: "Free Union Flyer Maker",
      description:
        "Make high-contrast picket and rally flyers for your local. Free, private, and on your device.",
    },
    "graphic-maker": {
      title: "Free Union Graphic Maker",
      description:
        "Make member spotlights and social graphics with your local brand. Runs in your browser.",
    },
    "logo-builder": {
      title: "Free Union Logo Builder",
      description:
        "Build a simple local logo and brand kit for notices, flyers, and social posts.",
    },
    "quote-card": {
      title: "Free Union Quote Card Maker",
      description:
        "Turn leadership quotes into cards for Facebook, Instagram, and boards.",
    },
    resizer: {
      title: "Free Union Image Resizer",
      description:
        "Crop local logo plates or uploads to Facebook, Instagram, YouTube, and custom sizes — true-pixel PNG and ZIP, on your device.",
    },
    "alt-text": {
      title: "Free Union Alt-Text Assistant",
      description: "Draft alt text for union graphics and social posts.",
    },
    "board-notice": {
      title: "Free Union Board Notice Maker",
      description:
        "Print workplace bulletin board notices with clear date, time, and location.",
    },
    "board-banner": {
      title: "Free Union Board Banner & Trim Maker",
      description:
        "Print packed sheets of Brand Kit header strips and frame trim for cork boards. Cut on the dashed lines — free and on your device.",
    },
    "solidarity-poster": {
      title: "Free Solidarity Poster Maker",
      description:
        "Fill empty union boards with bold solidarity posters. Free and on your device.",
    },
    "meeting-background": {
      title: "Free Zoom & Teams Meeting Background Maker",
      description:
        "Bold and minimal virtual backgrounds for Zoom and Teams — face-safe layouts, landscape and portrait, on your device.",
    },
    "qr-card": {
      title: "Free Union QR Link Card Maker",
      description:
        "Print QR link cards so members can find your group, website, or support line.",
    },
    "qr-board": {
      title: "Free Union QR Board Poster Maker",
      description:
        "Print multi-QR posters for union boards — two campaigns or a full set of core links, on your device.",
    },
    "website-template": {
      title: "Free Union Website Template",
      description:
        "Download a simple static website for your local, ready for GitHub Pages.",
    },
    "document-generator": {
      title: "Free Document & Slide Generator",
      description:
        "Make branded Word, Excel, and PowerPoint files for your local. Presets, colour themes, and ZIP download — on your device.",
    },
  },
  fr: {
    "flyer-maker": {
      title: "Créateur de tracts syndicaux gratuit",
      description:
        "Créez des tracts à fort contraste pour piquets et rassemblements. Gratuit, privé, sur votre appareil.",
    },
    "graphic-maker": {
      title: "Créateur de graphiques syndicaux gratuit",
      description:
        "Créez des mises en avant de membres et des graphiques sociaux avec la marque de votre section. Dans votre navigateur.",
    },
    "logo-builder": {
      title: "Créateur de logo syndical gratuit",
      description:
        "Créez un logo de section simple et une trousse de marque pour avis, tracts et publications.",
    },
    "quote-card": {
      title: "Créateur de cartes citation gratuit",
      description:
        "Transformez des citations de dirigeants en cartes pour Facebook, Instagram et babillards.",
    },
    resizer: {
      title: "Redimensionneur d'images syndical gratuit",
      description:
        "Recadrez logos ou téléversements pour Facebook, Instagram, YouTube et formats personnalisés — PNG et ZIP, sur votre appareil.",
    },
    "alt-text": {
      title: "Assistant de texte alternatif gratuit",
      description:
        "Rédigez le texte alternatif pour graphiques et publications syndicales.",
    },
    "board-notice": {
      title: "Créateur d'avis de babillard gratuit",
      description:
        "Imprimez des avis de babillard avec date, heure et lieu clairement indiqués.",
    },
    "board-banner": {
      title: "Créateur de bannières et bordures gratuit",
      description:
        "Imprimez des bandes d'en-tête et de bordure pour babillards. Coupez sur les pointillés — gratuit, sur votre appareil.",
    },
    "solidarity-poster": {
      title: "Créateur d'affiches de solidarité gratuit",
      description:
        "Remplissez les babillards vides avec des affiches de solidarité audacieuses. Gratuit, sur votre appareil.",
    },
    "meeting-background": {
      title: "Arrière-plans Zoom et Teams gratuits",
      description:
        "Fonds virtuels audacieux ou minimalistes pour Zoom et Teams — mises en page sûres pour le visage, paysage et portrait, sur votre appareil.",
    },
    "qr-card": {
      title: "Créateur de cartes QR gratuit",
      description:
        "Imprimez des cartes QR pour que les membres trouvent votre groupe, site ou ligne de soutien.",
    },
    "qr-board": {
      title: "Créateur d'affiches QR pour babillard gratuit",
      description:
        "Imprimez des affiches multi-QR pour babillards — deux campagnes ou un ensemble de liens, sur votre appareil.",
    },
    "website-template": {
      title: "Modèle de site web syndical gratuit",
      description:
        "Téléchargez un site statique simple pour votre section, prêt pour GitHub Pages.",
    },
    "document-generator": {
      title: "Générateur de documents et diapositives gratuit",
      description:
        "Créez des fichiers Word, Excel et PowerPoint à l'image de votre section. Préréglages, thèmes et ZIP — sur votre appareil.",
    },
  },
};

export function getToolSeo(locale: string, slug: string): ToolSeoEntry {
  const loc = locale === "fr" ? "fr" : "en";
  const entry = TOOL_SEO[loc][slug] ?? TOOL_SEO.en[slug];
  if (!entry) {
    return {
      title: "UnionOps Tool",
      description: "Free union local tools on your device.",
    };
  }
  return entry;
}

export const TOOL_SLUGS = Object.keys(TOOL_SEO.en);
