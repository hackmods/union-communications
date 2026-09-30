import { resolvePlatformEmailBrand } from "./design-tokens";
import { renderEmailDocument } from "./layout";
import type {
  EmailArtifact,
  EmailBlock,
  EmailLocale,
} from "./types";

function formatWhen(iso: string, locale: EmailLocale): string {
  return new Date(iso).toLocaleString(locale === "fr" ? "fr-CA" : "en-CA");
}

function inviteCopy(
  kind: "officer" | "member" | "president",
  locale: EmailLocale,
): { subject: string; intro: string; cta: string } {
  if (locale === "fr") {
    if (kind === "member") {
      return {
        subject: "Vous êtes invité(e) à votre section locale sur UnionOps",
        intro:
          "Vous avez été invité(e) à rejoindre la salle de votre section locale sur UnionOps (Portail local).",
        cta: "Accepter l'invitation",
      };
    }
    if (kind === "president") {
      return {
        subject: "Configurez votre section locale sur UnionOps",
        intro:
          "Vous avez été invité(e) à configurer votre section locale sur UnionOps avant un lancement plus large. Acceptez l'invitation, puis invitez vos dirigeant(e)s et membres.",
        cta: "Accepter l'invitation",
      };
    }
    return {
      subject: "Vous êtes invité(e) au Hub des dirigeant(e)s UnionOps",
      intro:
        "Vous avez été invité(e) à rejoindre le Hub des dirigeant(e)s de votre section locale. Il s'agit d'une mise en place locale anticipée — pas d'une annonce nationale.",
      cta: "Accepter l'invitation",
    };
  }
  if (kind === "member") {
    return {
      subject: "You're invited to your local on UnionOps",
      intro:
        "You've been invited to join your local's Hall on UnionOps (Local Portal).",
      cta: "Accept invite",
    };
  }
  if (kind === "president") {
    return {
      subject: "Set up your local on UnionOps",
      intro:
        "You've been invited to set up your local on UnionOps before a wider launch. Accept the invite, then invite your officers and members.",
      cta: "Accept invite",
    };
  }
  return {
    subject: "You're invited to UnionOps Officer Hub",
    intro:
      "You've been invited to join the Officer Hub for your local. This is an early local setup — not a national announcement.",
    cta: "Accept invite",
  };
}

export function composeInviteAcceptEmail(input: {
  inviteeName: string;
  acceptUrl: string;
  expiresAt: string;
  kind?: "officer" | "member" | "president";
  locale?: EmailLocale;
}): EmailArtifact {
  const locale = input.locale ?? "en";
  const kind = input.kind ?? "officer";
  const copy = inviteCopy(kind, locale);
  const expires = formatWhen(input.expiresAt, locale);
  const hello =
    locale === "fr" ? `Bonjour ${input.inviteeName},` : `Hello ${input.inviteeName},`;
  const expiresLine =
    locale === "fr"
      ? `Ce lien expire le ${expires}.`
      : `This link expires on ${expires}.`;
  const ignore =
    locale === "fr"
      ? "Si vous n'attendiez pas ce message, vous pouvez l'ignorer."
      : "If you weren't expecting this, you can ignore this message.";

  const blocks: EmailBlock[] = [
    { type: "paragraph", text: hello },
    { type: "paragraph", text: copy.intro },
    { type: "cta", label: copy.cta, href: input.acceptUrl },
    { type: "paragraph", text: expiresLine },
    { type: "paragraph", text: ignore },
  ];

  return renderEmailDocument({
    locale,
    classification: "transactional",
    subject: copy.subject,
    preheader: copy.intro,
    blocks,
    brand: resolvePlatformEmailBrand({
      signOff:
        locale === "fr"
          ? "— UnionOps (invitation transactionnelle; pas une liste de diffusion)"
          : "— UnionOps (transactional invite; not a mailing list)",
    }),
  });
}

export function composeOfficerMeetingReminderEmail(input: {
  title: string;
  startsAt: string;
  location: string;
  meetingUrl?: string;
  locale?: EmailLocale;
}): EmailArtifact {
  const locale = input.locale ?? "en";
  const when = formatWhen(input.startsAt, locale);
  const subject =
    locale === "fr" ? `Rappel : ${input.title}` : `Reminder: ${input.title}`;
  const blocks: EmailBlock[] = [
    {
      type: "paragraph",
      text:
        locale === "fr"
          ? "Rappel dirigeant(e) (envoyé seulement à vous) :"
          : "Officer reminder (sent only to you):",
    },
    {
      type: "metaList",
      rows: [
        {
          label: locale === "fr" ? "Réunion" : "Meeting",
          value: input.title,
        },
        { label: locale === "fr" ? "Quand" : "When", value: when },
        { label: locale === "fr" ? "Où" : "Where", value: input.location },
      ],
    },
  ];
  if (input.meetingUrl) {
    blocks.push({
      type: "cta",
      label: locale === "fr" ? "Ouvrir le Hub" : "Open Hub",
      href: input.meetingUrl,
    });
  }
  blocks.push({
    type: "paragraph",
    text:
      locale === "fr"
        ? "Rappel transactionnel ponctuel — pas une campagne. Pour arrêter les rappels, n'utilisez pas le contrôle « M'envoyer un courriel » (aucune liste n'est conservée)."
        : "This is a one-shot transactional reminder — not a campaign. To stop reminders, do not use the Email-me control (no mailing list is kept).",
  });

  return renderEmailDocument({
    locale,
    classification: "transactional",
    subject,
    blocks,
    brand: resolvePlatformEmailBrand(),
  });
}

export function composeCheckinNudgeEmail(input: {
  question: string;
  periodLabel: string;
  checkinUrl: string;
  locale?: EmailLocale;
}): EmailArtifact {
  const locale = input.locale ?? "en";
  const subject =
    locale === "fr"
      ? "Pointage en attente — répondez dans le Hub"
      : "Check-in waiting — answer in the Hub";
  const blocks: EmailBlock[] = [
    {
      type: "paragraph",
      text:
        locale === "fr"
          ? "Rappel transactionnel ponctuel (envoyé seulement à vous) :"
          : "One-shot transactional reminder (sent only to you):",
    },
    {
      type: "metaList",
      rows: [
        {
          label: locale === "fr" ? "Période" : "Period",
          value: input.periodLabel,
        },
        {
          label: locale === "fr" ? "Question" : "Question",
          value: input.question,
        },
      ],
    },
    {
      type: "cta",
      label: locale === "fr" ? "Répondre au pointage" : "Answer check-in",
      href: input.checkinUrl,
    },
    {
      type: "paragraph",
      text:
        locale === "fr"
          ? "Un seul rappel par période. Ce n'est pas une liste de diffusion."
          : "One nudge per period. This is not a mailing list.",
    },
  ];

  return renderEmailDocument({
    locale,
    classification: "transactional",
    subject,
    blocks,
    brand: resolvePlatformEmailBrand(),
  });
}

export function composeRsvpConfirmationEmail(input: {
  title: string;
  startsAt: string;
  location: string;
  attending: string;
  joinMode?: string;
  locale?: EmailLocale;
}): EmailArtifact {
  const locale = input.locale ?? "en";
  const when = formatWhen(input.startsAt, locale);
  const mode =
    input.joinMode === "on_site"
      ? locale === "fr"
        ? "Sur place"
        : "On site"
      : input.joinMode === "remote"
        ? locale === "fr"
          ? "À distance"
          : "Remote"
        : undefined;
  const subject =
    locale === "fr"
      ? `RSVP reçu : ${input.title}`
      : `RSVP received: ${input.title}`;
  const rows = [
    {
      label: locale === "fr" ? "Réunion" : "Meeting",
      value: input.title,
    },
    { label: locale === "fr" ? "Quand" : "When", value: when },
    { label: locale === "fr" ? "Où" : "Where", value: input.location },
    {
      label: locale === "fr" ? "Présence" : "Attending",
      value: input.attending,
    },
  ];
  if (mode) {
    rows.push({
      label: locale === "fr" ? "Mode" : "Join mode",
      value: mode,
    });
  }

  return renderEmailDocument({
    locale,
    classification: "transactional",
    subject,
    blocks: [
      {
        type: "paragraph",
        text:
          locale === "fr"
            ? "Merci — nous avons enregistré votre RSVP."
            : "Thanks — we recorded your RSVP.",
      },
      { type: "metaList", rows },
      {
        type: "paragraph",
        text:
          locale === "fr"
            ? "Cette confirmation a été envoyée parce que vous avez consenti sur le formulaire RSVP. Message transactionnel ponctuel — vous ne serez pas ajouté(e) à une liste."
            : "This confirmation was sent because you opted in on the RSVP form. It is a one-shot transactional message — you will not be added to a list.",
      },
    ],
    brand: resolvePlatformEmailBrand(),
  });
}

export function composePasswordResetEmail(input: {
  name: string;
  resetUrl: string;
  expiresAt: string;
  locale?: EmailLocale;
}): EmailArtifact {
  const locale = input.locale ?? "en";
  const expires = formatWhen(input.expiresAt, locale);
  const subject =
    locale === "fr"
      ? "Réinitialisez votre mot de passe du Hub des dirigeant(e)s UnionOps"
      : "Reset your UnionOps Officer Hub password";

  return renderEmailDocument({
    locale,
    classification: "security",
    subject,
    blocks: [
      {
        type: "paragraph",
        text:
          locale === "fr"
            ? `Bonjour ${input.name},`
            : `Hello ${input.name},`,
      },
      {
        type: "paragraph",
        text:
          locale === "fr"
            ? "Nous avons reçu une demande de réinitialisation du mot de passe de votre Hub des dirigeant(e)s."
            : "We received a request to reset your Officer Hub password.",
      },
      {
        type: "cta",
        label:
          locale === "fr"
            ? "Choisir un nouveau mot de passe"
            : "Choose a new password",
        href: input.resetUrl,
      },
      {
        type: "paragraph",
        text:
          locale === "fr"
            ? `Ce lien expire le ${expires}.`
            : `This link expires on ${expires}.`,
      },
      {
        type: "paragraph",
        text:
          locale === "fr"
            ? "Si vous n'avez pas demandé cette réinitialisation, ignorez ce message — votre mot de passe restera inchangé."
            : "If you did not request a reset, you can ignore this message — your password will stay the same.",
      },
    ],
    brand: resolvePlatformEmailBrand({
      signOff:
        locale === "fr"
          ? "— UnionOps (réinitialisation transactionnelle; pas une liste de diffusion)"
          : "— UnionOps (transactional password reset; not a mailing list)",
    }),
  });
}

export function composeSignInLinkEmail(input: {
  name: string;
  signInUrl: string;
  expiresAt: string;
  locale?: EmailLocale;
}): EmailArtifact {
  const locale = input.locale ?? "en";
  const expires = formatWhen(input.expiresAt, locale);
  const subject =
    locale === "fr"
      ? "Votre lien de connexion au Hub des dirigeant(e)s UnionOps"
      : "Your UnionOps Officer Hub sign-in link";

  return renderEmailDocument({
    locale,
    classification: "security",
    subject,
    blocks: [
      {
        type: "paragraph",
        text:
          locale === "fr"
            ? `Bonjour ${input.name},`
            : `Hello ${input.name},`,
      },
      {
        type: "paragraph",
        text:
          locale === "fr"
            ? "Utilisez ce lien pour vous connecter au Hub des dirigeant(e)s :"
            : "Use this link to sign in to the Officer Hub:",
      },
      {
        type: "cta",
        label: locale === "fr" ? "Se connecter" : "Sign in",
        href: input.signInUrl,
      },
      {
        type: "paragraph",
        text:
          locale === "fr"
            ? `Ce lien expire le ${expires} et ne peut être utilisé qu'une seule fois.`
            : `This link expires on ${expires} and can only be used once.`,
      },
      {
        type: "paragraph",
        text:
          locale === "fr"
            ? "Si vous n'avez pas demandé ce lien, ignorez ce message."
            : "If you did not request this, you can ignore this message.",
      },
    ],
    brand: resolvePlatformEmailBrand({
      signOff:
        locale === "fr"
          ? "— UnionOps (lien de connexion transactionnel; pas une liste de diffusion)"
          : "— UnionOps (transactional sign-in link; not a mailing list)",
    }),
  });
}
