import type {
  EmailArtifact,
  EmailBlock,
  EmailClassification,
  EmailDocumentInput,
  EmailLocale,
} from "./types";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function classificationDisclaimer(
  classification: EmailClassification,
  locale: EmailLocale,
): string {
  if (classification === "marketing") {
    return locale === "fr"
      ? "Vous recevez ce message parce que vous vous êtes abonné(e) aux nouvelles produit UnionOps. Vous pouvez vous désabonner en tout temps."
      : "You receive this because you subscribed to UnionOps product news. You can unsubscribe at any time.";
  }
  if (classification === "security") {
    return locale === "fr"
      ? "Message de sécurité transactionnel — pas une liste de diffusion."
      : "Transactional security message — not a mailing list.";
  }
  return locale === "fr"
    ? "Message transactionnel — pas une liste de diffusion."
    : "Transactional message — not a mailing list.";
}

function blockToText(block: EmailBlock): string[] {
  switch (block.type) {
    case "heading":
      return [block.text, ""];
    case "paragraph":
      return [block.text, ""];
    case "metaList":
      return [
        ...block.rows.map((r) => `${r.label}: ${r.value}`),
        "",
      ];
    case "cta":
      return [`${block.label}: ${block.href}`, ""];
    case "divider":
      return ["---", ""];
    default:
      return [];
  }
}

function blockToHtml(block: EmailBlock, brandPrimary: string): string {
  switch (block.type) {
    case "heading":
      return `<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#111827;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(block.text)}</h1>`;
    case "paragraph":
      return `<p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:#1f2937;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(block.text).replace(/\n/g, "<br/>")}</p>`;
    case "metaList": {
      const rows = block.rows
        .map(
          (r) =>
            `<tr><td style="padding:4px 12px 4px 0;font-size:14px;color:#6b7280;font-family:Arial,Helvetica,sans-serif;vertical-align:top;">${escapeHtml(r.label)}</td><td style="padding:4px 0;font-size:14px;color:#111827;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(r.value)}</td></tr>`,
        )
        .join("");
      return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;border-collapse:collapse;">${rows}</table>`;
    }
    case "cta":
      return `<p style="margin:0 0 24px;"><a href="${escapeHtml(block.href)}" style="display:inline-block;background:${escapeHtml(brandPrimary)};color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-size:16px;font-family:Arial,Helvetica,sans-serif;font-weight:bold;">${escapeHtml(block.label)}</a></p><p style="margin:0 0 16px;font-size:13px;line-height:1.4;color:#6b7280;font-family:Arial,Helvetica,sans-serif;word-break:break-all;">${escapeHtml(block.href)}</p>`;
    case "divider":
      return `<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />`;
    default:
      return "";
  }
}

/** Render a multipart email document (table layout + plain text). */
export function renderEmailDocument(input: EmailDocumentInput): EmailArtifact {
  const { brand, locale, classification, subject, preheader, blocks, footerExtra } =
    input;
  const disclaimer = classificationDisclaimer(classification, locale);
  const footerLines = [
    brand.signOff,
    disclaimer,
    ...(footerExtra ?? []),
  ].filter(Boolean);

  const textParts: string[] = [];
  for (const block of blocks) {
    textParts.push(...blockToText(block));
  }
  while (textParts.length && textParts[textParts.length - 1] === "") {
    textParts.pop();
  }
  textParts.push("", ...footerLines);
  const text = textParts.join("\n");

  const bodyHtml = blocks
    .map((b) => blockToHtml(b, brand.primaryColor))
    .join("\n");
  const logoHtml = brand.logoUrl
    ? `<img src="${escapeHtml(brand.logoUrl)}" alt="${escapeHtml(brand.productName)}" width="120" style="display:block;margin:0 0 16px;border:0;max-width:120px;height:auto;" />`
    : `<p style="margin:0 0 16px;font-size:18px;font-weight:bold;color:${escapeHtml(brand.primaryColor)};font-family:Arial,Helvetica,sans-serif;">${escapeHtml(brand.productName)}</p>`;

  const preheaderHtml = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</div>`
    : "";

  const footerHtml = footerLines
    .map(
      (line) =>
        `<p style="margin:0 0 8px;font-size:12px;line-height:1.4;color:#6b7280;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(line)}</p>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="${locale}">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;">
${preheaderHtml}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
      <tr><td style="height:4px;background:${escapeHtml(brand.primaryColor)};font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr><td style="padding:28px 32px;">
        ${logoHtml}
        ${bodyHtml}
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0 16px;" />
        ${footerHtml}
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  return { subject, text, html };
}
