import type {
  EmailArtifact,
  EmailBlock,
  EmailClassification,
  EmailDocumentInput,
  EmailFormat,
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

function severityLabel(severity: "error" | "warn" | "info"): string {
  return severity.toUpperCase();
}

function blockToText(block: EmailBlock): string[] {
  switch (block.type) {
    case "heading":
      return [block.text, ""];
    case "paragraph":
      return [block.text, ""];
    case "metaList":
      return [...block.rows.map((r) => `${r.label}: ${r.value}`), ""];
    case "cta":
      return [`${block.label}: ${block.href}`, ""];
    case "divider":
      return ["---", ""];
    case "issueList":
      return [
        ...block.items.map(
          (i) =>
            `[${i.count}×] ${i.level} ${i.fingerprint.slice(0, 8)} — ${i.sampleMessage.slice(0, 160)}`,
        ),
        "",
      ];
    case "codeFence":
      return ["```" + (block.language ?? ""), block.text, "```", ""];
    case "bulletList":
      return [...block.items.map((i) => `• ${i}`), ""];
    case "severityCallout":
      return [`[${severityLabel(block.severity)}] ${block.text}`, ""];
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
    case "issueList": {
      const rows = block.items
        .map(
          (i) =>
            `<tr><td style="padding:6px 8px;font-size:13px;font-family:Arial,Helvetica,sans-serif;border-bottom:1px solid #e5e7eb;"><strong>${escapeHtml(String(i.count))}×</strong> ${escapeHtml(i.level)} <code style="font-size:11px;">${escapeHtml(i.fingerprint.slice(0, 12))}</code><br/><span style="color:#374151;">${escapeHtml(i.sampleMessage.slice(0, 160))}</span></td></tr>`,
        )
        .join("");
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;border-collapse:collapse;">${rows}</table>`;
    }
    case "codeFence":
      return `<pre style="margin:0 0 16px;padding:12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;font-size:12px;line-height:1.4;overflow:auto;font-family:Consolas,Monaco,monospace;">${escapeHtml(block.text)}</pre>`;
    case "bulletList":
      return `<ul style="margin:0 0 16px;padding-left:20px;font-size:15px;line-height:1.5;color:#1f2937;font-family:Arial,Helvetica,sans-serif;">${block.items.map((i) => `<li style="margin:0 0 6px;">${escapeHtml(i)}</li>`).join("")}</ul>`;
    case "severityCallout": {
      const bg =
        block.severity === "error"
          ? "#fef2f2"
          : block.severity === "warn"
            ? "#fffbeb"
            : "#f3f4f6";
      const color =
        block.severity === "error"
          ? "#991b1b"
          : block.severity === "warn"
            ? "#92400e"
            : "#374151";
      return `<p style="margin:0 0 16px;padding:12px 14px;background:${bg};color:${color};border-radius:6px;font-size:14px;line-height:1.45;font-family:Arial,Helvetica,sans-serif;"><strong>${escapeHtml(severityLabel(block.severity))}</strong> — ${escapeHtml(block.text)}</p>`;
    }
    default:
      return "";
  }
}

function renderPlainHtml(text: string, locale: EmailLocale): string {
  return `<!DOCTYPE html>
<html lang="${locale}">
<head><meta charset="utf-8" /><title></title></head>
<body style="margin:0;padding:16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#111827;white-space:pre-wrap;">${escapeHtml(text)}</body>
</html>`;
}

/** Render an email document (table layout + plain text, or plain-first). */
export function renderEmailDocument(input: EmailDocumentInput): EmailArtifact {
  const {
    brand,
    locale,
    classification,
    subject,
    preheader,
    blocks,
    footerExtra,
  } = input;
  const format: EmailFormat = input.format ?? "multipart";
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

  if (format === "plain") {
    return {
      subject,
      text,
      html: renderPlainHtml(text, locale),
      format,
    };
  }

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

  return { subject, text, html, format };
}

/** Shared security-notice shell for crisis / step-up style mail. */
export function composeSecurityNotice(input: {
  locale: EmailLocale;
  subject: string;
  brand: EmailDocumentInput["brand"];
  blocks: EmailBlock[];
  preheader?: string;
  footerExtra?: string[];
  format?: EmailFormat;
}): EmailArtifact {
  return renderEmailDocument({
    locale: input.locale,
    classification: "security",
    subject: input.subject,
    preheader: input.preheader,
    brand: input.brand,
    blocks: input.blocks,
    footerExtra: input.footerExtra,
    format: input.format,
  });
}
