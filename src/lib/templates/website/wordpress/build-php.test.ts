import { describe, expect, it } from "vitest";
import {
  buildWordpressAdminPhp,
  buildWordpressConfigPhp,
  buildWordpressCustomizerPhp,
  buildWordpressRenderPhp,
  escapePhpSingleQuoted,
  phpFunctionPrefix,
  wordpressThemeVersion,
} from "@/lib/templates/website/wordpress/build-php";

const meta = {
  slug: "unionops-local-243",
  fn: "unionops_local_243",
  themeName: "Local 243",
  version: "1.2.20260926",
  includeOpseuResources: true,
};

describe("wordpress PHP builders", () => {
  it("builds a PHP-safe function prefix and escapes single-quoted strings", () => {
    expect(phpFunctionPrefix("unionops-local-243-ft")).toBe(
      "unionops_local_243_ft",
    );
    expect(escapePhpSingleQuoted("O'Brien \\ test")).toBe("O\\'Brien \\\\ test");
  });

  it("versions the theme from the export date and falls back", () => {
    expect(wordpressThemeVersion("2026-09-26T12:00:00.000Z")).toBe(
      "1.2.20260926",
    );
    expect(wordpressThemeVersion("")).toMatch(/^1\.2\.\d{8}$/);
  });

  it("rejects path traversal and non-http hrefs in generated render helpers", () => {
    const php = buildWordpressRenderPhp(meta);
    expect(php).toContain("strpos($file, '..') !== false");
    expect(php).toContain("stripos($url, 'javascript:') === 0");
    expect(php).toContain("stripos($url, 'data:') === 0");
    expect(php).toContain("preg_match('#^https?://#i', $url)");
    expect(php).toContain("array('arc', 'mesh', 'bloom')");
    expect(php).toContain("esc_html");
    expect(php).toContain("esc_url");
  });

  it("rejects non-UnionOps JSON on import and seeds only a typed envelope", () => {
    const php = buildWordpressConfigPhp(meta);
    expect(php).toContain("$decoded['kind'] !== 'unionops-website'");
    expect(php).toContain("WP_Error('unionops_invalid'");
    expect(php).toContain("WP_Error('unionops_kind'");
    expect(php).toContain(`${meta.fn}_normalize_data`);
    expect(php).toContain("if (!is_array($data))");
  });

  it("gates Local site writes behind capability, nonce, and hex sanitization", () => {
    const php = buildWordpressAdminPhp(meta);
    expect(php).toContain("current_user_can('edit_theme_options')");
    expect(php).toContain("check_admin_referer('unionops_local_site')");
    expect(php).toContain("wp_nonce_field('unionops_local_site')");
    expect(php).toContain("sanitize_hex_color");
    expect(php).toContain(`${meta.fn}_import_json_string`);
    expect(php).toContain("unionops_import");
  });

  it("limits Customizer writes to the homepage allowlist", () => {
    const php = buildWordpressCustomizerPhp(meta);
    expect(php).toContain("customize_save_after");
    expect(php).toContain("'capability' => 'edit_theme_options'");
    expect(php).toContain("array('unionName', 'heroText', 'about1', 'contactEmail')");
  });
});
