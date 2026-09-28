import { resolvePlatformEmailBrand } from "./design-tokens";
import { renderEmailDocument } from "./layout";
import type { EmailArtifact, EmailLocale } from "./types";

/** Wrap freeform campaign body in the shared marketing shell. */
export function composeMarketingCampaignEmail(input: {
  locale: EmailLocale;
  subject: string;
  body: string;
  senderName: string;
  mailingAddress: string;
  contactEmail: string;
  unsubscribeUrl: string;
  testPrefix?: boolean;
}): EmailArtifact {
  const subject = input.testPrefix ? `[TEST] ${input.subject}` : input.subject;
  const paragraphs = input.body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return renderEmailDocument({
    locale: input.locale,
    classification: "marketing",
    subject,
    blocks: [
      ...paragraphs.map((text) => ({
        type: "paragraph" as const,
        text,
      })),
      { type: "divider" },
      {
        type: "cta",
        label:
          input.locale === "fr" ? "Se désabonner" : "Unsubscribe",
        href: input.unsubscribeUrl,
      },
    ],
    brand: resolvePlatformEmailBrand({
      signOff:
        input.locale === "fr"
          ? `— ${input.senderName}`
          : `— ${input.senderName}`,
    }),
    footerExtra: [
      input.locale === "fr"
        ? `Adresse postale : ${input.mailingAddress}`
        : `Mailing address: ${input.mailingAddress}`,
      input.locale === "fr"
        ? `Contact : ${input.contactEmail}`
        : `Contact: ${input.contactEmail}`,
      input.locale === "fr"
        ? `Se désabonner : ${input.unsubscribeUrl}`
        : `Unsubscribe: ${input.unsubscribeUrl}`,
    ],
  });
}

export function composeProductNewsConfirmEmail(input: {
  locale: EmailLocale;
  confirmUrl: string;
}): EmailArtifact {
  const locale = input.locale;
  return renderEmailDocument({
    locale,
    classification: "transactional",
    subject:
      locale === "fr"
        ? "Confirmez votre inscription aux nouvelles UnionOps"
        : "Confirm your UnionOps product-news subscription",
    blocks: [
      {
        type: "paragraph",
        text:
          locale === "fr"
            ? "Vous avez demandé à recevoir les nouvelles sur les produits UnionOps. Confirmez votre adresse en ouvrant ce lien dans les 48 heures."
            : "You asked to receive UnionOps product news. Confirm your address by opening this link within 48 hours.",
      },
      {
        type: "cta",
        label: locale === "fr" ? "Confirmer mon adresse" : "Confirm my address",
        href: input.confirmUrl,
      },
      {
        type: "paragraph",
        text:
          locale === "fr"
            ? "Si vous n’avez rien demandé, ignorez ce message."
            : "If you did not request this, ignore this email.",
      },
    ],
    brand: resolvePlatformEmailBrand(),
  });
}

export function composeProductNewsPreferencesEmail(input: {
  locale: EmailLocale;
  preferencesUrl: string;
}): EmailArtifact {
  const locale = input.locale;
  return renderEmailDocument({
    locale,
    classification: "transactional",
    subject:
      locale === "fr"
        ? "Gérez vos préférences de nouvelles UnionOps"
        : "Manage your UnionOps product-news preferences",
    blocks: [
      {
        type: "paragraph",
        text:
          locale === "fr"
            ? "Utilisez ce lien pour gérer ou retirer votre inscription aux nouvelles sur les produits UnionOps."
            : "Use this link to manage or withdraw your UnionOps product-news subscription.",
      },
      {
        type: "cta",
        label:
          locale === "fr" ? "Ouvrir les préférences" : "Open preferences",
        href: input.preferencesUrl,
      },
      {
        type: "paragraph",
        text:
          locale === "fr"
            ? "Si vous n’avez rien demandé, ignorez ce message."
            : "If you did not request this, ignore this email.",
      },
    ],
    brand: resolvePlatformEmailBrand(),
  });
}
