# Customization operator runbook (C11)

Root-operated baseline workflow after infrastructure is deployed. This is an
operator document, not a seed of real union content.

## Preconditions

1. Host has `CUSTOMIZATION_ENABLED=true`, durable auth (`AUTH_USERS_BACKEND=postgres`), and configured MFA (`AUTH_MFA_ENABLED=true`, `AUTH_MFA_MODE=totp`).
2. Migration `0054_customization_foundation` (and later) applied; `/api/health` schema contract green.
3. You are signed in as `platform_admin` with MFA verified.

## Create a union baseline (no members invited)

1. Open `/app/site-admin/customization`.
2. Select the real union. Create its customization scope. Scope creation does **not** invite anyone.
3. Draft a **brand baseline**, **source**, or **custom guide** through the forms (not raw JSON).
4. Save draft → private preview → publish. Note the release id in history.
5. For Print pilot content, publish under key `guide:learn-print` when converting that guide.
6. Custom guides appear at `/learn/custom/<union-slug>/<guide-slug>` and stay `noindex`.

## Audience and discovery

- Use the audience control (Public / Verified member / Local officer). Descendants may only tighten.
- Public catalog teasers default **off**. Enabling a teaser never substitutes for authorization.
- Withdrawal and audience tightening are independent of editorial rollback.

## Brand Kit baseline

Volunteers must **explicitly** apply a published brand baseline from Brand Kit. Undo restores the prior kit. Never auto-overwrite saved kits.

## Phase 3 flags (off by default)

| Flag | Effect |
|---|---|
| `CUSTOMIZATION_DELEGATION_ENABLED=true` | Activates maintenance grants (edit/publish separately granted). |
| `CUSTOMIZATION_WORKFLOW_ENABLED=true` | Allows new cases to pin a published workflow snapshot. |

## Second synthetic union

Repeat the same UI workflow for a second fictional union to prove no union-name code branch is required. Record what was populated vs still empty.

## Link and rights review

Follow the existing external-links audit playbook. National sites may need browser verification. Do not invent translation or rights claims.

## Entitlements

Hosted maintenance entitlement (`customization.maintenance`) may block **new edits** when expired while preserving published reader access and free public Comms. Entitlements never grant membership.

## Commit / CI

Ship customization work with conventional commits; **push arms GitHub Actions**. Do not treat green unit tests as a substitute for browser verification of national URLs.

See also: [OPSEU customization use case](OPSEU_CUSTOMIZATION.md).
