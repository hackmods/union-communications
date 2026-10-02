# Visual system

Status: implementation direction selected on recovered baseline `fd204bb1`; token changes require rendered comparison.

## Starting specifications

Keep the existing system sans stack for controls and body copy; use weight and tight heading tracking for editorial character. Start public hero headings at a fluid 2.25–3.75rem, section headings at 1.5–2.25rem, and working titles at 1.25–1.75rem. Body text stays at 1rem with 1.5–1.65 line height; compact metadata can use 0.875rem. These are role specifications, not blanket element selectors or export typography.

Start with neutral ink and paper surfaces, existing accessible orange for platform actions, one-pixel rules, 4–8px control/panel corners and little or no shadow. Preserve tenant identity in outputs and existing brand-aware chrome. Add semantic tokens only where multiple consumers need them; do not replace the brand configuration model. Use a 4/8px spacing rhythm, 16–24px within groups and 32–64px between public sections, with tighter operational grouping. Check final colours in every supported theme before adoption.

## Foundation

Retain `PageShell` and established width tiers. Public orientation can compose the wide frame with asymmetric text/product regions; body text remains around 60–70 characters. Do not widen every paragraph to fill a workspace or widen Home beyond the toolkit.

Use existing locally supplied typefaces first. Establish deliberate hierarchy through weight, measure and spacing before adding a font. Orientation headings may be expressive. Catalog and operational titles stay compact; dense interfaces retain usable working space. Never apply page typography changes to fixed-size export roots.

## Colour and containment

Use a stable readable application ink, white or lightly tinted working surfaces, clear rules and restrained brand accents. Home now uses a light paper field with orange emphasis, clear section rules and neutral text. Catalog results use open ruled entries; workspace panels use flat white surfaces. Brand colours in generated outputs retain their own contrast helpers. Existing `opseu-*` aliases are legacy token names, not a reason to rewrite tenant configuration in this pass.

Remove decorative gradient surfaces where they compete with product content. Prefer section rules and open layouts for narrative. Use bordered panels for a bounded workspace, related controls or an actual artifact. `PublicHubPanel` now uses neutral white and a smaller corner radius. Reduce large radii and nested containment where those obscure hierarchy. Do not indiscriminately flatten status, warning or permission boundaries.

## Interaction

Buttons should distinguish one primary action from secondary and text actions. Preserve native semantics, disabled states and descriptive labels. Focus must be visible on light and dark surfaces; hover must not be the only indication that an element is actionable. Use comfortable touch targets without unnecessarily enlarging dense desktop forms.

Motion is functional and brief. No page-entry choreography is needed. Existing reduced-motion and text-size preferences remain authoritative.

## Adoption rule

Adjust a shared primitive only after identifying its consumers and checking at least one public and one working context where applicable. Use role-specific compositions rather than a global CSS override that changes every heading, card or input. Record actual token decisions and tested consumers here after implementation.
