# Outreach polish (2026-09-30)

Phases P1–P3: list create, durable confirm (`0089_outreach_confirm.sql`), import confirm mail, member broadcast dry-run + 50-recipient cap.

## Live RLS smoke (outreach tables)

`npm run db:rls-smoke` still requires `DATABASE_URL` with the `unionops_app` role. When unset locally, source-level checks in `scripts/rls-smoke.ts` still verify `0088_outreach_lists.sql` policies and `0089_outreach_confirm.sql` DEFINER helper exist.

When DATABASE_URL is available after migrate/seed, run:

```sql
-- cross-union read should return 0 rows under tenant president scope
select set_config('app.current_union_id', 'union-b7p', false);
select set_config('app.current_cross_local', 'true', false);
select set_config('app.current_mfa_verified', 'true', false);
select count(*) from outreach_lists where union_id <> 'union-b7p';

select set_config('app.current_union_id', 'union-other', false);
select count(*) from outreach_lists;
```

Expect `0` for both counts when RLS is bound.

## P4

Floor SSE for Portal remains deferred.
