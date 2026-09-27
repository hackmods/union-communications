#!/usr/bin/env node
/**
 * UnionOps-operated production gate. Keep the host contract in one place:
 * `verify-host-readiness.mjs` mirrors the Site Admin readiness calculation.
 *
 * Usage:
 *   HOST_READINESS_SECRET=... HEALTH_URL=https://unionops.org \
 *     npm run health:check:production
 */
process.env.REQUIRE_HOSTED_CUSTOMER_MODE = "true";
await import("./verify-host-readiness.mjs");
