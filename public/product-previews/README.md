# Hosted product excerpts

Captured 2026-10-02 from this application's local synthetic seed, using real authenticated views. These images contain no customer/member data. They are excerpts, not complete dashboards or promises of hosting readiness.

| Assets | Route and account | Captured component/state |
|---|---|---|
| `hub-{en,fr}{,-phone}.png` | `/{locale}/app/`, `president.7@unionops.test` | `HubDashboard` attention section after successful task/check-in responses; actual seeded meeting task and check-in prompts |
| `portal-{en,fr}{,-phone}.png` | `/{locale}/portal/`, `member.7@unionops.test` | `PortalStation` Circle list; actual member-visible Hall and health/safety committee |

Desktop excerpts use a 900px viewport; phone excerpts use 480px. The screenshot crops only the named section. Only the Next development indicator is hidden during capture; product content, values, permissions and styles are not substituted. French interface labels are localized; saved synthetic Circle names and descriptions retain their seed language, as user-authored content would.

`HostedProductPreview` supplies bilingual alternative text, an explicit synthetic-example caption and a full-size image link. Its picture source selects the phone composition below 640px. No authenticated application/store dependency is mounted on Home.

Regenerate explicitly with the repo's Playwright configuration and a **local synthetic demo server**:

```powershell
$env:PLAYWRIGHT_BASE_URL = 'http://127.0.0.1:3015'
$env:UNIONOPS_CAPTURE_PRODUCT_PREVIEWS = 'true'
npm run test:e2e -- e2e/product-presentation.capture.spec.ts --project=chromium --workers=1
```

The capture test skips without the flag and rejects non-loopback hosts. Review every regenerated image before publication. Do not point this workflow at customer data, or replace these excerpts with invented counts or fabricated casework.
