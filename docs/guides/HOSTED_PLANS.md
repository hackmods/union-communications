# Hosted plans (operator dark launch)

Operator guide for Free / Member / Paid hosted Hub+Portal caps.
Public Comms stay free forever (ADR-019 / ADR-024). There is **no** public `/pricing` page.

## CapRover toggle (required for enforcement)

| Env | Default | Effect |
|-----|---------|--------|
| `UNIONOPS_HOSTED_PLANS_ENABLED` | unset / `false` | **Dark** — no feature caps; existing tenants unchanged |
| `UNIONOPS_HOSTED_PLANS_ENABLED=true` | — | Enforce Free/Full caps from Site Admin assignments |

Paste in CapRover App Config (Host readiness also shows this block):

```
# Hosted Free/Full caps — leave false until Site Admin assigns plans
UNIONOPS_HOSTED_PLANS_ENABLED=false
# UNIONOPS_HOSTED_PLANS_ENABLED=true
```

Redeploy after changing the flag.

## Access vs commercial

| Access class | Commercial class | Modules |
|--------------|------------------|---------|
| `free` | usually unset; donation optional | Lite Portal + thin Hub (`comms`, `discussions`, `portal`) |
| `full` | `member` (donation / courtesy) | Same as Paid — full union ceiling (+ optional subset) |
| `full` | `paid` (seat SKU) | Identical access to Member |

**Member and Paid are the same for access.** Commercial class is billing-only.

Seat SKUs (operator-internal; not public copy):

- `solo` — CAD $20/mo, 1 Hub seat (soft display)
- `exec_under_50` — CAD $50/mo, under 50 seats (soft)
- `custom` — operator notes

## Inheritance

1. Set a **union** default to Full + Member/Paid → locals inherit out of the box.
2. Override one **local** to Free under a Full union for a pilot.
3. Optional **module subset** / portal surface subset narrows Full (union ∩ local).

## Site Admin

`/app/site-admin/hosted-plans` — assign union default or local override. Durable Postgres required.

Caps only apply when the CapRover flag is `true`.

## Future (not in this ship)

- Stripe / invoices + hard seat enforcement
- Public `/pricing` (needs explicit product cut)
- Rich subset multi-select UI (schema + API already accept subsets)

See ADR-024 in `docs/DECISIONS.md`.
