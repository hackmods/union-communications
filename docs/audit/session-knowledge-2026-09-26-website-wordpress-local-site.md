# Session knowledge — Website Template WordPress Local site (2026-09-26)

## What changed

WordPress export is no longer a static HTML bake-in with “we do not support WordPress” framing. The theme ZIP is a **data-driven classic theme**:

| Piece | Role |
|-------|------|
| `inc/config.php` | Seeds / stores `unionops_website_config` from bundled `unionops-website.json` |
| `inc/render.php` | Front page + chrome from the option (escaped) |
| `inc/admin.php` | Appearance → Local site + JSON import |
| `inc/customizer.php` | Customizer → Local site for key fields |
| `functions.php` | Requires inc/*, enqueue, **inline CSS vars** for colours |

GitHub Pages ZIP stays the default. UnionOps still does **not** host WordPress.

## Steward update paths

1. **In WP:** Appearance → Local site (or Customizer)
2. **From UnionOps:** Download site file → Import JSON in Local site (no full theme re-upload)
3. **Assets/CSS change:** Re-download and upload theme ZIP (version bumps with export date)

## Copy rule

Do not ship “UnionOps does not support WordPress.” Say: theme + Local site updates are supported; hosting/plugins/security on their server are not.

## Files

- `src/lib/templates/website/wordpress/build-php.ts`
- `src/lib/templates/website/generate-wordpress-theme-zip.ts`
- Tool UI + `websiteTemplate.*` / `websiteGuide.wordpress.*` EN/FR
- Rule: `.cursor/rules/website-export.mdc`
