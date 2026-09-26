import type { WebsiteTemplateData } from "@/types/website-template";
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
import {
  WEBSITE_CONFIG_FILE,
  buildWebsiteConfigJson,
} from "@/lib/templates/website/website-config";
import {
  buildWebsiteHtml,
  renderWebsiteSite,
} from "@/lib/templates/website/build-website-html";
import { getWebsiteLayout } from "@/lib/templates/website/layouts/registry";
import { buildIcsCalendar, type IcsEventInput } from "@/lib/calendar/ics";
import { qrDataUrl } from "@/lib/export/qr";
import { isWebsiteHttpUrl } from "@/lib/templates/website/brand-kit-fields";

export { buildWebsiteHtml, renderWebsiteSite } from "@/lib/templates/website/build-website-html";

function resolveWebsiteFontIds(canvas?: WebsiteTemplateData["canvas"] | null): {
  headlineFontId: CanvasFontId;
  bodyFontId: CanvasFontId;
} {
  return {
    headlineFontId: canvas?.headlineFontId ?? DEFAULT_HEADLINE_FONT,
    bodyFontId: canvas?.bodyFontId ?? DEFAULT_BODY_FONT,
  };
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
  extras?: {
    accentColor?: string;
    layoutId?: WebsiteTemplateData["layoutId"];
  } | null,
): string {
  const layout = getWebsiteLayout(extras?.layoutId);
  const accent = extras?.accentColor?.trim() || secondaryColor;
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
  const density = canvas?.density ?? layout.defaultDensity;
  const spacingScale = density === "tight" ? 0.88 : 1;
  const rem = (n: number) => `${Number(n.toFixed(3))}rem`;
  const surface = canvas?.surface;
  let heroBg = `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), ${primaryColor}`;
  if (surface === "soft-gradient") {
    heroBg = `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), linear-gradient(160deg, ${primaryColor} 0%, ${secondaryColor} 100%)`;
  } else if (surface === "accent-band") {
    heroBg = `linear-gradient(${accent} 0%, ${accent} 12px, ${primaryColor} 12px, ${primaryColor} 100%)`;
  } else if (surface === "grain") {
    heroBg = `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.55)), repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px), ${primaryColor}`;
  } else if (surface === "duotone") {
    heroBg = `linear-gradient(135deg, ${primaryColor} 0%, ${blendHex(primaryColor, accent, 0.55)} 45%, ${accent} 100%)`;
  } else if (surface === "flat") {
    heroBg = primaryColor;
  }
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
  --color-accent: ${accent};
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

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.skip-link {
  position: absolute;
  left: -9999px;
  top: 0;
  z-index: 1000;
  padding: 0.75rem 1rem;
  background: var(--color-white);
  color: var(--color-dark);
  font-weight: 700;
}

.skip-link:focus {
  left: var(--spacing-3);
  top: var(--spacing-3);
}

body {
  margin: 0;
  font-family: var(--font-body);
  font-synthesis: none;
  line-height: 1.5;
  color: var(--color-text);
  scroll-behavior: smooth;
  font-size: var(--font-size-base);
}

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

a:focus-visible,
button:focus-visible {
  outline: 3px solid var(--color-accent);
  outline-offset: 2px;
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
.about-p { text-align: left; }
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

.nav-underline .nav-links a {
  border-bottom: 2px solid transparent;
  padding-bottom: 0.15rem;
}
.nav-underline .nav-links a:hover {
  text-decoration: none;
  border-bottom-color: var(--color-accent);
}

.nav-quiet .site-header,
.layout-hall .site-header {
  background: var(--color-white);
  border-bottom: 1px solid color-mix(in srgb, var(--color-primary) 25%, transparent);
}
.layout-hall .nav-links a,
.nav-quiet .nav-links a {
  color: var(--color-primary);
}
.layout-hall .header-brand-text,
.nav-quiet .header-brand-text {
  color: var(--color-primary);
}
.layout-hall .hamburger span,
.nav-quiet .hamburger span {
  background: var(--color-primary);
}

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

.hero-editorial {
  text-align: left;
}
.hero-editorial .hero-text,
.hero-editorial .hero-tagline {
  margin-left: 0;
  margin-right: 0;
}
.hero-editorial .cta-button {
  margin-left: 0;
}

.hero-split {
  text-align: left;
  display: grid;
}
.hero-split .hero-inner {
  max-width: 1280px;
  margin: 0 auto;
  width: 100%;
  display: grid;
  gap: var(--spacing-4);
}
@media (min-width: 900px) {
  .hero-split .hero-inner {
    grid-template-columns: 1.1fr 0.9fr;
    align-items: end;
  }
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

.hero-art--photo { opacity: 1; }

.hero-overlay { display: none; }

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

.hero-tagline {
  font-size: 1rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  opacity: 0.9;
  margin: 0 0 var(--spacing-3);
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

.layout-bulletin .cta-button {
  background: var(--color-accent);
  color: var(--color-dark);
  border-radius: 2px;
}

.layout-hall .cta-button {
  background: transparent;
  color: var(--color-white);
  border: 2px solid var(--color-white);
  border-radius: 999px;
}

.info-section {
  padding: var(--spacing-8) var(--spacing-4);
  text-align: center;
}

.layout-bulletin .info-section {
  text-align: left;
}
.layout-bulletin .about-p { max-width: 42rem; }

.support-section {
  background: var(--color-primary);
  color: var(--color-white);
  padding: var(--spacing-8) var(--spacing-4);
}

.support-section h2,
.support-section h3,
.support-section h4 { color: var(--color-white); }

.layout-bulletin .support-section {
  background: var(--color-white);
  color: var(--color-text);
  border-top: 4px solid var(--color-accent);
}
.layout-bulletin .support-section h2,
.layout-bulletin .support-section h3,
.layout-bulletin .support-section h4 {
  color: var(--color-primary);
}

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

.layout-bulletin .officer-card {
  background: color-mix(in srgb, var(--color-primary) 8%, white);
  border-left: 4px solid var(--color-accent);
  border-radius: 0;
  text-align: left;
}

.officer-card h4 { color: var(--color-white); margin-bottom: 0.25rem; }
.layout-bulletin .officer-card h4 { color: var(--color-primary); }
.officer-card p { margin: 0.25rem 0; }
.officer-card .location,
.officer-card .committee { color: ${officerLocationColor}; font-size: 0.9rem; }
.layout-bulletin .officer-card .location,
.layout-bulletin .officer-card .committee {
  color: color-mix(in srgb, var(--color-text) 70%, white);
}

.officer-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-width: 40rem;
}
.officer-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid color-mix(in srgb, var(--color-primary) 18%, transparent);
}
.officer-row span { color: color-mix(in srgb, var(--color-text) 72%, white); }

.resources-grid {
  display: grid;
  gap: var(--spacing-5);
  text-align: left;
}
@media (min-width: 768px) {
  .resources-grid { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
}

.event-list {
  list-style: none;
  margin: 0;
  padding: 0;
  text-align: left;
  display: grid;
  gap: var(--spacing-4);
}
.event-card {
  border: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent);
  padding: var(--spacing-4);
  border-radius: 8px;
}
.event-ics { margin-top: var(--spacing-4); }

.contact-section {
  padding: var(--spacing-8) var(--spacing-4);
  text-align: center;
}

.contact-email a,
.contact-phone a {
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

.office-address,
.office-hours { margin-top: var(--spacing-3); }

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
.site-qr { margin-top: var(--spacing-3); }
.site-qr img { background: #fff; padding: 0.35rem; border-radius: 4px; }

.copyright {
  text-align: center;
  margin-top: var(--spacing-5);
  font-size: 0.875rem;
  color: ${footerMutedColor};
}
.copyright a { color: ${footerLinkColor}; }

.privacy-page { text-align: left; min-height: 50vh; }

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

@media print {
  .site-header, .hamburger, .skip-link { position: static; }
  .cta-button { border: 1px solid #000; }
  .support-section { background: #fff !important; color: #000 !important; }
  .footer { break-inside: avoid; }
}
`;
}

export function buildWebsiteJs(): string {
  return `function toggleMenu() {
  const navLinks = document.querySelector('.nav-links');
  const btn = document.querySelector('.hamburger');
  if (!navLinks) return;
  const open = navLinks.classList.toggle('active');
  if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
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

To update copy later, open https://unionops.org/tools/website-template and import \`${WEBSITE_CONFIG_FILE}\` from this ZIP (or import the ZIP itself). Edit the fields and download a fresh ZIP.

You can also open \`index.html\` in any text editor for a small fix.

The hero background is \`assets/hero.svg\` (or \`assets/hero.jpg\` if you uploaded a photo). Replace that file to swap in a still later.

Layout choices (Solidarity / Bulletin / Hall) live in \`${WEBSITE_CONFIG_FILE}\` as \`layoutId\`. Switching layouts in UnionOps keeps your copy.

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

/** Minimal JSZip-like writer so GitHub Pages and WordPress exporters share media packing. */
export type WebsiteZipWriter = {
  file: (name: string, data: string | Uint8Array) => unknown;
};

export function prepareWebsiteExportData(
  data: WebsiteTemplateData,
  logo?: WebsiteZipLogo | null,
  heroImage?: WebsiteZipHeroImage | null,
): WebsiteTemplateData {
  const exportData: WebsiteTemplateData = {
    ...data,
    logoFileName: logo ? logo.fileName : "",
  };
  if (heroImage) {
    exportData.heroImageFileName = heroImage.fileName;
    exportData.heroImagePreviewSrc =
      data.heroImagePreviewSrc?.trim() || `./assets/${heroImage.fileName}`;
  }
  return exportData;
}

function websiteEventsToIcs(data: WebsiteTemplateData): string | null {
  const events = (data.events ?? []).filter((e) => e.title.trim());
  if (!events.length) return null;
  const inputs: IcsEventInput[] = events.map((event, index) => {
    const raw = event.when.trim();
    let startsAt = raw;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      startsAt = `${raw}T15:00:00.000Z`;
    } else if (!raw || Number.isNaN(Date.parse(raw))) {
      startsAt = new Date().toISOString();
    }
    const startMs = Date.parse(startsAt);
    const endsAt = new Date(startMs + 60 * 60 * 1000).toISOString();
    return {
      uid: `unionops-website-${data.localNumber}-${index}@local`,
      title: event.title.trim(),
      description: event.detail?.trim() || undefined,
      location: event.location?.trim() || undefined,
      startsAt: new Date(startMs).toISOString(),
      endsAt,
    };
  });
  return buildIcsCalendar(inputs);
}

async function qrPngBytes(url: string): Promise<Uint8Array | null> {
  const dataUrl = await qrDataUrl(url, { width: 240, margin: 1 });
  if (!dataUrl?.startsWith("data:")) return null;
  const base64 = dataUrl.split(",")[1];
  if (!base64) return null;
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(base64, "base64"));
  }
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/** Logo, hero art, and OFL font files — same layout in both ZIP exporters. */
export async function addWebsiteMediaToZip(
  zip: WebsiteZipWriter,
  data: WebsiteTemplateData,
  logo?: WebsiteZipLogo | null,
  heroImage?: WebsiteZipHeroImage | null,
): Promise<void> {
  if (logo) {
    zip.file(`assets/${logo.fileName}`, logo.bytes);
  }
  if (heroImage) {
    zip.file(`assets/${heroImage.fileName}`, heroImage.bytes);
  } else {
    const art = resolveWebsiteHeroArt(data);
    if (art?.kind === "pattern" && art.catalogId) {
      const bytes = await loadWebsiteHeroArtBytes(art.catalogId);
      zip.file(`assets/${art.zipFileName}`, bytes);
    }
  }
  const { headlineFontId, bodyFontId } = resolveWebsiteFontIds(data.canvas);
  const fontFiles = collectWebsiteZipFontFiles(headlineFontId, bodyFontId);
  if (fontFiles.length > 0) {
    zip.file("assets/fonts/NOTICE.txt", WEBSITE_FONT_NOTICE);
    await Promise.all(
      fontFiles.map(async (f) => {
        const bytes = await loadCanvasFontBytes(f.relativePath);
        zip.file(`assets/fonts/${f.fileName}`, bytes);
      }),
    );
  }
  if (
    data.includeSiteQr &&
    data.websiteUrl?.trim() &&
    isWebsiteHttpUrl(data.websiteUrl)
  ) {
    const bytes = await qrPngBytes(data.websiteUrl.trim());
    if (bytes) zip.file("assets/site-qr.png", bytes);
  }
}

function cssForData(data: WebsiteTemplateData, options?: BuildWebsiteCssOptions | null) {
  return buildWebsiteCss(
    data.primaryColor,
    data.secondaryColor,
    data.canvas,
    options,
    { accentColor: data.accentColor, layoutId: data.layoutId },
  );
}

export async function generateWebsiteZip(
  data: WebsiteTemplateData,
  logo?: WebsiteZipLogo | null,
  heroImage?: WebsiteZipHeroImage | null,
): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const exportData = prepareWebsiteExportData(data, logo, heroImage);
  const rendered = renderWebsiteSite(exportData);

  for (const page of rendered.pages) {
    zip.file(page.path, page.html);
  }
  zip.file(
    "css/style.css",
    cssForData(exportData, {
      fontUrlBase: "../assets/fonts",
      flatFontFileNames: true,
    }),
  );
  zip.file("js/site.js", buildWebsiteJs());
  const ics = websiteEventsToIcs(exportData);
  if (ics) zip.file("calendar.ics", ics);
  await addWebsiteMediaToZip(zip, exportData, logo, heroImage);
  zip.file(WEBSITE_CONFIG_FILE, buildWebsiteConfigJson(exportData));
  zip.file("README.md", buildWebsiteReadme(data.localNumber));
  zip.file(
    "CNAME.example",
    `# Rename this file to CNAME and replace with your custom domain\n# e.g. local${data.localNumber}.org\n`,
  );

  return zip.generateAsync({ type: "blob" });
}

export function buildPreviewHtml(data: WebsiteTemplateData): string {
  const css = cssForData(data, {
    fontUrlBase: "/fonts",
    flatFontFileNames: false,
  });
  let body = buildWebsiteHtml(data)
    .replace(
      '<link rel="stylesheet" href="./css/style.css">',
      `<style>${css}</style>`,
    )
    .replace('<script src="./js/site.js"></script>', `<script>${buildWebsiteJs()}</script>`);
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
