import type { EmailArtifact } from "@/lib/email/engine";

/** Build a simple .eml blob for steward download (copy-only export). */
export function buildEmlBlob(artifact: EmailArtifact, to = ""): Blob {
  const lines = [
    `To: ${to}`,
    `Subject: ${artifact.subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    artifact.text,
  ];
  return new Blob([lines.join("\r\n")], { type: "message/rfc822" });
}
