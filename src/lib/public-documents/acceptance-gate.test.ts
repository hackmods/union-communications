import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { acceptanceRequiresVerifiedMfa, acceptanceSatisfiesRequirement, resolveAcceptanceScope, type AcceptanceRequirement } from "./acceptance-gate";

const individual: AcceptanceRequirement = { slug: "terms", title: "Terms", versionId: "terms-v2", requiresAcceptance: true, acceptanceScope: "individual" };
const organization: AcceptanceRequirement = { slug: "dpa", title: "DPA", versionId: "dpa-v1", requiresAcceptance: true, acceptanceScope: "organization" };

describe("public document acceptance scope", () => {
  it("requires MFA for organization acceptance but not personal terms acceptance", () => {
    expect(acceptanceRequiresVerifiedMfa("individual")).toBe(false);
    expect(acceptanceRequiresVerifiedMfa("organization")).toBe(true);
  });

  it("defaults pre-scope payloads to individual acceptance", () => {
    expect(resolveAcceptanceScope(undefined)).toBe("individual");
    expect(resolveAcceptanceScope("unexpected-value")).toBe("organization");
    expect(resolveAcceptanceScope("organization")).toBe("organization");
  });

  it("accepts only the matching individual identity for individual requirements", () => {
    expect(acceptanceSatisfiesRequirement(individual, { subjectType: "individual", subjectId: "user-1" }, { userId: "user-1", unionId: "union-1", localId: "local-1" })).toBe(true);
    expect(acceptanceSatisfiesRequirement(individual, { subjectType: "union", subjectId: "union-1" }, { userId: "user-1", unionId: "union-1", localId: "local-1" })).toBe(false);
    expect(acceptanceSatisfiesRequirement(individual, { subjectType: "individual", subjectId: "user-2" }, { userId: "user-1" })).toBe(false);
  });

  it("requires current union or local evidence for organization requirements", () => {
    const identity = { userId: "user-1", unionId: "union-1", localId: "local-1" };
    expect(acceptanceSatisfiesRequirement(organization, { subjectType: "individual", subjectId: "user-1" }, identity)).toBe(false);
    expect(acceptanceSatisfiesRequirement(organization, { subjectType: "union", subjectId: "union-1" }, identity)).toBe(true);
    expect(acceptanceSatisfiesRequirement(organization, { subjectType: "local", subjectId: "local-1" }, identity)).toBe(true);
    expect(acceptanceSatisfiesRequirement(organization, { subjectType: "local", subjectId: "other-local" }, identity)).toBe(false);
    expect(acceptanceSatisfiesRequirement(organization, { subjectType: "union", subjectId: "other-union" }, identity)).toBe(false);
  });

  it("keeps the database acceptance ledger immutable and attested", () => {
    const migration = readFileSync(join(process.cwd(), "src/lib/db/migrations/0067_document_acceptance_evidence.sql"), "utf8");
    const individualPolicyMigration = readFileSync(join(process.cwd(), "src/lib/db/migrations/0075_personal_document_acceptance.sql"), "utf8");
    expect(migration).toContain("DROP POLICY IF EXISTS public_document_acceptances_admin_update");
    expect(migration).toContain("BEFORE UPDATE OR DELETE ON public_document_acceptances");
    expect(migration).toContain("REVOKE UPDATE, DELETE ON TABLE public_document_acceptances FROM PUBLIC, unionops_app");
    expect(migration).toContain("authority_attestation_version = 'unionops-organization-acceptance-v1'");
    expect(migration).toContain("acceptance_source = 'legacy'");
    const personalBranch = individualPolicyMigration.split("OR (subject_type = 'union'")[0];
    const unionBranch = individualPolicyMigration.split("OR (subject_type = 'union'")[1]?.split("OR (subject_type = 'local'")[0] ?? "";
    const localBranch = individualPolicyMigration.split("OR (subject_type = 'local'")[1] ?? "";
    expect(personalBranch).toContain("subject_type = 'individual'");
    expect(personalBranch).not.toContain("app.current_mfa_verified");
    expect(unionBranch).toContain("current_setting('app.current_mfa_verified', true) = 'true'");
    expect(localBranch).toContain("current_setting('app.current_mfa_verified', true) = 'true'");
  });
});
