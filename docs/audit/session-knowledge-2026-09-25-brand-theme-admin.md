# Session knowledge — Brand Kit theme admin (2026-09-25)

## Verdict

Platform operators manage per-union colours/fonts and instance host brand defaults from `/app/site-admin/brand-styles` without the customization MFA stack. Optional `brand:baseline` draft/publish still requires customization when enabled.

## Do not

- Let theme admin write Hub `users.unionId`.
- Auto-overwrite a steward’s saved Brand Kit (seed/Match only; baseline Apply stays explicit).
- Bypass `NEXT_PUBLIC_BRAND_*` env — env still wins over durable host-brand overlay.

## Shipped

| Piece | Where |
|-------|--------|
| Theme schema | `unions.brand_theme` jsonb (`0061_brand_theme_admin`) |
| Host brand row | `platform_host_brand` singleton + `host-brand-store` |
| Site admin UI | Brand Styles theme editor + Host brand section |
| Baseline path | `POST /api/site-admin/brand-styles/baseline` (customization gate) |
| Hub → Brand Kit | `/api/me/union-brand-preset` returns `theme`; seed + Match apply it |
| Public host resolve | `GET /api/host-brand` for first-visit chrome |

## Follow-on (still deferred)

Sector matrix UI, code-free preset catalog, logo upload into baseline draft form — see [`plan-2026-09-25-brand-kit-admin.md`](plan-2026-09-25-brand-kit-admin.md).
