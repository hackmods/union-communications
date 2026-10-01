# MFA challenge and setup UX

Phase 4A of `mfa-review-2026-09-30.md` separates authenticator and recovery-code entry so a numeric recovery-code prefix cannot trigger TOTP auto-submit. TOTP retains one-time-code autofill and numeric input; recovery entry uses its own text field and explicit submit.

Challenge throttles display the server's `Retry-After` duration as a live countdown and disable the affected submit action. Pending authenticator setup now displays its expiry, hides expired QR/manual-secret inputs, and offers a restart. Replacing an authenticator requires fresh proof before a new QR is requested.

MFA code inputs connect visible hints and validation errors through `aria-describedby`, set `aria-invalid`, and can receive focus on validation failure. English and French copy keys were added together. French wording still needs a human language review; manual keyboard, screen-reader, mobile, and zoom review remains in Phase 5.

Validation for this slice: 7 focused Vitest files / 81 tests passed, including the public-copy style, SEO metadata, asserted-copy, and readability guards. `tsc --noEmit`, targeted ESLint, and `git diff --check` passed. The countdown hook clears its timer state from the timer callback when the server-supplied duration expires.
