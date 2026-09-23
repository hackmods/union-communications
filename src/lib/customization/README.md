# Customization foundation (C02–C15)

This directory contains schemas/pure compiler contracts through C15 entitlement gates. See docs/modules/UNION_CUSTOMIZATION.md and docs/guides/CUSTOMIZATION_OPERATOR.md.

Ordinary delivery uses readPublishedContent / loadCustomizationContent. Mutations use saveDraft, previewDraftContent, publishAtomically, setPolicyAtomically, rollbackToRevision and inheritAgain. getCustomizationAdapter() fails when PostgreSQL is unavailable.

## Key modules

- discovery.ts — public catalog allowlist; teasers default off
- assets.ts — MIME/size/content validation; authorize every GET
- grants.ts — maintenance grants behind CUSTOMIZATION_DELEGATION_ENABLED
- local-parameters.ts — allowlisted local contact fields
- workflow.ts — immutable case snapshots behind CUSTOMIZATION_WORKFLOW_ENABLED
- entitlements.ts — hosted maintenance gate; free Comms never paywalled

## Local verification

npm run test:unit -- --maxWorkers=2 src/lib/customization
npm run typecheck
npm run lint
