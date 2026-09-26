import type { WebsiteTemplateData } from "@/types/website-template";
import {
  addWebsiteMediaToZip,
  buildWebsiteCss,
  buildWebsiteJs,
  prepareWebsiteExportData,
  type WebsiteZipHeroImage,
  type WebsiteZipLogo,
} from "@/lib/templates/website/generate-website-zip";
import {
  WEBSITE_CONFIG_FILE,
  buildWebsiteConfigJson,
} from "@/lib/templates/website/website-config";
import { hexToRgb } from "@/lib/utils/contrast";
import {
  buildWordpressAdminPhp,
  buildWordpressConfigPhp,
  buildWordpressCustomizerPhp,
  buildWordpressRenderPhp,
  escapePhpSingleQuoted,
  phpFunctionPrefix,
  wordpressThemeVersion,
  type WordpressThemeMeta,
} from "@/lib/templates/website/wordpress/build-php";

function sanitizeThemeHeaderField(value: string): string {
  return value
    .replace(/\r?\n/g, " ")
    .replace(/\*\//g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Folder name + text domain: `unionops-local-{n}`. */
export function wordpressThemeSlug(localNumber: string): string {
  const slug = localNumber
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug ? `unionops-local-${slug}` : "unionops-local";
}

export function wordpressThemeName(
  unionName: string,
  localNumber: string,
): string {
  const cleaned = sanitizeThemeHeaderField(unionName);
  return cleaned || `Local ${localNumber.trim() || "site"}`;
}

export function themeMetaFromData(
  data: WebsiteTemplateData,
  exportedAt?: string,
): WordpressThemeMeta {
  const slug = wordpressThemeSlug(data.localNumber);
  return {
    slug,
    fn: phpFunctionPrefix(slug),
    themeName: wordpressThemeName(data.unionName, data.localNumber),
    version: wordpressThemeVersion(exportedAt),
    includeOpseuResources: data.includeOpseuResources,
  };
}

export function buildWordpressStyleCss(
  data: WebsiteTemplateData,
  version?: string,
): string {
  const name = wordpressThemeName(data.unionName, data.localNumber);
  const slug = wordpressThemeSlug(data.localNumber);
  const ver = version ?? wordpressThemeVersion();
  const description = sanitizeThemeHeaderField(
    `One-page local website theme for WordPress. Edit copy under Appearance → Local site, or import ${WEBSITE_CONFIG_FILE}. UnionOps does not host WordPress.`,
  );
  const css = buildWebsiteCss(
    data.primaryColor,
    data.secondaryColor,
    data.canvas,
    {
      fontUrlBase: "assets/fonts",
      flatFontFileNames: true,
    },
  );
  return `/*
Theme Name: ${name}
Theme URI: https://unionops.org/tools/website-template
Author: UnionOps
Author URI: https://unionops.org
Description: ${description}
Version: ${ver}
Requires at least: 6.0
Tested up to: 6.8
Requires PHP: 7.4
Text Domain: ${slug}
License: GNU General Public License v2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html
*/

${css}

.skip-link {
  position: absolute;
  left: -999px;
  top: 0.75rem;
  z-index: 100000;
  padding: 0.6rem 1rem;
  background: var(--color-secondary);
  color: var(--color-dark);
  font-weight: 700;
  text-decoration: none;
  border-radius: 4px;
}
.skip-link:focus {
  left: 0.75rem;
}
.site-content--entry {
  padding: var(--spacing-8) var(--spacing-4);
  max-width: 48rem;
  margin: 0 auto;
}
.entry h1 {
  margin-bottom: var(--spacing-4);
}
.entry-content img {
  max-width: 100%;
  height: auto;
}
.nav-links .sub-menu {
  display: none;
}
.admin-bar .site-header {
  top: 32px;
}
@media screen and (max-width: 782px) {
  .admin-bar .site-header {
    top: 46px;
  }
}
`;
}

export function buildWordpressFunctionsPhp(
  data: WebsiteTemplateData,
  version?: string,
): string {
  const meta = themeMetaFromData(data);
  const { fn, slug } = meta;
  const handle = escapePhpSingleQuoted(slug);
  const titleFallback = escapePhpSingleQuoted(
    wordpressThemeName(data.unionName, data.localNumber),
  );
  const ver = version ?? meta.version;
  return `<?php
if (!defined('ABSPATH')) {
  exit;
}

require get_template_directory() . '/inc/config.php';
require get_template_directory() . '/inc/render.php';
require get_template_directory() . '/inc/admin.php';
require get_template_directory() . '/inc/customizer.php';

function ${fn}_setup() {
  add_theme_support('title-tag');
  add_theme_support('html5', array('search-form', 'gallery', 'caption', 'style', 'script'));
  register_nav_menus(array(
    'primary' => __('Primary menu', '${slug}'),
  ));
  load_theme_textdomain('${slug}', get_template_directory() . '/languages');
}
add_action('after_setup_theme', '${fn}_setup');

function ${fn}_document_title($title) {
  if (is_front_page()) {
    $data = ${fn}_get_data();
    $name = isset($data['unionName']) ? trim((string) $data['unionName']) : '';
    return $name !== '' ? $name : '${titleFallback}';
  }
  return $title;
}
add_filter('pre_get_document_title', '${fn}_document_title');

function ${fn}_nav_fallback() {
  $home = esc_url(home_url('/'));
  echo '<ul class="nav-links">';
  echo '<li><a href="' . $home . '#home">Home</a></li>';
  echo '<li><a href="' . $home . '#about">About</a></li>';
  echo '<li><a href="' . $home . '#leadership">Officers</a></li>';
  echo '<li><a href="' . $home . '#contact">Contact</a></li>';
  echo '</ul>';
}

function ${fn}_enqueue() {
  $theme = wp_get_theme();
  $ver = $theme->get('Version');
  if (!is_string($ver) || $ver === '') {
    $ver = '${escapePhpSingleQuoted(ver)}';
  }
  wp_enqueue_style('${handle}', get_stylesheet_uri(), array(), $ver);
  wp_enqueue_script(
    '${handle}',
    get_template_directory_uri() . '/js/site.js',
    array(),
    $ver,
    true
  );
  $data = ${fn}_get_data();
  $primary = isset($data['primaryColor']) ? (string) $data['primaryColor'] : '';
  $secondary = isset($data['secondaryColor']) ? (string) $data['secondaryColor'] : '';
  if (preg_match('/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/', $primary) && preg_match('/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/', $secondary)) {
    $css = ':root{--color-primary:' . $primary . ';--color-secondary:' . $secondary . ';}';
    wp_add_inline_style('${handle}', $css);
  }
}
add_action('wp_enqueue_scripts', '${fn}_enqueue');

function ${fn}_dequeue_block_styles() {
  wp_dequeue_style('wp-block-library');
  wp_dequeue_style('wp-block-library-theme');
  wp_dequeue_style('global-styles');
  wp_dequeue_style('classic-theme-styles');
}
add_action('wp_enqueue_scripts', '${fn}_dequeue_block_styles', 100);
`;
}

export function buildWordpressHeaderPhp(meta: WordpressThemeMeta): string {
  const { fn } = meta;
  return `<?php
if (!defined('ABSPATH')) {
  exit;
}
?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
  <meta charset="<?php bloginfo('charset'); ?>">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<a class="skip-link" href="#content">Skip to content</a>
<?php ${fn}_render_header(); ?>
`;
}

export function buildWordpressFooterPhp(meta: WordpressThemeMeta): string {
  const { fn } = meta;
  return `<?php
if (!defined('ABSPATH')) {
  exit;
}
${fn}_render_footer();
wp_footer();
?>
</body>
</html>
`;
}

export function buildWordpressIndexPhp(meta: WordpressThemeMeta): string {
  const { fn } = meta;
  return `<?php
if (!defined('ABSPATH')) {
  exit;
}
get_header();
${fn}_render_front_page();
get_footer();
`;
}

export function buildWordpressFrontPagePhp(): string {
  return `<?php
if (!defined('ABSPATH')) {
  exit;
}
require get_template_directory() . '/index.php';
`;
}

export function buildWordpressPagePhp(): string {
  return `<?php
if (!defined('ABSPATH')) {
  exit;
}
get_header();
?>
<main id="content" class="site-content site-content--entry">
<?php
while (have_posts()) {
  the_post();
  ?>
  <article <?php post_class('entry'); ?>>
    <h1><?php the_title(); ?></h1>
    <div class="entry-content">
      <?php the_content(); ?>
    </div>
  </article>
  <?php
}
?>
</main>
<?php
get_footer();
`;
}

export function buildWordpress404Php(): string {
  return `<?php
if (!defined('ABSPATH')) {
  exit;
}
get_header();
?>
<main id="content" class="site-content site-content--entry">
  <h1>Page not found</h1>
  <p>That address is not on this site. Go back to the local homepage.</p>
  <p><a href="<?php echo esc_url(home_url('/')); ?>">Home</a></p>
</main>
<?php
get_footer();
`;
}

export function buildWordpressSearchPhp(): string {
  return `<?php
if (!defined('ABSPATH')) {
  exit;
}
get_header();
?>
<main id="content" class="site-content site-content--entry">
  <h1>Search results</h1>
<?php if (have_posts()) : ?>
  <ul>
  <?php while (have_posts()) : the_post(); ?>
    <li><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></li>
  <?php endwhile; ?>
  </ul>
<?php else : ?>
  <p>No results for that search. Try the homepage links instead.</p>
<?php endif; ?>
  <p><a href="<?php echo esc_url(home_url('/')); ?>">Home</a></p>
</main>
<?php
get_footer();
`;
}

export function buildWordpressThemeReadme(
  unionName: string,
  localNumber: string,
): string {
  const name = wordpressThemeName(unionName, localNumber);
  return `# ${name} — WordPress theme

Generated by UnionOps Website Template. Classic one-page theme with homepage copy stored in WordPress so you can update it without editing PHP.

## What UnionOps supports

- Download and upload this theme (Appearance → Themes → Upload)
- Edit homepage copy in **Appearance → Local site** (or Customizer → Local site)
- Import a fresh \`${WEBSITE_CONFIG_FILE}\` site file from UnionOps without re-uploading the whole theme
- Re-upload the theme ZIP when you change logo, hero photo, fonts, or layout CSS

UnionOps does **not** host WordPress, manage your plugins, or run security updates for your server. If you are starting from scratch and do not already run WordPress, the GitHub Pages site ZIP is usually simpler.

## Install

1. In WordPress: **Appearance → Themes → Add New → Upload Theme**
2. Upload this ZIP and activate the theme
3. Open **Appearance → Local site** — copy is seeded from \`${WEBSITE_CONFIG_FILE}\`
4. Set a static front page under **Settings → Reading** if WordPress is not already showing your front page

Do not submit this theme to wordpress.org. Contact stays a mailto: link; add a form plugin yourself if you need one.

## Extra pages

Add a page under **Pages**. It uses this theme’s inner layout.

To show it in the header: **Appearance → Menus**, create a menu, and assign **Primary menu**. If you skip that, the header keeps Home / About / Officers / Contact.

## Updating content

**In WordPress (usual path):** Appearance → Local site — edit fields and Save. Colours update live via CSS variables.

**From UnionOps:** Download the site file (or a new theme ZIP) at https://unionops.org/tools/website-template, then **Import JSON** on Appearance → Local site. Re-upload the full theme only when assets or CSS change.
`;
}

const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i]!;
    for (let b = 0; b < 8; b++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = new TextEncoder().encode(type);
  const out = new Uint8Array(8 + data.length + 4);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(typeBytes, 4);
  out.set(data, 8);
  const crcInput = out.subarray(4, 8 + data.length);
  view.setUint32(8 + data.length, crc32(crcInput));
  return out;
}

function adler32(bytes: Uint8Array): number {
  let a = 1;
  let b = 0;
  for (let i = 0; i < bytes.length; i++) {
    a = (a + bytes[i]!) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

function zlibStore(bytes: Uint8Array): Uint8Array {
  const blocks: Uint8Array[] = [];
  const max = 65535;
  for (let offset = 0; offset < bytes.length; offset += max) {
    const slice = bytes.subarray(offset, offset + max);
    const last = offset + max >= bytes.length;
    const block = new Uint8Array(5 + slice.length);
    block[0] = last ? 1 : 0;
    block[1] = slice.length & 0xff;
    block[2] = (slice.length >> 8) & 0xff;
    const nlen = ~slice.length & 0xffff;
    block[3] = nlen & 0xff;
    block[4] = (nlen >> 8) & 0xff;
    block.set(slice, 5);
    blocks.push(block);
  }
  let total = 2 + 4;
  for (const block of blocks) total += block.length;
  const out = new Uint8Array(total);
  out[0] = 0x78;
  out[1] = 0x01;
  let cursor = 2;
  for (const block of blocks) {
    out.set(block, cursor);
    cursor += block.length;
  }
  const view = new DataView(out.buffer);
  view.setUint32(cursor, adler32(bytes));
  return out;
}

function rgbFromHex(
  hex: string,
  fallback: [number, number, number],
): [number, number, number] {
  const rgb = hexToRgb(hex);
  if (!rgb) return fallback;
  return [rgb.r, rgb.g, rgb.b];
}

/** Compact branded tile for Appearance → Themes (not a full 1200×900 capture). */
export function encodeWordpressScreenshotPng(
  primaryColor: string,
  secondaryColor: string,
  width = 240,
  height = 180,
): Uint8Array {
  const top = rgbFromHex(primaryColor, [0, 61, 165]);
  const bottom = rgbFromHex(secondaryColor, [255, 255, 255]);
  const split = Math.floor(height * 0.7);
  const raw = new Uint8Array((width * 3 + 1) * height);
  let i = 0;
  for (let y = 0; y < height; y++) {
    const [r, g, b] = y < split ? top : bottom;
    raw[i++] = 0;
    for (let x = 0; x < width; x++) {
      raw[i++] = r;
      raw[i++] = g;
      raw[i++] = b;
    }
  }
  const ihdr = new Uint8Array(13);
  const ihdrView = new DataView(ihdr.buffer);
  ihdrView.setUint32(0, width);
  ihdrView.setUint32(4, height);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const idat = zlibStore(raw);
  const ihdrChunk = pngChunk("IHDR", ihdr);
  const idatChunk = pngChunk("IDAT", idat);
  const iendChunk = pngChunk("IEND", new Uint8Array(0));
  const out = new Uint8Array(
    PNG_SIGNATURE.length +
      ihdrChunk.length +
      idatChunk.length +
      iendChunk.length,
  );
  let o = 0;
  out.set(PNG_SIGNATURE, o);
  o += PNG_SIGNATURE.length;
  out.set(ihdrChunk, o);
  o += ihdrChunk.length;
  out.set(idatChunk, o);
  o += idatChunk.length;
  out.set(iendChunk, o);
  return out;
}

/** @deprecated Kept for unit tests that assert markup helpers; prefer data-driven render. */
export function extractWebsiteBodyMarkup(html: string): string {
  const match = /<body[^>]*>\s*([\s\S]*?)\s*<\/body>/i.exec(html);
  const inner = match?.[1] ?? html;
  return `${inner.replace(/\s*<script[\s\S]*?<\/script>/gi, "").trimEnd()}\n`;
}

/** @deprecated Prefer PHP renderers in the exported theme. */
export function splitWebsiteChrome(bodyHtml: string): {
  header: string;
  main: string;
  footer: string;
} {
  const headerMatch = /<header class="site-header"[\s\S]*?<\/header>/.exec(
    bodyHtml,
  );
  const footerMatch = /<footer class="footer"[\s\S]*?<\/footer>/.exec(bodyHtml);
  const header = headerMatch?.[0] ?? "";
  const footer = footerMatch?.[0] ?? "";
  let main = bodyHtml;
  if (header) main = main.replace(header, "");
  if (footer) main = main.replace(footer, "");
  return { header, main: main.trim(), footer };
}

const THEME_URI_PHP =
  "<?php echo esc_url( get_template_directory_uri() ); ?>/assets/";

/** @deprecated Prefer PHP asset helpers. */
export function rewriteWebsiteAssetsForWordpress(html: string): string {
  return html.replaceAll("./assets/", THEME_URI_PHP);
}

/** @deprecated Prefer PHP wp_nav_menu in render_header. */
export function injectWordpressNav(headerHtml: string, phpPrefix: string): string {
  const menu = `<?php
      wp_nav_menu(array(
        'theme_location' => 'primary',
        'container' => false,
        'menu_class' => 'nav-links',
        'fallback_cb' => '${phpPrefix}_nav_fallback',
        'depth' => 1,
      ));
    ?>`;
  if (/<ul class="nav-links">[\s\S]*?<\/ul>/.test(headerHtml)) {
    return headerHtml.replace(/<ul class="nav-links">[\s\S]*?<\/ul>/, menu);
  }
  return headerHtml;
}

export async function generateWordpressThemeZip(
  data: WebsiteTemplateData,
  logo?: WebsiteZipLogo | null,
  heroImage?: WebsiteZipHeroImage | null,
): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const exportData = prepareWebsiteExportData(data, logo, heroImage);
  const configJson = buildWebsiteConfigJson(exportData);
  const envelope = JSON.parse(configJson) as { exportedAt?: string };
  const meta = themeMetaFromData(exportData, envelope.exportedAt);
  const slug = meta.slug;
  const root = zip.folder(slug);
  if (!root) {
    throw new Error("Could not create the WordPress theme folder.");
  }

  const inc = root.folder("inc");
  if (!inc) {
    throw new Error("Could not create the WordPress theme inc folder.");
  }

  root.file("style.css", buildWordpressStyleCss(exportData, meta.version));
  root.file("functions.php", buildWordpressFunctionsPhp(exportData, meta.version));
  root.file("header.php", buildWordpressHeaderPhp(meta));
  root.file("footer.php", buildWordpressFooterPhp(meta));
  root.file("index.php", buildWordpressIndexPhp(meta));
  root.file("front-page.php", buildWordpressFrontPagePhp());
  root.file("page.php", buildWordpressPagePhp());
  root.file("404.php", buildWordpress404Php());
  root.file("search.php", buildWordpressSearchPhp());
  root.file("js/site.js", buildWebsiteJs());
  root.file(
    "screenshot.png",
    encodeWordpressScreenshotPng(data.primaryColor, data.secondaryColor),
  );
  root.file(
    "README.md",
    buildWordpressThemeReadme(data.unionName, data.localNumber),
  );
  root.file(WEBSITE_CONFIG_FILE, configJson);

  inc.file("config.php", buildWordpressConfigPhp(meta));
  inc.file("render.php", buildWordpressRenderPhp(meta));
  inc.file("admin.php", buildWordpressAdminPhp(meta));
  inc.file("customizer.php", buildWordpressCustomizerPhp(meta));

  await addWebsiteMediaToZip(root, exportData, logo, heroImage);

  return zip.generateAsync({ type: "blob" });
}
