type ToolSeoEntry = { title: string; description: string };

/** Absolute page titles (template appends " | UnionOps"). */
export const TOOL_SEO: Record<"en" | "fr", Record<string, ToolSeoEntry>> = {
  en: {
    "flyer-maker": {
      title: "Free Union Flyer Maker",
      description:
        "Make high-contrast picket and rally flyers in your local's colours, then export a letter, half-letter, or tabloid PDF. Free, private, and on your device.",
    },
    "graphic-maker": {
      title: "Free Union Graphic Maker",
      description:
        "Make member spotlights and social graphics in your local's colours, with a consent step for member photos. Runs in your browser.",
    },
    "logo-builder": {
      title: "Free Union Logo Builder",
      description:
        "Build a simple local logo, then save it to your Brand Kit so notices, flyers, and social posts all match. Free and on your device.",
    },
    "quote-card": {
      title: "Free Union Quote Card Maker",
      description:
        "Turn a leader or member quote into a branded card for Facebook, Instagram, and workplace boards. Free and on your device.",
    },
    resizer: {
      title: "Free Union Image Resizer",
      description:
        "Crop local logo plates or uploads to Facebook, Instagram, YouTube, and custom sizes. True-pixel PNG and ZIP, on your device.",
    },
    "alt-text": {
      title: "Free Union Alt-Text Assistant",
      description:
        "Draft alt text for union graphics and social posts, then paste it into each platform's accessibility field. Your images are never uploaded.",
    },
    "board-notice": {
      title: "Free Union Board Notice Maker",
      description:
        "Print workplace bulletin board notices with a clear date, time, and location that members can read from across the room. Free and on your device.",
    },
    "board-banner": {
      title: "Free Union Board Banner & Trim Maker",
      description:
        "Print packed sheets of Brand Kit header strips and frame trim for cork boards. Cut on the dashed lines. Free and on your device.",
    },
    "solidarity-poster": {
      title: "Free Solidarity Poster Maker",
      description:
        "Fill empty union boards with bold solidarity posters, and make matching phone wallpapers from the same design. Free and on your device.",
    },
    "meeting-background": {
      title: "Free Zoom & Teams Meeting Background Maker",
      description:
        "Bold and minimal virtual backgrounds for Zoom and Teams: face-safe layouts, landscape and portrait, on your device.",
    },
    "qr-card": {
      title: "Free Union QR Link Card Maker",
      description:
        "Print pocket QR cards so members can find your group, website, or support line from their phone. Free and on your device.",
    },
    "action-card": {
      title: "Free Union Action Card Maker",
      description:
        "Print QR action cards for petitions and campaigns. Link to your external sign-on page. Free and on your device.",
    },
    "pulse-poll": {
      title: "Free Union Pulse Poll Creator",
      description:
        "Author branded bargaining pulse polls and print a QR share card. Privacy-first authoring; responses are not collected in-app yet.",
    },
    "qr-board": {
      title: "Free Union QR Board Poster Maker",
      description:
        "Print multi-QR posters for union boards: two campaigns or a full set of core links, in letter or tabloid size, on your device.",
    },
    "website-template": {
      title: "Free Union Website Template",
      description:
        "Fill in your local details and download a simple website your members can bookmark, ready to publish free on GitHub Pages.",
    },
    "document-generator": {
      title: "Free Document & Slide Generator",
      description:
        "Make branded Word, Excel, and PowerPoint files for your local. Presets, colour themes, and ZIP download on your device.",
    },
  },
  fr: {
    "flyer-maker": {
      title: "Créateur de tracts syndicaux gratuit",
      description:
        "Créez des tracts à fort contraste aux couleurs de votre section, puis exportez un PDF format lettre, demi-lettre ou tabloïd. Gratuit, privé, sur votre appareil.",
    },
    "graphic-maker": {
      title: "Créateur de graphiques syndicaux gratuit",
      description:
        "Créez des mises en avant de membres et des graphiques sociaux aux couleurs de votre section, avec une étape de consentement pour les photos. Dans votre navigateur.",
    },
    "logo-builder": {
      title: "Créateur de logo syndical gratuit",
      description:
        "Créez un logo de section simple, puis enregistrez-le dans la Trousse de marque pour que vos avis, tracts et publications s'accordent. Sur votre appareil.",
    },
    "quote-card": {
      title: "Créateur de cartes citation gratuit",
      description:
        "Transformez la citation d'un dirigeant ou d'un membre en carte à votre image pour Facebook, Instagram et les babillards. Gratuit, sur votre appareil.",
    },
    resizer: {
      title: "Redimensionneur d'images syndical gratuit",
      description:
        "Recadrez logos ou téléversements pour Facebook, Instagram, YouTube et formats personnalisés. PNG et ZIP, sur votre appareil.",
    },
    "alt-text": {
      title: "Assistant de texte alternatif gratuit",
      description:
        "Rédigez le texte alternatif de vos graphiques et publications, puis collez-le dans le champ d'accessibilité de chaque plateforme. Aucune image n'est téléversée.",
    },
    "board-notice": {
      title: "Créateur d'avis de babillard gratuit",
      description:
        "Imprimez des avis de babillard dont la date, l'heure et le lieu se lisent de loin. Gratuit, sur votre appareil.",
    },
    "board-banner": {
      title: "Créateur de bannières et bordures gratuit",
      description:
        "Imprimez des bandes d'en-tête et de bordure pour babillards. Coupez sur les pointillés. Gratuit, sur votre appareil.",
    },
    "solidarity-poster": {
      title: "Créateur d'affiches de solidarité gratuit",
      description:
        "Remplissez les babillards vides avec des affiches de solidarité audacieuses, et créez des fonds d'écran assortis du même visuel. Gratuit, sur votre appareil.",
    },
    "meeting-background": {
      title: "Arrière-plans Zoom et Teams gratuits",
      description:
        "Fonds virtuels audacieux ou minimalistes pour Zoom et Teams : mises en page sûres pour le visage, en paysage ou en portrait, sur votre appareil.",
    },
    "qr-card": {
      title: "Créateur de cartes QR gratuit",
      description:
        "Imprimez des cartes QR de poche pour que les membres trouvent votre groupe, votre site ou votre ligne de soutien depuis leur téléphone. Sur votre appareil.",
    },
    "action-card": {
      title: "Créateur de cartes d'action gratuit",
      description:
        "Imprimez des cartes QR pour pétitions et campagnes. Le lien mène à votre page d'adhésion externe. Gratuit, sur votre appareil.",
    },
    "pulse-poll": {
      title: "Créateur de sondage éclair syndical gratuit",
      description:
        "Rédigez des sondages de négociation avec votre marque et imprimez une carte QR. Les réponses ne sont pas encore collectées dans l’appli.",
    },
    "qr-board": {
      title: "Créateur d'affiches QR pour babillard gratuit",
      description:
        "Imprimez des affiches multi-QR pour babillards : deux campagnes ou un ensemble de liens clés, en format lettre ou tabloïd, sur votre appareil.",
    },
    "website-template": {
      title: "Modèle de site web syndical gratuit",
      description:
        "Remplissez les détails de votre section et téléchargez un site simple que les membres pourront garder en favori, prêt à publier sur GitHub Pages.",
    },
    "document-generator": {
      title: "Générateur de documents et diapositives gratuit",
      description:
        "Créez des fichiers Word, Excel et PowerPoint à l'image de votre section. Préréglages, thèmes et téléchargement ZIP, sur votre appareil.",
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
