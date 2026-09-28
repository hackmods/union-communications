/** mailto: helper for steward copy-only drafts (no SMTP). */

export function buildMailto(opts: {
  subject: string;
  body: string;
  to?: string;
}): string {
  const params = new URLSearchParams();
  params.set("subject", opts.subject);
  params.set("body", opts.body);
  const query = params.toString().replace(/\+/g, "%20");
  const to = opts.to?.trim() ?? "";
  return `mailto:${to}?${query}`;
}

/** Soft warning when mailto URLs may exceed common client limits. */
export function mailtoLengthWarning(mailtoUrl: string): string | null {
  if (mailtoUrl.length > 1800) {
    return "mailto_too_long";
  }
  return null;
}
