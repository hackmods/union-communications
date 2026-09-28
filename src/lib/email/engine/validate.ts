import type { EmailArtifact } from "./types";

export type EmailValidateResult =
  | { ok: true }
  | { ok: false; reasons: string[] };

/** Lightweight artifact guards before preview or send. */
export function validateEmailArtifact(
  artifact: EmailArtifact,
): EmailValidateResult {
  const reasons: string[] = [];
  if (!artifact.subject.trim()) reasons.push("missing_subject");
  if (!artifact.text.trim()) reasons.push("missing_text");
  if (!artifact.html.trim()) reasons.push("missing_html");
  if (artifact.html.includes("<script")) reasons.push("html_contains_script");
  if (artifact.subject.length > 200) reasons.push("subject_too_long");
  if (reasons.length) return { ok: false, reasons };
  return { ok: true };
}
