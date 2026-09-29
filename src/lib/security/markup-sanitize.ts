const HTML_TAG_RE = /<[^>]+>/g;
const SCRIPT_BLOCK_RE = /<script[\s\S]*?<\/script>/gi;
const XML_COMMENT_RE = /<!--[\s\S]*?-->/g;
const XML_PI_RE = /<\?[\s\S]*?\?>/g;

/** Remove HTML tags iteratively until stable (CodeQL multi-char sanitization). */
export function stripHtmlTags(value: string): string {
  let current = value;
  for (let i = 0; i < 32; i += 1) {
    const next = current.replace(HTML_TAG_RE, "");
    if (next === current) return next;
    current = next;
  }
  return current;
}

/** Strip script blocks from HTML markup iteratively (nested/script-tag bypass safe). */
export function removeScriptBlocksFromHtml(html: string): string {
  let current = html;
  for (let i = 0; i < 32; i += 1) {
    const next = current.replace(SCRIPT_BLOCK_RE, "");
    if (next === current) return next.trimEnd();
    current = next;
  }
  return current.trimEnd();
}

/** Remove XML comments and processing instructions before lightweight tag parsing. */
export function scrubXmlMarkupForParsing(xml: string): string {
  let current = xml;
  for (let i = 0; i < 32; i += 1) {
    const next = current.replace(XML_COMMENT_RE, "").replace(XML_PI_RE, "");
    if (next === current) return next;
    current = next;
  }
  return current;
}
