import type { WebsiteNavLink, WebsiteTemplateData } from "@/types/website-template";
import { getOpseuWebsiteFooterSources } from "@/lib/constants/comms-sources";
import {
  isWebsiteHttpUrl,
  toWebsiteNavLinks,
} from "@/lib/templates/website/brand-kit-fields";
import {
  buildWebsiteFontFaceCss,
  canvasFontCssFamily,
  collectWebsiteZipFontFiles,
  DEFAULT_BODY_FONT,
  DEFAULT_HEADLINE_FONT,
  loadCanvasFontBytes,
  WEBSITE_FONT_NOTICE,
  type CanvasFontId,
} from "@/lib/comms/canvas-fonts";
import {
  loadWebsiteHeroArtBytes,
  resolveWebsiteHeroArt,
} from "@/lib/templates/website/hero-art";
import { mutedInkOnBackground } from "@/lib/utils/ink";
import { blendHex } from "@/lib/utils/contrast";

function resolveWebsiteFontIds(canvas?: WebsiteTemplateData["canvas"] | null): {
  headlineFontId: CanvasFontId;
  bodyFontId: CanvasFontId;
} {
  return {
    headlineFontId: canvas?.headlineFontId ?? DEFAULT_HEADLINE_FONT,
    bodyFontId: canvas?.bodyFontId ?? DEFAULT_BODY_FONT,
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildOfficersHtml(officers: WebsiteTemplateData["officers"]): string {
  return officers
    .filter((o) => o.name.trim())
    .map(
      (o) => `        <div class="officer-card">
          <h4>${escapeHtml(o.name)}</h4>
          <p>${escapeHtml(o.role)}</p>
          ${o.location ? `<p class="location">${escapeHtml(o.location)}</p>` : ""}
        </div>`,
    )
    .join("\n");
}

function buildAboutHtml(about1: string, about2: string): string {
  const parts = [about1, about2].filter((p) => p.trim());
  return parts.map((p) => `            <p class="mb-5 text-left">${escapeHtml(p)}</p>`).join("\n");
}

function buildOfficeAddressHtml(unionName: string, officeAddress: string): string {
  const lines = officeAddress.split(/\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return "";
  return `        <ul class="office-address-list">
          <li><strong>${escapeHtml(unionName)}</strong></li>
${lines.map((line) => `          <li>${escapeHtml(line)}</li>`).join("\n")}
        </ul>`;
}

function buildExternalLinkItems(links: readonly WebsiteNavLink[]): string {
  return toWebsiteNavLinks(links)
    .map(
      (link) =>
        `          <li><a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a></li>`,
    )
    .join("\n");
}

function buildFooterColumn(title: string, itemsHtml: string): string {
  if (!itemsHtml.trim()) return "";
  return `      <div class="footer-col">
        <h3>${title}</h3>
        <ul>
${itemsHtml}
        </ul>
      </div>
`;
}

export function buildWebsiteHtml(data: WebsiteTemplateData): string {
  const officersHtml = buildOfficersHtml(data.officers);
  const aboutHtml = buildAboutHtml(data.about1, data.about2);
  const facebookBlock =
    data.facebookUrl.trim() && isWebsiteHttpUrl(data.facebookUrl)
      ? `          <li><a href="${escapeHtml(data.facebookUrl.trim())}" target="_blank" rel="noopener noreferrer">Facebook group</a></li>`
      : "";
  const customLinkItems = buildExternalLinkItems(data.customLinks ?? []);
  const membershipItems = buildExternalLinkItems(data.membershipLinks ?? []);
  const membershipColumn = buildFooterColumn("Membership", membershipItems);
  const membershipContactHtml = membershipItems
    ? `      <p>To apply or update your membership:</p>
      <ul class="contact-links">
${membershipItems}
      </ul>`
    : "";
  const officeAddressHtml = buildOfficeAddressHtml(data.unionName, data.officeAddress);
  const logoHtml = data.logoFileName.trim()
    ? `<img src="./assets/${escapeHtml(data.logoFileName)}" alt="${escapeHtml(data.logoAlt)}" class="header-logo">`
    : `<span class="header-brand-text">${escapeHtml(data.unionName)}</span>`;
  const heroArt = resolveWebsiteHeroArt(data);
  const heroSectionClass = heroArt
    ? `hero-section has-art has-${heroArt.kind}-art`
    : "hero-section";
  const heroArtHtml = heroArt
    ? `    <img class="${heroArt.kind === "photo" ? "hero-art hero-art--photo" : "hero-art hero-art--pattern"}" src="${escapeHtml(heroArt.zipSrc)}" alt="${escapeHtml(heroArt.alt)}">
    <div class="hero-overlay" aria-hidden="true"></div>
`
    : "";
  const opseuFooterLinks = getOpseuWebsiteFooterSources()
    .map(
      (source) =>
        `          <li><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.label)}</a></li>`,
    )
    .join("\n");
  const opseuResourcesHtml = data.includeOpseuResources
    ? `      <div class="footer-col">
        <h3>Union Resources</h3>
        <ul>
${opseuFooterLinks}
        </ul>
      </div>
`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(data.unionName)}</title>
  <meta name="description" content="${escapeHtml(data.heroText)}">
  <link rel="stylesheet" href="./css/style.css">
</head>
<body>
  <header class="site-header">
    <nav class="nav-bar">
      <div class="header-brand">
        ${logoHtml}
      </div>
      <button type="button" class="hamburger" aria-label="Toggle menu" onclick="toggleMenu()">
        <span></span><span></span><span></span>
      </button>
      <ul class="nav-links">
        <li><a href="#home">Home</a></li>
        <li><a href="#about">About</a></li>
        <li><a href="#leadership">Officers</a></li>
        <li><a href="#contact">Contact</a></li>
      </ul>
    </nav>
  </header>

  <section id="home" class="${heroSectionClass}">
${heroArtHtml}    <div class="hero-inner">
      <h1>${escapeHtml(data.unionName)}</h1>
      <div class="text-wrapper">
        <p class="hero-text">${escapeHtml(data.heroText)}</p>
        <a href="#contact" class="cta-button">Get In Touch</a>
      </div>
    </div>
  </section>

  <section id="about" class="info-section">
    <div class="text-wrapper">
      <h2>About Local ${escapeHtml(data.localNumber)}</h2>
${aboutHtml}
    </div>
  </section>

  <section id="leadership" class="support-section">
    <div class="text-wrapper text-center">
      <h2>Your Executive Committee</h2>
      <p class="section-intro">Contact your officers for support, questions about your Collective Agreement, or to get more involved.</p>
    </div>
    <div class="text-wrapper">
      <div class="officer-grid">
${officersHtml}
      </div>
    </div>
  </section>

  <section id="contact" class="contact-section">
    <h2>Contact ${escapeHtml(data.unionName)}</h2>
    <div class="text-wrapper text-center">
      <p>For general inquiries, membership questions, or media requests:</p>
      <p class="contact-email"><a href="mailto:${escapeHtml(data.contactEmail)}">${escapeHtml(data.contactEmail)}</a></p>
${membershipContactHtml}
      ${data.officeAddress.trim() ? `<p class="office-address">${escapeHtml(data.officeAddress)}</p>` : ""}
    </div>
  </section>

  <footer class="footer">
    <div class="footer-container">
      <div class="footer-col">
        <h3>Union Office</h3>
${officeAddressHtml}
        <h3>Contact</h3>
        <ul>
${facebookBlock}
${customLinkItems}
          <li><a href="mailto:${escapeHtml(data.contactEmail)}">${escapeHtml(data.contactEmail)}</a></li>
        </ul>
      </div>
${membershipColumn}${opseuResourcesHtml}      <div class="footer-col">
        <h3>Rights &amp; Partners</h3>
        <ul>
          <li><a href="https://www.ontario.ca/document/your-guide-employment-standards-act-0" target="_blank" rel="noopener noreferrer">Employment Standards Act Guide</a></li>
          <li><a href="https://www.ontario.ca/laws/statute/90h19" target="_blank" rel="noopener noreferrer">Ontario Human Rights Code</a></li>
          <li><a href="https://www.ontario.ca/laws/statute/90o01" target="_blank" rel="noopener noreferrer">Occupational Health &amp; Safety</a></li>
          <li><a href="https://www.wsib.ca/en" target="_blank" rel="noopener noreferrer">WSIB - Ontario</a></li>
          <li><a href="https://ofl.ca" target="_blank" rel="noopener noreferrer">Ontario Federation of Labour</a></li>
          <li><a href="https://nupge.ca/" target="_blank" rel="noopener noreferrer">NUPGE</a></li>
          <li><a href="https://canadianlabour.ca/" target="_blank" rel="noopener noreferrer">Canadian Labour Congress</a></li>
        </ul>
      </div>
    </div>
    <p class="copyright">&copy; ${new Date().getFullYear()} ${escapeHtml(data.unionName)}</p>
  </footer>

  <script src="./js/site.js"></script>
</body>
</html>`;
}

export type BuildWebsiteCssOptions = {
  /**
   * Base URL for `@font-face` src.
   * ZIP: `../assets/fonts` (flat filenames). Preview: `/fonts` (dir/file paths).
   */
  fontUrlBase?: string;
  /** When true (ZIP), font URLs use flattened `dir-file.woff2` names under fontUrlBase. */
  flatFontFileNames?: boolean;
};

export function buildWebsiteCss(
  primaryColor: string,
  secondaryColor: string,
  canvas?: WebsiteTemplateData["canvas"] | null,
  options?: BuildWebsiteCssOptions | null,
): string {
  const footerLinkColor = mutedInkOnBackground(primaryColor, 0.85);
  const footerMutedColor = mutedInkOnBackground(primaryColor, 0.8);
  const officerCardBg = blendHex("#000000", primaryColor, 0.25);
  const officerLocationColor = mutedInkOnBackground(officerCardBg, 0.85);
  const typeScale =
    canvas?.typeScale === "display"
      ? 1.12
      : canvas?.typeScale === "dense"
        ? 0.9
        : 1;
  const spacingScale = canvas?.density === "tight" ? 0.88 : 1;
  const rem = (n: number) => `${Number((n).toFixed(3))}rem`;
  const heroBg =
    canvas?.surface === "soft-gradient"
      ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), linear-gradient(160deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
      : canvas?.surface === "accent-band"
        ? `linear-gradient(${secondaryColor} 0%, ${secondaryColor} 12px, ${primaryColor} 12px, ${primaryColor} 100%)`
        : `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), ${primaryColor}`;
  const { headlineFontId, bodyFontId } = resolveWebsiteFontIds(canvas);
  const headlineStack = canvasFontCssFamily(headlineFontId);
  const bodyStack = canvasFontCssFamily(bodyFontId);
  const fontFiles = collectWebsiteZipFontFiles(headlineFontId, bodyFontId);
  const fontUrlBase = options?.fontUrlBase ?? "/fonts";
  const flatFontFileNames = options?.flatFontFileNames ?? false;
  const fontFaceCss = buildWebsiteFontFaceCss(
    fontFiles,
    fontUrlBase,
    flatFontFileNames,
  );
  const fontFaceBlock = fontFaceCss ? `${fontFaceCss}\n\n` : "";
  return `${fontFaceBlock}:root {
  --color-primary: ${primaryColor};
  --color-secondary: ${secondaryColor};
  --color-dark: #0B203D;
  --color-text: #222;
  --color-white: #fff;
  --spacing-3: ${rem(1 * spacingScale)};
  --spacing-4: ${rem(1.5 * spacingScale)};
  --spacing-5: ${rem(2 * spacingScale)};
  --spacing-8: ${rem(6 * spacingScale)};
  --font-size-base: ${rem(1.125 * typeScale)};
  --font-size-xl: ${rem(1.5 * typeScale)};
  --font-size-h1: ${rem(3 * typeScale)};
  --font-size-h2: ${rem(2.25 * typeScale)};
  --font-headline: ${headlineStack};
  --font-body: ${bodyStack};
}

* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: var(--font-body);
  font-synthesis: none;
  line-height: 1.5;
  color: var(--color-text);
  scroll-behavior: smooth;
}

h1, h2, h3, h4 {
  line-height: 1.2;
  margin: 0 0 1rem;
  font-family: var(--font-headline);
  font-weight: 700;
}

.text-wrapper {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 var(--spacing-4);
}

.text-center { text-align: center; }
.text-left { text-align: left; }
.mb-5 { margin-bottom: var(--spacing-5); }

.site-header {
  background: var(--color-primary);
  padding: var(--spacing-3) var(--spacing-4);
}

.nav-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  max-width: 1280px;
  margin: 0 auto;
}

.header-brand { flex: 1; }

.header-logo {
  max-height: 56px;
  width: auto;
  max-width: 240px;
  height: auto;
  display: block;
  background: #fff;
  padding: 0.4rem 0.6rem;
  border-radius: 4px;
}

.header-brand-text {
  color: var(--color-white);
  font-size: 1.25rem;
  font-weight: 700;
}

.nav-links {
  list-style: none;
  display: flex;
  gap: var(--spacing-3);
  margin: 0;
  padding: 0;
}

.nav-links a {
  color: var(--color-white);
  text-decoration: none;
  font-size: 1.1rem;
}

.nav-links a:hover { text-decoration: underline; }

.hamburger {
  display: none;
  flex-direction: column;
  gap: 4px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
}

.hamburger span {
  display: block;
  width: 24px;
  height: 3px;
  background: var(--color-white);
}

.hero-section {
  position: relative;
  overflow: hidden;
  background: ${heroBg};
  color: var(--color-white);
  text-align: center;
  padding: var(--spacing-8) var(--spacing-4);
}

.hero-art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  z-index: 0;
}

.hero-art--pattern {
  opacity: 0.55;
  mix-blend-mode: multiply;
}

.hero-art--photo {
  opacity: 1;
}

.hero-overlay {
  display: none;
}

.hero-section.has-photo-art .hero-overlay {
  display: block;
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.58));
}

.hero-inner {
  position: relative;
  z-index: 2;
}

.hero-section h1 {
  font-size: var(--font-size-h1);
  color: var(--color-white);
  text-shadow: 0 1px 2px rgba(0,0,0,0.35);
}

.hero-text {
  font-size: var(--font-size-xl);
  max-width: 700px;
  margin: 0 auto var(--spacing-4);
}

.cta-button {
  display: inline-block;
  background: var(--color-secondary);
  color: var(--color-dark);
  padding: var(--spacing-3) var(--spacing-5);
  border-radius: 8px;
  text-decoration: none;
  font-weight: 700;
  font-size: 1.1rem;
}

.info-section {
  padding: var(--spacing-8) var(--spacing-4);
  text-align: center;
}

.support-section {
  background: var(--color-primary);
  color: var(--color-white);
  padding: var(--spacing-8) var(--spacing-4);
}

.support-section h2,
.support-section h3,
.support-section h4 { color: var(--color-white); }

.section-intro {
  max-width: 700px;
  margin: 0 auto var(--spacing-5);
}

.officer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-4);
}

.officer-card {
  background: rgba(0,0,0,0.25);
  padding: var(--spacing-4);
  border-radius: 8px;
  text-align: center;
}

.officer-card h4 { color: var(--color-white); margin-bottom: 0.25rem; }
.officer-card p { margin: 0.25rem 0; }
.officer-card .location { color: ${officerLocationColor}; font-size: 0.9rem; }

.contact-section {
  padding: var(--spacing-8) var(--spacing-4);
  text-align: center;
}

.contact-email a {
  color: var(--color-primary);
  font-size: 1.25rem;
  font-weight: 700;
}

.contact-links {
  list-style: none;
  margin: var(--spacing-3) auto 0;
  padding: 0;
  max-width: 28rem;
}

.contact-links a {
  color: var(--color-primary);
  font-weight: 600;
}

.office-address { margin-top: var(--spacing-3); }

.footer {
  background: var(--color-primary);
  color: var(--color-white);
  padding: var(--spacing-5) var(--spacing-4);
}

.footer-container {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-5);
  max-width: 1280px;
  margin: 0 auto;
}

.footer-col { flex: 1; min-width: 200px; }
.footer-col h3 { color: var(--color-white); margin-top: var(--spacing-4); }
.footer-col h3:first-child { margin-top: 0; }
.footer-col ul { list-style: none; padding: 0; margin: 0 0 var(--spacing-3); }
.footer-col li { margin-bottom: 0.5rem; }
.footer-col a { color: ${footerLinkColor}; }
.footer-col a:hover { color: var(--color-white); }
.office-address-list { margin-bottom: var(--spacing-3); }

.copyright {
  text-align: center;
  margin-top: var(--spacing-5);
  font-size: 0.875rem;
  color: ${footerMutedColor};
}

@media (max-width: 768px) {
  .hamburger { display: flex; }
  .nav-links {
    display: none;
    flex-direction: column;
    width: 100%;
    padding: var(--spacing-3) 0;
  }
  .nav-links.active { display: flex; }
  .hero-section h1 { font-size: 2rem; }
}
`;
}

export function buildWebsiteJs(): string {
  return `function toggleMenu() {
  const navLinks = document.querySelector('.nav-links');
  if (navLinks) navLinks.classList.toggle('active');
}
`;
}

export function buildWebsiteReadme(localNumber: string): string {
  return `# Local ${localNumber} Website

A simple static website for your union local, generated by UnionOps.

## Deploy to GitHub Pages (free)

1. Create a free account at https://github.com
2. Create a new repository named \`local${localNumber}.github.io\` (replace with your local number)
3. Upload all files from this ZIP to the repository root
4. Go to **Settings → Pages**
5. Under **Source**, select **Deploy from branch** → **main** → **/ (root)**
6. Save - your site will be live at \`https://yourusername.github.io\` within a few minutes

## Custom domain (optional)

1. Add a \`CNAME\` file containing your domain (e.g. \`local${localNumber}.org\`)
2. Configure DNS at your registrar to point to GitHub Pages
3. Enable the custom domain in repository Settings → Pages

## Editing content

Open \`index.html\` in any text editor to change text, or regenerate from the Website Template tool in the Support Hub.

The hero background is \`assets/hero.svg\` (or \`assets/hero.jpg\` if you uploaded a photo). Replace that file to swap in a still later.

## No server required

This is a static site - no database, no hosting fees. Contact links use mailto: - no third-party form services needed.
`;
}

export type WebsiteZipLogo = {
  fileName: string;
  bytes: Uint8Array;
};

export type WebsiteZipHeroImage = {
  fileName: string;
  bytes: Uint8Array;
};

export async function generateWebsiteZip(
  data: WebsiteTemplateData,
  logo?: WebsiteZipLogo | null,
  heroImage?: WebsiteZipHeroImage | null,
): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  const exportData: WebsiteTemplateData = {
    ...data,
    logoFileName: logo ? logo.fileName : "",
  };
  if (heroImage) {
    exportData.heroImageFileName = heroImage.fileName;
    exportData.heroImagePreviewSrc =
      data.heroImagePreviewSrc?.trim() || `./assets/${heroImage.fileName}`;
  }

  const { headlineFontId, bodyFontId } = resolveWebsiteFontIds(data.canvas);
  const fontFiles = collectWebsiteZipFontFiles(headlineFontId, bodyFontId);

  zip.file("index.html", buildWebsiteHtml(exportData));
  zip.file(
    "css/style.css",
    buildWebsiteCss(data.primaryColor, data.secondaryColor, data.canvas, {
      fontUrlBase: "../assets/fonts",
      flatFontFileNames: true,
    }),
  );
  zip.file("js/site.js", buildWebsiteJs());
  if (logo) {
    zip.file(`assets/${logo.fileName}`, logo.bytes);
  }
  if (heroImage) {
    zip.file(`assets/${heroImage.fileName}`, heroImage.bytes);
  } else {
    const art = resolveWebsiteHeroArt(exportData);
    if (art?.kind === "pattern" && art.catalogId) {
      const bytes = await loadWebsiteHeroArtBytes(art.catalogId);
      zip.file(`assets/${art.zipFileName}`, bytes);
    }
  }
  if (fontFiles.length > 0) {
    zip.file("assets/fonts/NOTICE.txt", WEBSITE_FONT_NOTICE);
    await Promise.all(
      fontFiles.map(async (f) => {
        const bytes = await loadCanvasFontBytes(f.relativePath);
        zip.file(`assets/fonts/${f.fileName}`, bytes);
      }),
    );
  }
  zip.file("README.md", buildWebsiteReadme(data.localNumber));
  zip.file(
    "CNAME.example",
    `# Rename this file to CNAME and replace with your custom domain\n# e.g. local${data.localNumber}.org\n`,
  );

  return zip.generateAsync({ type: "blob" });
}

export function buildPreviewHtml(data: WebsiteTemplateData): string {
  const css = buildWebsiteCss(
    data.primaryColor,
    data.secondaryColor,
    data.canvas,
    { fontUrlBase: "/fonts", flatFontFileNames: false },
  );
  let body = buildWebsiteHtml(data)
    .replace('<link rel="stylesheet" href="./css/style.css">', `<style>${css}</style>`)
    .replace('<script src="./js/site.js"></script>', "");
  if (data.logoFileName.trim() && data.logoPreviewSrc.trim()) {
    body = body.replace(
      `src="./assets/${data.logoFileName}"`,
      `src="${data.logoPreviewSrc}"`,
    );
  }
  const heroArt = resolveWebsiteHeroArt(data);
  if (heroArt && heroArt.previewSrc !== heroArt.zipSrc) {
    body = body.replace(
      `src="${heroArt.zipSrc}"`,
      `src="${heroArt.previewSrc}"`,
    );
  }
  return body;
}
