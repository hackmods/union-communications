/**
 * Classic WordPress theme PHP builders — data-driven from unionops-website.json.
 * Content lives in a WP option; Appearance → Local site edits or JSON import
 * update the front page without baking HTML into index.php.
 */
import type { WebsiteTemplateData } from "@/types/website-template";
import {
  getOpseuWebsiteFooterSources,
  getWebsiteRightsPartnersFederationSources,
  getWebsiteRightsPartnersOntarioSources,
} from "@/lib/constants/comms-sources";
import { WEBSITE_CONFIG_FILE } from "@/lib/templates/website/website-config";

export function phpFunctionPrefix(slug: string): string {
  return slug.replace(/-/g, "_");
}

export function escapePhpSingleQuoted(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function phpString(value: string): string {
  return `'${escapePhpSingleQuoted(value)}'`;
}

function linkRowsPhp(
  links: ReadonlyArray<{ label: string; url: string }>,
): string {
  if (!links.length) return "array()";
  const rows = links
    .map(
      (l) =>
        `    array('label' => ${phpString(l.label)}, 'url' => ${phpString(l.url)}),`,
    )
    .join("\n");
  return `array(\n${rows}\n  )`;
}

export type WordpressThemeMeta = {
  slug: string;
  fn: string;
  themeName: string;
  version: string;
  includeOpseuResources: boolean;
};

export function wordpressThemeVersion(exportedAt?: string): string {
  const raw = (exportedAt || new Date().toISOString())
    .slice(0, 10)
    .replace(/-/g, "");
  return raw ? `1.2.${raw}` : "1.2.0";
}

export function buildWordpressConfigPhp(meta: WordpressThemeMeta): string {
  const { fn } = meta;
  const opt = `${fn.toUpperCase()}_OPTION`;
  const cfg = `${fn.toUpperCase()}_CONFIG_FILE`;
  return `<?php
if (!defined('ABSPATH')) {
  exit;
}

define('${opt}', 'unionops_website_config');
define('${cfg}', '${WEBSITE_CONFIG_FILE}');

function ${fn}_empty_data() {
  return array(
    'localNumber' => '',
    'unionName' => '',
    'heroText' => '',
    'about1' => '',
    'about2' => '',
    'contactEmail' => '',
    'facebookUrl' => '',
    'officeAddress' => '',
    'officers' => array(),
    'customLinks' => array(),
    'membershipLinks' => array(),
    'primaryColor' => '#003DA5',
    'secondaryColor' => '#FFFFFF',
    'logoFileName' => '',
    'logoAlt' => '',
    'includeOpseuResources' => false,
    'heroArtId' => 'none',
    'heroImageFileName' => '',
    'heroImageAlt' => '',
  );
}

function ${fn}_normalize_data($data) {
  if (!is_array($data)) {
    return ${fn}_empty_data();
  }
  $base = ${fn}_empty_data();
  foreach ($base as $key => $default) {
    if (!array_key_exists($key, $data)) {
      continue;
    }
    $value = $data[$key];
    if (is_string($default)) {
      $base[$key] = is_string($value) ? $value : $default;
    } elseif (is_bool($default)) {
      $base[$key] = (bool) $value;
    } elseif (is_array($default)) {
      $base[$key] = is_array($value) ? $value : $default;
    }
  }
  if (isset($data['canvas']) && is_array($data['canvas'])) {
    $base['canvas'] = $data['canvas'];
  }
  return $base;
}

function ${fn}_read_bundled_envelope() {
  $path = get_template_directory() . '/' . ${cfg};
  if (!is_readable($path)) {
    return null;
  }
  $raw = file_get_contents($path);
  if ($raw === false || $raw === '') {
    return null;
  }
  $decoded = json_decode($raw, true);
  if (!is_array($decoded) || empty($decoded['data']) || !is_array($decoded['data'])) {
    return null;
  }
  if (!isset($decoded['kind']) || $decoded['kind'] !== 'unionops-website') {
    return null;
  }
  return $decoded;
}

function ${fn}_seed_config_from_file() {
  $envelope = ${fn}_read_bundled_envelope();
  if (!$envelope) {
    $envelope = array(
      'kind' => 'unionops-website',
      'version' => 1,
      'exportedAt' => gmdate('c'),
      'data' => ${fn}_empty_data(),
    );
  }
  $envelope['data'] = ${fn}_normalize_data($envelope['data']);
  update_option(${opt}, $envelope, false);
  return $envelope;
}

function ${fn}_get_envelope() {
  $stored = get_option(${opt});
  if (is_array($stored) && !empty($stored['data']) && is_array($stored['data'])) {
    $stored['data'] = ${fn}_normalize_data($stored['data']);
    return $stored;
  }
  return ${fn}_seed_config_from_file();
}

function ${fn}_get_data() {
  $envelope = ${fn}_get_envelope();
  return $envelope['data'];
}

function ${fn}_save_data($data) {
  $envelope = ${fn}_get_envelope();
  $envelope['data'] = ${fn}_normalize_data($data);
  $envelope['exportedAt'] = gmdate('c');
  $envelope['kind'] = 'unionops-website';
  $envelope['version'] = 1;
  update_option(${opt}, $envelope, false);
  return $envelope;
}

function ${fn}_import_json_string($raw) {
  $decoded = json_decode($raw, true);
  if (!is_array($decoded) || empty($decoded['data']) || !is_array($decoded['data'])) {
    return new WP_Error('unionops_invalid', 'That file is not a UnionOps site file.');
  }
  if (!isset($decoded['kind']) || $decoded['kind'] !== 'unionops-website') {
    return new WP_Error('unionops_kind', 'That file is not a UnionOps site file.');
  }
  $decoded['data'] = ${fn}_normalize_data($decoded['data']);
  update_option(${opt}, $decoded, false);
  return $decoded;
}

function ${fn}_after_switch_theme() {
  ${fn}_seed_config_from_file();
}
add_action('after_switch_theme', '${fn}_after_switch_theme');
`;
}

export function buildWordpressRenderPhp(meta: WordpressThemeMeta): string {
  const { fn } = meta;
  const opseu = getOpseuWebsiteFooterSources().map((s) => ({
    label: s.label,
    url: s.url,
  }));
  const fed = getWebsiteRightsPartnersFederationSources().map((s) => ({
    label: s.label,
    url: s.url,
  }));
  const ont = getWebsiteRightsPartnersOntarioSources().map((s) => ({
    label: s.label,
    url: s.url,
  }));

  return `<?php
if (!defined('ABSPATH')) {
  exit;
}

function ${fn}_esc($value) {
  return esc_html(is_string($value) ? $value : '');
}

function ${fn}_asset_url($file) {
  $file = ltrim((string) $file, '/');
  if ($file === '' || strpos($file, '..') !== false) {
    return '';
  }
  return esc_url(get_template_directory_uri() . '/assets/' . $file);
}

function ${fn}_is_http_url($url) {
  if (!is_string($url) || $url === '') {
    return false;
  }
  if (stripos($url, 'javascript:') === 0 || stripos($url, 'data:') === 0) {
    return false;
  }
  return (bool) preg_match('#^https?://#i', $url);
}

function ${fn}_render_external_items($links) {
  if (!is_array($links)) {
    return '';
  }
  $html = '';
  foreach ($links as $link) {
    if (!is_array($link)) {
      continue;
    }
    $label = isset($link['label']) ? trim((string) $link['label']) : '';
    $url = isset($link['url']) ? trim((string) $link['url']) : '';
    if ($label === '' || !${fn}_is_http_url($url)) {
      continue;
    }
    $html .= '<li><a href="' . esc_url($url) . '" target="_blank" rel="noopener noreferrer">' . ${fn}_esc($label) . '</a></li>';
  }
  return $html;
}

function ${fn}_static_partner_links() {
  static $links = null;
  if ($links !== null) {
    return $links;
  }
  $links = array(
    'opseu' => ${linkRowsPhp(opseu)},
    'federation' => ${linkRowsPhp(fed)},
    'ontario' => ${linkRowsPhp(ont)},
  );
  return $links;
}

function ${fn}_render_header() {
  $data = ${fn}_get_data();
  $logo = isset($data['logoFileName']) ? trim((string) $data['logoFileName']) : '';
  $union = isset($data['unionName']) ? (string) $data['unionName'] : '';
  $alt = isset($data['logoAlt']) ? (string) $data['logoAlt'] : $union;
  echo '<header class="site-header"><nav class="nav-bar"><div class="header-brand">';
  if ($logo !== '') {
    $src = ${fn}_asset_url($logo);
    if ($src !== '') {
      echo '<img src="' . $src . '" alt="' . ${fn}_esc($alt) . '" class="header-logo">';
    } else {
      echo '<span class="header-brand-text">' . ${fn}_esc($union) . '</span>';
    }
  } else {
    echo '<span class="header-brand-text">' . ${fn}_esc($union) . '</span>';
  }
  echo '</div>';
  echo '<button type="button" class="hamburger" aria-label="Toggle menu" onclick="toggleMenu()"><span></span><span></span><span></span></button>';
  wp_nav_menu(array(
    'theme_location' => 'primary',
    'container' => false,
    'menu_class' => 'nav-links',
    'fallback_cb' => '${fn}_nav_fallback',
    'depth' => 1,
  ));
  echo '</nav></header>';
}

function ${fn}_render_hero() {
  $data = ${fn}_get_data();
  $union = isset($data['unionName']) ? (string) $data['unionName'] : '';
  $hero = isset($data['heroText']) ? (string) $data['heroText'] : '';
  $photo = isset($data['heroImageFileName']) ? trim((string) $data['heroImageFileName']) : '';
  $photoAlt = isset($data['heroImageAlt']) ? (string) $data['heroImageAlt'] : '';
  $artId = isset($data['heroArtId']) ? trim((string) $data['heroArtId']) : 'none';
  $class = 'hero-section';
  $artHtml = '';
  if ($photo !== '') {
    $src = ${fn}_asset_url($photo);
    if ($src !== '') {
      $class .= ' has-art has-photo-art';
      $artHtml = '<img class="hero-art hero-art--photo" src="' . $src . '" alt="' . ${fn}_esc($photoAlt) . '"><div class="hero-overlay" aria-hidden="true"></div>';
    }
  } elseif (in_array($artId, array('arc', 'mesh', 'bloom'), true)) {
    $src = ${fn}_asset_url($artId . '.svg');
    if ($src !== '') {
      $class .= ' has-art has-pattern-art';
      $artHtml = '<img class="hero-art hero-art--pattern" src="' . $src . '" alt=""><div class="hero-overlay" aria-hidden="true"></div>';
    }
  }
  echo '<section id="home" class="' . esc_attr($class) . '">';
  echo $artHtml;
  echo '<div class="hero-inner"><h1>' . ${fn}_esc($union) . '</h1><div class="text-wrapper">';
  echo '<p class="hero-text">' . ${fn}_esc($hero) . '</p>';
  echo '<a href="#contact" class="cta-button">Get In Touch</a>';
  echo '</div></div></section>';
}

function ${fn}_render_about() {
  $data = ${fn}_get_data();
  $local = isset($data['localNumber']) ? (string) $data['localNumber'] : '';
  $about1 = isset($data['about1']) ? trim((string) $data['about1']) : '';
  $about2 = isset($data['about2']) ? trim((string) $data['about2']) : '';
  echo '<section id="about" class="info-section"><div class="text-wrapper">';
  echo '<h2>About Local ' . ${fn}_esc($local) . '</h2>';
  if ($about1 !== '') {
    echo '<p class="mb-5 text-left">' . ${fn}_esc($about1) . '</p>';
  }
  if ($about2 !== '') {
    echo '<p class="mb-5 text-left">' . ${fn}_esc($about2) . '</p>';
  }
  echo '</div></section>';
}

function ${fn}_render_officers() {
  $data = ${fn}_get_data();
  $officers = isset($data['officers']) && is_array($data['officers']) ? $data['officers'] : array();
  echo '<section id="leadership" class="support-section"><div class="text-wrapper text-center">';
  echo '<h2>Your Executive Committee</h2>';
  echo '<p class="section-intro">Contact your officers for support, questions about your Collective Agreement, or to get more involved.</p>';
  echo '</div><div class="text-wrapper"><div class="officer-grid">';
  foreach ($officers as $officer) {
    if (!is_array($officer)) {
      continue;
    }
    $name = isset($officer['name']) ? trim((string) $officer['name']) : '';
    if ($name === '') {
      continue;
    }
    $role = isset($officer['role']) ? (string) $officer['role'] : '';
    $location = isset($officer['location']) ? trim((string) $officer['location']) : '';
    echo '<div class="officer-card"><h4>' . ${fn}_esc($name) . '</h4>';
    echo '<p>' . ${fn}_esc($role) . '</p>';
    if ($location !== '') {
      echo '<p class="location">' . ${fn}_esc($location) . '</p>';
    }
    echo '</div>';
  }
  echo '</div></div></section>';
}

function ${fn}_render_contact() {
  $data = ${fn}_get_data();
  $union = isset($data['unionName']) ? (string) $data['unionName'] : '';
  $email = isset($data['contactEmail']) ? trim((string) $data['contactEmail']) : '';
  $address = isset($data['officeAddress']) ? trim((string) $data['officeAddress']) : '';
  $membership = ${fn}_render_external_items(isset($data['membershipLinks']) ? $data['membershipLinks'] : array());
  echo '<section id="contact" class="contact-section">';
  echo '<h2>Contact ' . ${fn}_esc($union) . '</h2>';
  echo '<div class="text-wrapper text-center">';
  echo '<p>For general inquiries, membership questions, or media requests:</p>';
  if ($email !== '') {
    echo '<p class="contact-email"><a href="mailto:' . esc_attr($email) . '">' . ${fn}_esc($email) . '</a></p>';
  }
  if ($membership !== '') {
    echo '<p>To apply or update your membership:</p><ul class="contact-links">' . $membership . '</ul>';
  }
  if ($address !== '') {
    echo '<p class="office-address">' . ${fn}_esc($address) . '</p>';
  }
  echo '</div></section>';
}

function ${fn}_render_footer() {
  $data = ${fn}_get_data();
  $union = isset($data['unionName']) ? (string) $data['unionName'] : '';
  $email = isset($data['contactEmail']) ? trim((string) $data['contactEmail']) : '';
  $address = isset($data['officeAddress']) ? (string) $data['officeAddress'] : '';
  $facebook = isset($data['facebookUrl']) ? trim((string) $data['facebookUrl']) : '';
  $includeOpseu = !empty($data['includeOpseuResources']);
  $partners = ${fn}_static_partner_links();
  echo '<footer class="footer"><div class="footer-container"><div class="footer-col"><h3>Union Office</h3>';
  $lines = array_values(array_filter(array_map('trim', preg_split('/\\r\\n|\\r|\\n/', $address) ?: array())));
  if (!empty($lines)) {
    echo '<ul class="office-address-list"><li><strong>' . ${fn}_esc($union) . '</strong></li>';
    foreach ($lines as $line) {
      echo '<li>' . ${fn}_esc($line) . '</li>';
    }
    echo '</ul>';
  }
  echo '<h3>Contact</h3><ul>';
  if (${fn}_is_http_url($facebook)) {
    echo '<li><a href="' . esc_url($facebook) . '" target="_blank" rel="noopener noreferrer">Facebook group</a></li>';
  }
  echo ${fn}_render_external_items(isset($data['customLinks']) ? $data['customLinks'] : array());
  if ($email !== '') {
    echo '<li><a href="mailto:' . esc_attr($email) . '">' . ${fn}_esc($email) . '</a></li>';
  }
  echo '</ul></div>';
  $membership = ${fn}_render_external_items(isset($data['membershipLinks']) ? $data['membershipLinks'] : array());
  if ($membership !== '') {
    echo '<div class="footer-col"><h3>Membership</h3><ul>' . $membership . '</ul></div>';
  }
  if ($includeOpseu) {
    echo '<div class="footer-col"><h3>Union Resources</h3><ul>' . ${fn}_render_external_items($partners['opseu']) . '</ul></div>';
  }
  echo '<div class="footer-col"><h3>Rights &amp; Partners</h3><ul>';
  echo ${fn}_render_external_items($partners['ontario']);
  echo ${fn}_render_external_items($partners['federation']);
  echo '</ul></div></div>';
  echo '<p class="copyright">&copy; ' . esc_html(gmdate('Y')) . ' ' . ${fn}_esc($union) . '</p></footer>';
}

function ${fn}_render_front_page() {
  echo '<main id="content" class="site-content">';
  ${fn}_render_hero();
  ${fn}_render_about();
  ${fn}_render_officers();
  ${fn}_render_contact();
  echo '</main>';
}
`;
}

export function buildWordpressAdminPhp(meta: WordpressThemeMeta): string {
  const { fn } = meta;
  return `<?php
if (!defined('ABSPATH')) {
  exit;
}

function ${fn}_admin_menu() {
  add_theme_page(
    'Local site',
    'Local site',
    'edit_theme_options',
    'unionops-local-site',
    '${fn}_admin_page'
  );
}
add_action('admin_menu', '${fn}_admin_menu');

function ${fn}_admin_notice_saved() {
  if (!isset($_GET['page']) || $_GET['page'] !== 'unionops-local-site') {
    return;
  }
  if (!isset($_GET['updated']) || $_GET['updated'] !== '1') {
    return;
  }
  echo '<div class="notice notice-success is-dismissible"><p>Local site saved. View the front page to confirm.</p></div>';
}
add_action('admin_notices', '${fn}_admin_notice_saved');

function ${fn}_handle_admin_post() {
  if (!current_user_can('edit_theme_options')) {
    wp_die('You cannot edit this theme.');
  }
  check_admin_referer('unionops_local_site');

  if (!empty($_FILES['unionops_import']['tmp_name'])) {
    $raw = file_get_contents($_FILES['unionops_import']['tmp_name']);
    $result = ${fn}_import_json_string(is_string($raw) ? $raw : '');
    if (is_wp_error($result)) {
      wp_die($result->get_error_message());
    }
    wp_safe_redirect(add_query_arg(array('page' => 'unionops-local-site', 'updated' => '1'), admin_url('themes.php')));
    exit;
  }

  $data = ${fn}_get_data();
  $fields = array('localNumber', 'unionName', 'heroText', 'about1', 'about2', 'contactEmail', 'facebookUrl', 'officeAddress', 'logoAlt', 'heroImageAlt', 'heroArtId');
  foreach ($fields as $field) {
    if (isset($_POST[$field]) && is_string($_POST[$field])) {
      $data[$field] = wp_unslash($_POST[$field]);
    }
  }
  if (isset($_POST['primaryColor']) && is_string($_POST['primaryColor'])) {
    $color = sanitize_hex_color(wp_unslash($_POST['primaryColor']));
    if ($color) {
      $data['primaryColor'] = $color;
    }
  }
  if (isset($_POST['secondaryColor']) && is_string($_POST['secondaryColor'])) {
    $color = sanitize_hex_color(wp_unslash($_POST['secondaryColor']));
    if ($color) {
      $data['secondaryColor'] = $color;
    }
  }
  $data['includeOpseuResources'] = !empty($_POST['includeOpseuResources']);

  $officers = array();
  if (isset($_POST['officer_name']) && is_array($_POST['officer_name'])) {
    $names = wp_unslash($_POST['officer_name']);
    $roles = isset($_POST['officer_role']) && is_array($_POST['officer_role']) ? wp_unslash($_POST['officer_role']) : array();
    $locations = isset($_POST['officer_location']) && is_array($_POST['officer_location']) ? wp_unslash($_POST['officer_location']) : array();
    $count = count($names);
    for ($i = 0; $i < $count; $i++) {
      $name = isset($names[$i]) ? trim((string) $names[$i]) : '';
      $role = isset($roles[$i]) ? trim((string) $roles[$i]) : '';
      $location = isset($locations[$i]) ? trim((string) $locations[$i]) : '';
      if ($name === '' && $role === '' && $location === '') {
        continue;
      }
      $officers[] = array('name' => $name, 'role' => $role, 'location' => $location);
    }
  }
  $data['officers'] = $officers;
  ${fn}_save_data($data);
  wp_safe_redirect(add_query_arg(array('page' => 'unionops-local-site', 'updated' => '1'), admin_url('themes.php')));
  exit;
}
add_action('admin_post_unionops_local_site_save', '${fn}_handle_admin_post');

function ${fn}_admin_page() {
  if (!current_user_can('edit_theme_options')) {
    return;
  }
  $data = ${fn}_get_data();
  $officers = isset($data['officers']) && is_array($data['officers']) ? $data['officers'] : array();
  if (count($officers) < 1) {
    $officers[] = array('name' => '', 'role' => '', 'location' => '');
  }
  $action = esc_url(admin_url('admin-post.php'));
  echo '<div class="wrap"><h1>Local site</h1>';
  echo '<p>Edit the homepage copy stored in WordPress, or import a <code>unionops-website.json</code> site file from UnionOps. Theme CSS and assets still come from the theme folder — re-upload the theme ZIP only when you change logo, hero photo, or fonts.</p>';
  echo '<form method="post" action="' . $action . '" enctype="multipart/form-data">';
  echo '<input type="hidden" name="action" value="unionops_local_site_save" />';
  wp_nonce_field('unionops_local_site');
  echo '<h2>Import site file</h2><p><input type="file" name="unionops_import" accept=".json,application/json" /> <button type="submit" class="button">Import JSON</button></p>';
  echo '<h2>Homepage copy</h2><table class="form-table" role="presentation">';
  $text_fields = array(
    'unionName' => 'Union / local name',
    'localNumber' => 'Local number',
    'heroText' => 'Hero tagline',
    'about1' => 'About paragraph 1',
    'about2' => 'About paragraph 2',
    'contactEmail' => 'Contact email',
    'facebookUrl' => 'Facebook group URL',
    'officeAddress' => 'Office address',
    'logoAlt' => 'Logo alt text',
    'heroArtId' => 'Hero art id (none, arc, mesh, bloom)',
    'heroImageAlt' => 'Hero photo alt text',
    'primaryColor' => 'Primary colour',
    'secondaryColor' => 'Secondary colour',
  );
  foreach ($text_fields as $key => $label) {
    $value = isset($data[$key]) ? (string) $data[$key] : '';
    $tag = in_array($key, array('about1', 'about2', 'officeAddress', 'heroText'), true) ? 'textarea' : 'input';
    echo '<tr><th scope="row"><label for="' . esc_attr($key) . '">' . esc_html($label) . '</label></th><td>';
    if ($tag === 'textarea') {
      echo '<textarea class="large-text" rows="4" name="' . esc_attr($key) . '" id="' . esc_attr($key) . '">' . esc_textarea($value) . '</textarea>';
    } else {
      echo '<input class="regular-text" type="text" name="' . esc_attr($key) . '" id="' . esc_attr($key) . '" value="' . esc_attr($value) . '" />';
    }
    echo '</td></tr>';
  }
  echo '<tr><th scope="row">Union resources footer</th><td><label><input type="checkbox" name="includeOpseuResources" value="1"' . (!empty($data['includeOpseuResources']) ? ' checked' : '') . ' /> Show national union resource links</label></td></tr>';
  echo '</table>';
  echo '<h2>Officers</h2>';
  foreach ($officers as $officer) {
    $name = isset($officer['name']) ? (string) $officer['name'] : '';
    $role = isset($officer['role']) ? (string) $officer['role'] : '';
    $location = isset($officer['location']) ? (string) $officer['location'] : '';
    echo '<p><input type="text" name="officer_name[]" placeholder="Name" value="' . esc_attr($name) . '" /> ';
    echo '<input type="text" name="officer_role[]" placeholder="Role" value="' . esc_attr($role) . '" /> ';
    echo '<input type="text" name="officer_location[]" placeholder="Location" value="' . esc_attr($location) . '" /></p>';
  }
  echo '<p><input type="text" name="officer_name[]" placeholder="Name" value="" /> <input type="text" name="officer_role[]" placeholder="Role" value="" /> <input type="text" name="officer_location[]" placeholder="Location" value="" /> <span class="description">Add another row</span></p>';
  submit_button('Save local site');
  echo '</form></div>';
}
`;
}

export function buildWordpressCustomizerPhp(meta: WordpressThemeMeta): string {
  const { fn } = meta;
  return `<?php
if (!defined('ABSPATH')) {
  exit;
}

function ${fn}_customize_register($wp_customize) {
  $wp_customize->add_section('unionops_local_site', array(
    'title' => 'Local site',
    'priority' => 30,
  ));
  $fields = array(
    'unionName' => 'Union / local name',
    'heroText' => 'Hero tagline',
    'about1' => 'About paragraph 1',
    'contactEmail' => 'Contact email',
  );
  foreach ($fields as $id => $label) {
    $wp_customize->add_setting('unionops_' . $id, array(
      'type' => 'option',
      'capability' => 'edit_theme_options',
      'transport' => 'refresh',
      'default' => '',
    ));
    $wp_customize->add_control('unionops_' . $id, array(
      'label' => $label,
      'section' => 'unionops_local_site',
      'type' => $id === 'about1' ? 'textarea' : 'text',
    ));
  }
}
add_action('customize_register', '${fn}_customize_register');

function ${fn}_customize_save() {
  $data = ${fn}_get_data();
  foreach (array('unionName', 'heroText', 'about1', 'contactEmail') as $key) {
    $val = get_option('unionops_' . $key, null);
    if (is_string($val)) {
      $data[$key] = $val;
    }
  }
  ${fn}_save_data($data);
}
add_action('customize_save_after', '${fn}_customize_save');

function ${fn}_sync_customizer_defaults() {
  $data = ${fn}_get_data();
  foreach (array('unionName', 'heroText', 'about1', 'contactEmail') as $key) {
    if (!get_option('unionops_' . $key)) {
      update_option('unionops_' . $key, isset($data[$key]) ? (string) $data[$key] : '', false);
    }
  }
}
add_action('after_switch_theme', '${fn}_sync_customizer_defaults');
`;
}

/** Keep WebsiteTemplateData import used for typing consumers. */
export type WordpressExportData = WebsiteTemplateData;
