import type { WebsiteTemplateData } from "@/types/website-template";

const OPSEU_HEADER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 80" role="img" aria-label="OPSEU SEFPO">
  <rect width="400" height="80" fill="#003DA5"/>
  <text x="200" y="38" text-anchor="middle" fill="#FFD200" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="bold">OPSEU / SEFPO</text>
  <text x="200" y="62" text-anchor="middle" fill="#FFFFFF" font-family="Arial, Helvetica, sans-serif" font-size="14">Ontario Public Service Employees Union</text>
</svg>`;

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

export function buildWebsiteHtml(data: WebsiteTemplateData): string {
  const officersHtml = buildOfficersHtml(data.officers);
  const aboutHtml = buildAboutHtml(data.about1, data.about2);
  const facebookBlock = data.facebookUrl.trim()
    ? `          <li><a href="${escapeHtml(data.facebookUrl)}" target="_blank" rel="noopener noreferrer">Facebook group</a></li>`
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
        <img src="./assets/opseu-header.svg" alt="OPSEU SEFPO" class="header-logo">
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

  <section id="home" class="hero-section">
    <h1>${escapeHtml(data.unionName)}</h1>
    <div class="text-wrapper">
      <p class="hero-text">${escapeHtml(data.heroText)}</p>
      <a href="#contact" class="cta-button">Get In Touch</a>
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
      ${data.officeAddress.trim() ? `<p class="office-address">${escapeHtml(data.officeAddress)}</p>` : ""}
    </div>
  </section>

  <footer class="footer">
    <div class="footer-container">
      <div class="footer-col">
        <h3>Contact</h3>
        <ul>
          <li><a href="mailto:${escapeHtml(data.contactEmail)}">${escapeHtml(data.contactEmail)}</a></li>
${facebookBlock}
        </ul>
      </div>
      <div class="footer-col">
        <h3>Resources</h3>
        <ul>
          <li><a href="https://members.opseu.org/" target="_blank" rel="noopener noreferrer">OPSEU/SEFPO Member Portal</a></li>
          <li><a href="https://opseu.org/bargaining/collective-agreements-and-arbitration-awards/" target="_blank" rel="noopener noreferrer">Collective Agreements</a></li>
        </ul>
      </div>
    </div>
    <p class="copyright">&copy; ${new Date().getFullYear()} ${escapeHtml(data.unionName)}</p>
  </footer>

  <script src="./js/site.js"></script>
</body>
</html>`;
}

export function buildWebsiteCss(primaryColor: string, secondaryColor: string): string {
  return `:root {
  --color-primary: ${primaryColor};
  --color-secondary: ${secondaryColor};
  --color-dark: #0B203D;
  --color-text: #222;
  --color-white: #fff;
  --spacing-3: 1rem;
  --spacing-4: 1.5rem;
  --spacing-5: 2rem;
  --spacing-8: 6rem;
  --font-size-base: 1.125rem;
  --font-size-xl: 1.5rem;
  --font-size-h1: 3rem;
  --font-size-h2: 2.25rem;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: Arial, Helvetica, sans-serif;
  line-height: 1.5;
  color: var(--color-text);
  scroll-behavior: smooth;
}

h1, h2, h3, h4 { line-height: 1.2; margin: 0 0 1rem; }

.text-wrapper {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 var(--spacing-4);
}

.text-center { text-align: center; }
.text-left { text-align: left; }
.mb-5 { margin-bottom: var(--spacing-5); }

.site-header {
  background: #003DA5;
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
  max-width: 320px;
  width: 100%;
  height: auto;
  display: block;
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
  background: linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), var(--color-primary);
  color: var(--color-white);
  text-align: center;
  padding: var(--spacing-8) var(--spacing-4);
}

.hero-section h1 {
  font-size: var(--font-size-h1);
  color: var(--color-white);
  text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
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
  font-weight: bold;
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
.officer-card .location { opacity: 0.85; font-size: 0.9rem; }

.contact-section {
  padding: var(--spacing-8) var(--spacing-4);
  text-align: center;
}

.contact-email a {
  color: var(--color-primary);
  font-size: 1.25rem;
  font-weight: bold;
}

.office-address { margin-top: var(--spacing-3); }

.footer {
  background: var(--color-dark);
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
.footer-col h3 { color: var(--color-white); }
.footer-col ul { list-style: none; padding: 0; }
.footer-col a { color: #ccc; }

.copyright {
  text-align: center;
  margin-top: var(--spacing-5);
  font-size: 0.875rem;
  opacity: 0.8;
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

A simple static website for your union local, generated by the Local Union Support Hub.

## Deploy to GitHub Pages (free)

1. Create a free account at https://github.com
2. Create a new repository named \`local${localNumber}.github.io\` (replace with your local number)
3. Upload all files from this ZIP to the repository root
4. Go to **Settings → Pages**
5. Under **Source**, select **Deploy from branch** → **main** → **/ (root)**
6. Save — your site will be live at \`https://yourusername.github.io\` within a few minutes

## Custom domain (optional)

1. Add a \`CNAME\` file containing your domain (e.g. \`local${localNumber}.org\`)
2. Configure DNS at your registrar to point to GitHub Pages
3. Enable the custom domain in repository Settings → Pages

## Editing content

Open \`index.html\` in any text editor to change text, or regenerate from the Website Template tool in the Support Hub.

## No server required

This is a static site — no database, no hosting fees. Contact links use mailto: — no third-party form services needed.
`;
}

export function getOpseuHeaderSvg(): string {
  return OPSEU_HEADER_SVG;
}

export async function generateWebsiteZip(
  data: WebsiteTemplateData,
): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  zip.file("index.html", buildWebsiteHtml(data));
  zip.file("css/style.css", buildWebsiteCss(data.primaryColor, data.secondaryColor));
  zip.file("js/site.js", buildWebsiteJs());
  zip.file("assets/opseu-header.svg", getOpseuHeaderSvg());
  zip.file("README.md", buildWebsiteReadme(data.localNumber));
  zip.file(
    "CNAME.example",
    `# Rename this file to CNAME and replace with your custom domain\n# e.g. local${data.localNumber}.org\n`,
  );

  return zip.generateAsync({ type: "blob" });
}

export function buildPreviewHtml(data: WebsiteTemplateData): string {
  const css = buildWebsiteCss(data.primaryColor, data.secondaryColor);
  const body = buildWebsiteHtml(data)
    .replace('<link rel="stylesheet" href="./css/style.css">', `<style>${css}</style>`)
    .replace('src="./assets/opseu-header.svg"', `src="data:image/svg+xml,${encodeURIComponent(getOpseuHeaderSvg())}"`)
    .replace('<script src="./js/site.js"></script>', "");
  return body;
}
