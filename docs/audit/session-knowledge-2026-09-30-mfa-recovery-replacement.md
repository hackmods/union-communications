# MFA recovery-code authenticator replacement

Phase 4B of `mfa-review-2026-09-30.md` adds a lost-phone replacement path for members who can still sign in and have a saved recovery code. The replacement gate offers separate authenticator and recovery-code choices. Authenticator codes can submit on completion; recovery codes require an explicit continue action.

The replacement API accepts exactly one proof (`code` or `recoveryCode`), applies the shared MFA attempt limit, and serializes the account. In Postgres, the current factor is consumed and the new pending QR is written in the same account-locked transaction. A recovery code is single-use and is spent when the new QR is requested. The confirmed authenticator remains active until the new QR is confirmed; confirmation replaces the secret and issues new recovery codes.

The UI warns that leaving after a recovery code starts setup requires another code. If all factors are lost, account recovery remains an operator-assisted policy path and must not rely on the existing bypass as normal availability.

Validation: 8 focused Vitest files / 88 tests passed, covering the replacement API, page payload, separate recovery input, MFA outcome copy, and EN/FR copy/readability guards. `tsc --noEmit` and targeted ESLint passed. Real `unionops_app` transaction rollback and cross-replica verification are still required in Phase 5.
