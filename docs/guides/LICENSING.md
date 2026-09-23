# Licensing — proprietary now, source-available later

UnionOps on `main` is **proprietary** (see [`LICENSE`](../../LICENSE)): all rights reserved; no public grant to copy, modify, distribute, or self-host without written permission.

Comms tools on the public site remain free to **use** in the browser. That product promise is separate from the source-code license.

## Future: restore an openish / source-available grant

When you intentionally want locals to study, modify, and self-host again:

1. Leave `main` proprietary until you are ready to relicense the product.
2. Create a branch from the last commit that still had the Source-Available LICENSE text, **or** restore the file from history:

   ```bash
   git checkout -b license/source-available
   git show <sha-of-source-available-LICENSE>:LICENSE > LICENSE
   ```

3. On that branch only, re-enable self-host wording in README, manifesto, and share blurbs so marketing matches the grant.
4. Tag the grant text, e.g. `license-source-available-v1`.
5. Merge to `main` only when you mean to relicense the product line.

Optional long-lived track: keep a `community` branch with source-available terms while `main` stays proprietary SaaS. Never force-push either branch.

Do not advertise self-host on `main` while LICENSE remains proprietary.
