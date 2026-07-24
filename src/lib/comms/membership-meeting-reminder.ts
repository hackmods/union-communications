/**
 * Copy-only officer reminder draft for Hub membership / LEC events (Calendar R2).
 * Distinct from public Comms RSVP invite email and from SMTP remind-email send.
 */

import { buildMailto, type EventEmail } from "@/lib/comms/event-email";

export type MembershipMeetingReminderFields = {
  title: string;
  startsAt: string;
  endsAt?: string;
  location: string;
  publicBlurb?: string;
  quorumNeeded?: number | null;
  foodHeads?: number | null;
  quorumCount?: number | null;
  /** Absolute public RSVP URL when a live token exists. */
  rsvpUrl?: string;
  localNumber: string;
};

export function buildMembershipMeetingReminder(
  fields: MembershipMeetingReminderFields,
  opts: { locale: "en" | "fr" },
): EventEmail {
  const title =
    fields.title.trim() ||
    (opts.locale === "fr" ? "Réunion de section" : "Membership meeting");
  const when = new Date(fields.startsAt).toLocaleString(
    opts.locale === "fr" ? "fr-CA" : "en-CA",
  );
  const localLabel =
    opts.locale === "fr"
      ? `section locale ${fields.localNumber}`
      : `Local ${fields.localNumber}`;

  const tallyLine = (() => {
    if (fields.quorumNeeded == null && fields.foodHeads == null) return undefined;
    if (opts.locale === "fr") {
      const parts: string[] = [];
      if (fields.quorumNeeded != null) {
        parts.push(
          `Quorum : ${fields.quorumCount ?? 0} / ${fields.quorumNeeded}`,
        );
      }
      if (fields.foodHeads != null) {
        parts.push(`Repas (sur place) : ${fields.foodHeads}`);
      }
      return parts.join(" · ");
    }
    const parts: string[] = [];
    if (fields.quorumNeeded != null) {
      parts.push(
        `Quorum: ${fields.quorumCount ?? 0} / ${fields.quorumNeeded}`,
      );
    }
    if (fields.foodHeads != null) {
      parts.push(`Food heads (on site): ${fields.foodHeads}`);
    }
    return parts.join(" · ");
  })();

  if (opts.locale === "fr") {
    return {
      subject: `Rappel — ${title} (${localLabel})`,
      body: [
        "Bonjour,",
        "",
        `Rappel : ${title} pour la ${localLabel}.`,
        `Quand : ${when}`,
        `Où : ${fields.location}`,
        fields.publicBlurb?.trim()
          ? `Détails : ${fields.publicBlurb.trim()}`
          : undefined,
        tallyLine,
        "",
        fields.rsvpUrl
          ? `Lien RSVP public : ${fields.rsvpUrl}`
          : "Créez un jeton RSVP dans le Hub pour partager un lien de réponse.",
        "",
        "Ceci est un brouillon à copier — aucun envoi automatique.",
        "",
        "En solidarité,",
        "",
        "---",
        "MODÈLE — réviser avant envoi. Aucune liste de diffusion membre.",
      ]
        .filter((l): l is string => Boolean(l))
        .join("\n"),
    };
  }

  return {
    subject: `Reminder — ${title} (${localLabel})`,
    body: [
      "Hello,",
      "",
      `Reminder: ${title} for ${localLabel}.`,
      `When: ${when}`,
      `Where: ${fields.location}`,
      fields.publicBlurb?.trim()
        ? `Details: ${fields.publicBlurb.trim()}`
        : undefined,
      tallyLine,
      "",
      fields.rsvpUrl
        ? `Public RSVP link: ${fields.rsvpUrl}`
        : "Create an RSVP token in the Hub to share a reply link.",
      "",
      "This is a copy-only draft — no auto-send.",
      "",
      "In solidarity,",
      "",
      "---",
      "TEMPLATE — review before sending. No member marketing list.",
    ]
      .filter((l): l is string => Boolean(l))
      .join("\n"),
  };
}

export { buildMailto };
