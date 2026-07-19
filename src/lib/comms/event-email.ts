/**
 * Copy-only RSVP invite email for the Document Generator Event notice.
 *
 * Public Comms surface: no auto-send, no member data leaves the device.
 * Officers copy the text (or open their own mail app via mailto) and paste
 * replies into the RSVP Excel. Mirrors the grievance copy-only draft pattern,
 * but announcement-class (no PII, no auth) so it lives in public Comms.
 */

export type EventEmailFields = {
  title?: string;
  subtitle?: string;
  date?: string;
  time?: string;
  location?: string;
  quorumNeeded?: string;
  contactName?: string;
};

export type EventEmail = {
  subject: string;
  body: string;
};

function joinLines(lines: (string | false | undefined | null)[]): string {
  return lines.filter((l): l is string => Boolean(l)).join("\n");
}

export function buildEventInviteEmail(
  fields: EventEmailFields,
  opts: { locale: "en" | "fr"; localNumber: string },
): EventEmail {
  const title = fields.title?.trim() || (opts.locale === "fr" ? "Réunion" : "Meeting");
  const local =
    opts.locale === "fr"
      ? `la section locale ${opts.localNumber}`
      : `Local ${opts.localNumber}`;
  const whenLine = [fields.date, fields.time].filter(Boolean).join(" · ");
  const quorum = fields.quorumNeeded?.trim();

  if (opts.locale === "fr") {
    return {
      subject: `RSVP — ${title} (section locale ${opts.localNumber})`,
      body: joinLines([
        "Bonjour,",
        "",
        `Vous êtes invité(e) à ${title} de ${local}.`,
        whenLine ? `Quand : ${whenLine}` : undefined,
        fields.location ? `Où : ${fields.location}` : undefined,
        "",
        "Merci de répondre avec :",
        "1) Présence : Oui / Non / Peut-être",
        "2) Comment vous joindre : Sur place ou À distance",
        "3) Si sur place : nombre d'invités et restrictions alimentaires",
        "",
        quorum
          ? `Un « Oui » compte pour le quorum (sur place ou à distance). Quorum requis : ${quorum}.`
          : "Un « Oui » compte pour le quorum, sur place ou à distance.",
        "Les réponses « sur place » servent à commander les repas.",
        "",
        "Un fichier calendrier (.ics) peut être joint pour ajouter la réunion à votre agenda.",
        "",
        "En solidarité,",
        fields.contactName?.trim() || "[Nom du contact]",
        "",
        "---",
        "MODÈLE — réviser avant envoi. Aucun envoi automatique; les réponses ne sont pas collectées par cet outil.",
      ]),
    };
  }

  return {
    subject: `RSVP — ${title} (Local ${opts.localNumber})`,
    body: joinLines([
      "Hello,",
      "",
      `You're invited to ${local}'s ${title}.`,
      whenLine ? `When: ${whenLine}` : undefined,
      fields.location ? `Where: ${fields.location}` : undefined,
      "",
      "Please reply with:",
      "1) Attending: Yes / No / Maybe",
      "2) How joining: On site or Remote",
      "3) If on site: number of guests and any dietary needs",
      "",
      quorum
        ? `A "Yes" counts toward quorum whether you join on site or remote. Quorum needed: ${quorum}.`
        : 'A "Yes" counts toward quorum whether you join on site or remote.',
      "On-site replies are used to place the food order.",
      "",
      "A calendar file (.ics) can be attached so you can add the meeting to your calendar.",
      "",
      "In solidarity,",
      fields.contactName?.trim() || "[Contact name]",
      "",
      "---",
      "TEMPLATE — review before sending. No auto-send; this tool does not collect replies.",
    ]),
  };
}

/** Build a mailto: URL (opens the officer's own mail app; no send). */
export function buildMailto(email: EventEmail, to = ""): string {
  const params = new URLSearchParams({
    subject: email.subject,
    body: email.body,
  });
  // URLSearchParams encodes spaces as "+"; mail clients expect %20.
  const query = params.toString().replace(/\+/g, "%20");
  return `mailto:${encodeURIComponent(to)}?${query}`;
}
