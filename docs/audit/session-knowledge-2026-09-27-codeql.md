# CodeQL static analysis — 2026-09-27

## Goal

Add recurring security-focused source analysis for the app's JavaScript and
TypeScript code and retain results where maintainers can triage them.

## Findings and decision

- The repository already runs ESLint with `eslint-config-next` and its
  TypeScript rules, but has no dedicated source security analysis workflow.
- The repository is publicly visible on GitHub as of this review. GitHub
  documents code scanning as available for public repositories; private
  repositories have separate Code Security entitlement requirements.
- Added `.github/workflows/codeql.yml` using GitHub CodeQL's extended query
  suite for `javascript-typescript`. It runs on PRs into `main`, pushes to
  `main`, a weekly schedule, and manual dispatch. Results are uploaded to GitHub
  code scanning with `security-events: write` scoped to the analysis job.
- The CodeQL Action reference is `v4.38.2`, a signed immutable upstream release
  current at implementation time. Dependabot's existing `github-actions`
  ecosystem will check for new versions.
- Extended `scripts/check-security-workflows.mjs` to protect the CodeQL event,
  version, language, query suite, and permission configuration.

## Verification

- `npm run check:security-workflows` passes.
- PyYAML parses the CodeQL workflow and the query/permissions assertions pass.
- `git diff --check` passes.
- No CodeQL workflow has run in GitHub Actions yet; no findings or triage report
  are available. Local CodeQL execution was not attempted.

## Limits and follow-up

- CodeQL generates reviewable alerts; this workflow does not itself make
  findings fail a merge. Verify a repository ruleset/branch protection check
  and decide which severity classes require resolution or an approved
  exception.
- Confirm the first workflow upload succeeds and review the initial baseline.
- GitHub code scanning availability changes if the repository becomes private
  without an eligible Code Security entitlement.
- Safe-staging DAST, additional complementary static analysis, and external
  CapRover Git/webhook deployment governance remain open.

## References

- [UnionOps repository visibility](https://github.com/hackmods/union-communications)
- [GitHub code scanning availability](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/configure-code-scanning/configuring-advanced-setup-for-code-scanning)
- [CodeQL Action v4.38.2 release](https://github.com/github/codeql-action/releases/tag/v4.38.2)
