/**
 * Website Template HTML renderer — shared sections + layout composition.
 * Returns one or more pages; today layouts emit index (+ optional privacy).
 */

import type { WebsiteNavLink, WebsiteOfficer, WebsiteTemplateData } from "@/types/website-template";
import {
  getOpseuWebsiteFooterSources,
  getWebsiteRightsPartnersFederationSources,
  getWebsiteRightsPartnersOntarioSources,
} from "@/lib/constants/comms-sources";
import {
  isWebsiteHttpUrl,
  toWebsiteNavLinks,
} from "@/lib/templates/website/brand-kit-fields";
import { escapeHtml } from "@/lib/templates/website/html-escape";
import {
  getWebsiteLayout,
  type WebsiteLayoutDefinition,
  type WebsiteSectionId,
} from "@/lib/templates/website/layouts/registry";
import { partitionWebsiteOfficers } from "@/lib/org-chart/website";
import { resolveWebsiteHeroArt } from "@/lib/templates/website/hero-art";
import {
  resolveWebsiteSiteStrings,
  type WebsiteSiteStrings,
} from "@/lib/templates/website/site-strings";

export type WebsiteRenderedPage = {
  /** Path inside the ZIP, e.g. `index.html` or `privacy.html` */
  path: string;
  html: string;
};

export type WebsiteRenderResult = {
  pages: WebsiteRenderedPage[];
  layout: WebsiteLayoutDefinition;
  strings: WebsiteSiteStrings;
};

function buildOfficerCards(officers: WebsiteOfficer[]): string {
  return officers
    .filter((o) => o.name.trim())
    .map((o) => {
      const unit =
        o.unit === "ft" ? " (FT)" : o.unit === "pt" ? " (PT)" : "";
      const committee =
        o.committeeName?.trim()
          ? `<p class="committee">${escapeHtml(o.committeeName)}</p>`
          : "";
      return `        <div class="officer-card">
          <h4>${escapeHtml(o.name)}${escapeHtml(unit)}</h4>
          <p>${escapeHtml(o.role)}</p>
          ${committee}
          ${o.location ? `<p class="location">${escapeHtml(o.location)}</p>` : ""}
        </div>`;
    })
    .join("\n");
}

function buildOfficerList(officers: WebsiteOfficer[]): string {
  return officers
    .filter((o) => o.name.trim())
    .map((o) => {
      const unit =
        o.unit === "ft" ? " (FT)" : o.unit === "pt" ? " (PT)" : "";
      const meta = [o.role, o.committeeName, o.location]
        .filter((part) => part && String(part).trim())
        .map((part) => escapeHtml(String(part)))
        .join(" · ");
      return `        <li class="officer-row"><strong>${escapeHtml(o.name)}${escapeHtml(unit)}</strong>${meta ? `<span>${meta}</span>` : ""}</li>`;
    })
    .join("\n");
}

function buildAboutHtml(about1: string, about2: string): string {
  const parts = [about1, about2].filter((p) => p.trim());
  return parts
    .map((p) => `            <p class="mb-5 about-p">${escapeHtml(p)}</p>`)
    .join("\n");
}

function buildOfficeAddressHtml(
  unionName: string,
  officeAddress: string,
): string {
  const lines = officeAddress
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
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

function navItems(
  data: WebsiteTemplateData,
  strings: WebsiteSiteStrings,
  parts: ReturnType<typeof partitionWebsiteOfficers>,
): { href: string; label: string }[] {
  const items: { href: string; label: string }[] = [
    { href: "#home", label: strings.home },
    { href: "#about", label: strings.about },
  ];
  if (parts.executive.length) {
    items.push({ href: "#leadership", label: strings.officers });
  }
  if (parts.stewards.length) {
    items.push({ href: "#stewards", label: strings.stewards });
  }
  if (parts.committees.length) {
    items.push({ href: "#committees", label: strings.committees });
  }
  const hasResources =
    (data.customLinks?.length ?? 0) > 0 ||
    (data.membershipLinks?.length ?? 0) > 0 ||
    data.includeOpseuResources;
  if (hasResources) {
    items.push({ href: "#resources", label: strings.resources });
  }
  if ((data.events?.length ?? 0) > 0) {
    items.push({ href: "#events", label: strings.events });
  }
  items.push({ href: "#contact", label: strings.contact });
  return items;
}

function renderHeader(
  data: WebsiteTemplateData,
  strings: WebsiteSiteStrings,
  layout: WebsiteLayoutDefinition,
  parts: ReturnType<typeof partitionWebsiteOfficers>,
): string {
  const logoHtml = data.logoFileName.trim()
    ? `<img src="./assets/${escapeHtml(data.logoFileName)}" alt="${escapeHtml(data.logoAlt)}" class="header-logo">`
    : `<span class="header-brand-text">${escapeHtml(data.unionName)}</span>`;
  const links = navItems(data, strings, parts)
    .map(
      (item) =>
        `        <li><a href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a></li>`,
    )
    .join("\n");
  return `  <header class="site-header nav-${layout.navStyle}">
    <nav class="nav-bar" aria-label="${escapeHtml(strings.home)}">
      <div class="header-brand">
        ${logoHtml}
      </div>
      <button type="button" class="hamburger" aria-label="${escapeHtml(strings.toggleMenu)}" aria-expanded="false" aria-controls="primary-nav" onclick="toggleMenu()">
        <span></span><span></span><span></span>
      </button>
      <ul id="primary-nav" class="nav-links">
${links}
      </ul>
    </nav>
  </header>`;
}

function renderHero(
  data: WebsiteTemplateData,
  strings: WebsiteSiteStrings,
  layout: WebsiteLayoutDefinition,
): string {
  const heroArt = resolveWebsiteHeroArt(data);
  const heroSectionClass = [
    "hero-section",
    `hero-${layout.heroStyle}`,
    heroArt ? `has-art has-${heroArt.kind}-art` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const heroArtHtml = heroArt
    ? `    <img class="${heroArt.kind === "photo" ? "hero-art hero-art--photo" : "hero-art hero-art--pattern"}" src="${escapeHtml(heroArt.zipSrc)}" alt="${escapeHtml(heroArt.alt)}">
    <div class="hero-overlay" aria-hidden="true"></div>
`
    : "";
  const cta = (data.ctaLabel?.trim() || strings.getInTouch).trim();
  const tagline = data.tagline?.trim()
    ? `<p class="hero-tagline">${escapeHtml(data.tagline.trim())}</p>`
    : "";
  return `  <section id="home" class="${heroSectionClass}">
${heroArtHtml}    <div class="hero-inner">
      <h1>${escapeHtml(data.unionName)}</h1>
      ${tagline}
      <div class="text-wrapper">
        <p class="hero-text">${escapeHtml(data.heroText)}</p>
        <a href="#contact" class="cta-button">${escapeHtml(cta)}</a>
      </div>
    </div>
  </section>`;
}

function renderAbout(
  data: WebsiteTemplateData,
  strings: WebsiteSiteStrings,
): string {
  return `  <section id="about" class="info-section">
    <div class="text-wrapper">
      <h2>${escapeHtml(strings.aboutLocal(data.localNumber))}</h2>
${buildAboutHtml(data.about1, data.about2)}
    </div>
  </section>`;
}

function renderPeopleSection(options: {
  id: string;
  title: string;
  intro: string;
  officers: WebsiteOfficer[];
  layout: WebsiteLayoutDefinition;
  band?: boolean;
}): string {
  if (!options.officers.length) return "";
  const list =
    options.layout.leadershipStyle === "editorial-list"
      ? `      <ul class="officer-list">
${buildOfficerList(options.officers)}
      </ul>`
      : `      <div class="officer-grid">
${buildOfficerCards(options.officers)}
      </div>`;
  const sectionClass = options.band
    ? "support-section people-section"
    : "info-section people-section";
  return `  <section id="${options.id}" class="${sectionClass}">
    <div class="text-wrapper text-center">
      <h2>${escapeHtml(options.title)}</h2>
      <p class="section-intro">${escapeHtml(options.intro)}</p>
    </div>
    <div class="text-wrapper">
${list}
    </div>
  </section>`;
}

function renderResources(
  data: WebsiteTemplateData,
  strings: WebsiteSiteStrings,
): string {
  const custom = buildExternalLinkItems(data.customLinks ?? []);
  const membership = buildExternalLinkItems(data.membershipLinks ?? []);
  const opseu = data.includeOpseuResources
    ? getOpseuWebsiteFooterSources()
        .map(
          (source) =>
            `          <li><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.label)}</a></li>`,
        )
        .join("\n")
    : "";
  if (!custom && !membership && !opseu) return "";
  return `  <section id="resources" class="info-section resources-section">
    <div class="text-wrapper">
      <h2>${escapeHtml(strings.resources)}</h2>
      <div class="resources-grid">
${membership ? `        <div><h3>${escapeHtml(strings.membership)}</h3><ul class="contact-links">\n${membership}\n        </ul></div>` : ""}
${custom ? `        <div><h3>${escapeHtml(strings.resources)}</h3><ul class="contact-links">\n${custom}\n        </ul></div>` : ""}
${opseu ? `        <div><h3>${escapeHtml(strings.unionResources)}</h3><ul class="contact-links">\n${opseu}\n        </ul></div>` : ""}
      </div>
    </div>
  </section>`;
}

function renderEvents(
  data: WebsiteTemplateData,
  strings: WebsiteSiteStrings,
): string {
  const events = (data.events ?? []).filter((e) => e.title.trim());
  if (!events.length) return "";
  const items = events
    .map((event) => {
      const when = event.when.trim()
        ? `<time datetime="${escapeHtml(event.when.trim())}">${escapeHtml(event.when.trim())}</time>`
        : "";
      const location = event.location?.trim()
        ? `<p class="event-location">${escapeHtml(event.location.trim())}</p>`
        : "";
      const detail = event.detail?.trim()
        ? `<p>${escapeHtml(event.detail.trim())}</p>`
        : "";
      return `        <li class="event-card">
          <h3>${escapeHtml(event.title.trim())}</h3>
          ${when}
          ${location}
          ${detail}
        </li>`;
    })
    .join("\n");
  return `  <section id="events" class="info-section events-section">
    <div class="text-wrapper">
      <h2>${escapeHtml(strings.upcomingEvents)}</h2>
      <ul class="event-list">
${items}
      </ul>
      <p class="event-ics"><a href="./calendar.ics">${escapeHtml(strings.downloadCalendar)}</a></p>
    </div>
  </section>`;
}

function renderContact(
  data: WebsiteTemplateData,
  strings: WebsiteSiteStrings,
): string {
  const membershipItems = buildExternalLinkItems(data.membershipLinks ?? []);
  const membershipContactHtml = membershipItems
    ? `      <p>${escapeHtml(strings.membershipIntro)}</p>
      <ul class="contact-links">
${membershipItems}
      </ul>`
    : "";
  const phone = data.contactPhone?.trim()
    ? `<p class="contact-phone"><span class="sr-only">${escapeHtml(strings.phone)}: </span><a href="tel:${escapeHtml(data.contactPhone.trim().replace(/[^\d+]/g, ""))}">${escapeHtml(data.contactPhone.trim())}</a></p>`
    : "";
  const hours = data.officeHours?.trim()
    ? `<p class="office-hours"><strong>${escapeHtml(strings.officeHours)}:</strong> ${escapeHtml(data.officeHours.trim())}</p>`
    : "";
  return `  <section id="contact" class="contact-section">
    <h2>${escapeHtml(strings.contactHeading(data.unionName))}</h2>
    <div class="text-wrapper text-center">
      <p>${escapeHtml(strings.contactIntro)}</p>
      <p class="contact-email"><a href="mailto:${escapeHtml(data.contactEmail)}">${escapeHtml(data.contactEmail)}</a></p>
${phone}
${hours}
${membershipContactHtml}
      ${data.officeAddress.trim() ? `<p class="office-address">${escapeHtml(data.officeAddress)}</p>` : ""}
    </div>
  </section>`;
}

function renderFooter(
  data: WebsiteTemplateData,
  strings: WebsiteSiteStrings,
): string {
  const facebookBlock =
    data.facebookUrl.trim() && isWebsiteHttpUrl(data.facebookUrl)
      ? `          <li><a href="${escapeHtml(data.facebookUrl.trim())}" target="_blank" rel="noopener noreferrer">${escapeHtml(strings.facebookGroup)}</a></li>`
      : "";
  const websiteBlock =
    data.websiteUrl?.trim() && isWebsiteHttpUrl(data.websiteUrl)
      ? `          <li><a href="${escapeHtml(data.websiteUrl.trim())}" target="_blank" rel="noopener noreferrer">${escapeHtml(data.websiteUrl.trim())}</a></li>`
      : "";
  const customLinkItems = buildExternalLinkItems(data.customLinks ?? []);
  const membershipItems = buildExternalLinkItems(data.membershipLinks ?? []);
  const membershipColumn = buildFooterColumn(
    strings.membership,
    membershipItems,
  );
  const officeAddressHtml = buildOfficeAddressHtml(
    data.unionName,
    data.officeAddress,
  );
  const opseuFooterLinks = getOpseuWebsiteFooterSources()
    .map(
      (source) =>
        `          <li><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.label)}</a></li>`,
    )
    .join("\n");
  const federationFooterLinks = getWebsiteRightsPartnersFederationSources()
    .map(
      (source) =>
        `          <li><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.label)}</a></li>`,
    )
    .join("\n");
  const ontarioFooterLinks = getWebsiteRightsPartnersOntarioSources()
    .map(
      (source) =>
        `          <li><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.label)}</a></li>`,
    )
    .join("\n");
  const opseuResourcesHtml = data.includeOpseuResources
    ? `      <div class="footer-col">
        <h3>${escapeHtml(strings.unionResources)}</h3>
        <ul>
${opseuFooterLinks}
        </ul>
      </div>
`
    : "";
  const privacyLink =
    data.includePrivacyPage !== false
      ? ` · <a href="./privacy.html">${escapeHtml(strings.privacy)}</a>`
      : "";
  const qrNote =
    data.includeSiteQr && data.websiteUrl?.trim()
      ? `      <p class="site-qr"><img src="./assets/site-qr.png" alt="" width="120" height="120"></p>`
      : "";

  return `  <footer class="footer">
    <div class="footer-container">
      <div class="footer-col">
        <h3>${escapeHtml(strings.unionOffice)}</h3>
${officeAddressHtml}
        <h3>${escapeHtml(strings.contact)}</h3>
        <ul>
${websiteBlock}
${facebookBlock}
${customLinkItems}
          <li><a href="mailto:${escapeHtml(data.contactEmail)}">${escapeHtml(data.contactEmail)}</a></li>
        </ul>
${qrNote}
      </div>
${membershipColumn}${opseuResourcesHtml}      <div class="footer-col">
        <h3>${escapeHtml(strings.rightsPartners)}</h3>
        <ul>
${ontarioFooterLinks}
${federationFooterLinks}
        </ul>
      </div>
    </div>
    <p class="copyright">&copy; ${new Date().getFullYear()} ${escapeHtml(data.unionName)}${privacyLink}</p>
  </footer>`;
}

function sectionRenderers(
  data: WebsiteTemplateData,
  strings: WebsiteSiteStrings,
  layout: WebsiteLayoutDefinition,
  parts: ReturnType<typeof partitionWebsiteOfficers>,
): Record<WebsiteSectionId, () => string> {
  return {
    hero: () => renderHero(data, strings, layout),
    about: () => renderAbout(data, strings),
    leadership: () =>
      renderPeopleSection({
        id: "leadership",
        title: strings.executiveTitle,
        intro: strings.executiveIntro,
        officers: parts.executive,
        layout,
        band: layout.leadershipStyle !== "editorial-list",
      }),
    stewards: () =>
      renderPeopleSection({
        id: "stewards",
        title: strings.stewardsTitle,
        intro: strings.stewardsIntro,
        officers: parts.stewards,
        layout,
        band: false,
      }),
    committees: () =>
      renderPeopleSection({
        id: "committees",
        title: strings.committeesTitle,
        intro: "",
        officers: parts.committees,
        layout,
        band: layout.id === "hall",
      }),
    resources: () => renderResources(data, strings),
    events: () => renderEvents(data, strings),
    contact: () => renderContact(data, strings),
  };
}

function documentShell(options: {
  data: WebsiteTemplateData;
  strings: WebsiteSiteStrings;
  layout: WebsiteLayoutDefinition;
  title: string;
  description: string;
  canonicalPath: string;
  bodyInner: string;
  mainId?: string;
}): string {
  const { data, strings, layout, title, description, canonicalPath, bodyInner } =
    options;
  const mainId = options.mainId ?? "content";
  const lang = strings.locale === "fr" ? "fr" : "en";
  const siteBase =
    data.websiteUrl?.trim() && isWebsiteHttpUrl(data.websiteUrl)
      ? data.websiteUrl.endsWith("/")
        ? data.websiteUrl
        : `${data.websiteUrl}/`
      : "";
  const canonical = siteBase
    ? new URL(canonicalPath.replace(/^\.\//, ""), siteBase).href
    : "";
  // Social crawlers need an absolute og:image; omit when we have no site URL.
  const relativeOgAsset = data.logoFileName.trim()
    ? `assets/${data.logoFileName}`
    : data.heroImageFileName
      ? `assets/${data.heroImageFileName}`
      : "";
  const ogImage =
    siteBase && relativeOgAsset
      ? new URL(relativeOgAsset, siteBase).href
      : "";
  const accent = data.accentColor?.trim() || data.secondaryColor;

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="theme-color" content="${escapeHtml(data.primaryColor)}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:site_name" content="${escapeHtml(strings.openGraphSiteName)}">
  ${canonical ? `<meta property="og:url" content="${escapeHtml(canonical)}">\n  <link rel="canonical" href="${escapeHtml(canonical)}">` : ""}
  ${ogImage ? `<meta property="og:image" content="${escapeHtml(ogImage)}">` : ""}
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <link rel="stylesheet" href="./css/style.css">
</head>
<body class="${layout.bodyClass}" style="--color-accent: ${escapeHtml(accent)}">
  <a class="skip-link" href="#${mainId}">${escapeHtml(strings.skipToContent)}</a>
${bodyInner}
  <script src="./js/site.js"></script>
</body>
</html>`;
}

function buildIndexBody(
  data: WebsiteTemplateData,
  strings: WebsiteSiteStrings,
  layout: WebsiteLayoutDefinition,
): string {
  const parts = partitionWebsiteOfficers(data.officers);
  const renderers = sectionRenderers(data, strings, layout, parts);
  const sections = layout.homeSections
    .map((id) => renderers[id]())
    .filter((html) => html.trim())
    .join("\n\n");
  return `${renderHeader(data, strings, layout, parts)}

  <main id="content">
${sections}
  </main>

${renderFooter(data, strings)}`;
}

function buildPrivacyPage(
  data: WebsiteTemplateData,
  strings: WebsiteSiteStrings,
  layout: WebsiteLayoutDefinition,
): string {
  const body = `  <main id="content" class="privacy-page info-section">
    <div class="text-wrapper">
      <h1>${escapeHtml(strings.privacyTitle)}</h1>
      <p>${escapeHtml(strings.privacyBody)}</p>
      <p><a href="./index.html">${escapeHtml(strings.privacyBack)}</a></p>
    </div>
  </main>`;
  return documentShell({
    data,
    strings,
    layout,
    title: `${strings.privacyTitle} — ${data.unionName}`,
    description: strings.privacyBody.slice(0, 160),
    canonicalPath: "./privacy.html",
    bodyInner: body,
  });
}

/**
 * Render all static pages for preview / ZIP / WordPress body extraction.
 */
export function renderWebsiteSite(
  data: WebsiteTemplateData,
): WebsiteRenderResult {
  const layout = getWebsiteLayout(data.layoutId);
  const strings = resolveWebsiteSiteStrings(data.siteLocale);
  const indexHtml = documentShell({
    data,
    strings,
    layout,
    title: data.unionName,
    description: data.heroText || data.unionName,
    canonicalPath: "./",
    bodyInner: buildIndexBody(data, strings, layout),
  });
  const pages: WebsiteRenderedPage[] = [
    { path: "index.html", html: indexHtml },
  ];
  if (data.includePrivacyPage !== false) {
    pages.push({
      path: "privacy.html",
      html: buildPrivacyPage(data, strings, layout),
    });
  }
  return { pages, layout, strings };
}

/** Primary homepage HTML (index). */
export function buildWebsiteHtml(data: WebsiteTemplateData): string {
  return renderWebsiteSite(data).pages[0]!.html;
}
