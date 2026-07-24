/**
 * Copy builders for transactional SMTP (R3).
 * Announcement / ops class only — never grievance case content.
 */

export function buildInviteAcceptEmail(input: {
  inviteeName: string;
  acceptUrl: string;
  expiresAt: string;
}): { subject: string; text: string } {
  const expires = new Date(input.expiresAt).toLocaleString();
  return {
    subject: "You're invited to UnionOps Officer Hub",
    text: [
      `Hello ${input.inviteeName},`,
      "",
      "You've been invited to join the Officer Hub.",
      `Accept your invite here: ${input.acceptUrl}`,
      "",
      `This link expires on ${expires}.`,
      "",
      "If you weren't expecting this, you can ignore this message.",
      "",
      "— UnionOps (transactional invite; not a mailing list)",
    ].join("\n"),
  };
}

export function buildOfficerMeetingReminderEmail(input: {
  title: string;
  startsAt: string;
  location: string;
  meetingUrl?: string;
}): { subject: string; text: string } {
  const when = new Date(input.startsAt).toLocaleString();
  return {
    subject: `Reminder: ${input.title}`,
    text: [
      "Officer reminder (sent only to you):",
      "",
      `Meeting: ${input.title}`,
      `When: ${when}`,
      `Where: ${input.location}`,
      input.meetingUrl ? `Hub: ${input.meetingUrl}` : undefined,
      "",
      "This is a one-shot transactional reminder — not a campaign.",
      "To stop reminders, do not use the Email-me control (no mailing list is kept).",
      "",
      "— UnionOps",
    ]
      .filter((line): line is string => line != null)
      .join("\n"),
  };
}

export function buildRsvpConfirmationEmail(input: {
  title: string;
  startsAt: string;
  location: string;
  attending: string;
  joinMode?: string;
}): { subject: string; text: string } {
  const when = new Date(input.startsAt).toLocaleString();
  const mode =
    input.joinMode === "on_site"
      ? "On site"
      : input.joinMode === "remote"
        ? "Remote"
        : undefined;
  return {
    subject: `RSVP received: ${input.title}`,
    text: [
      "Thanks — we recorded your RSVP.",
      "",
      `Meeting: ${input.title}`,
      `When: ${when}`,
      `Where: ${input.location}`,
      `Attending: ${input.attending}`,
      mode ? `Join mode: ${mode}` : undefined,
      "",
      "This confirmation was sent because you opted in on the RSVP form.",
      "It is a one-shot transactional message — you will not be added to a list.",
      "",
      "— UnionOps",
    ]
      .filter((line): line is string => line != null)
      .join("\n"),
  };
}

/** Public base URL for links in outbound mail (no trailing slash). */
export function emailAppBaseUrl(requestOrigin?: string | null): string {
  const fromEnv = process.env.AUTH_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (requestOrigin) return requestOrigin.replace(/\/$/, "");
  return "http://localhost:3000";
}
