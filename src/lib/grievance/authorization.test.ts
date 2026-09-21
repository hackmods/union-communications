import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuthorizationActor } from "@/lib/authorization/model";
import { authorizeGrievance, grievanceSummary, isValidGrievanceParticipant } from "@/lib/grievance/authorization";
import type { Grievance } from "@/types/grievance";

const BASE_CASE: Grievance = {
  id: "case-1",
  unionId: "union-1",
  localId: "local-1",
  category: "Hours of work",
  status: "in_progress",
  currentStep: 2,
  filedAt: "2026-09-01T00:00:00.000Z",
  assignedStewardId: "case-worker",
  createdById: "case-worker",
  updatedAt: "2026-09-02T00:00:00.000Z",
  memberPseudonym: "Member A",
  privacyMode: "standard",
};

function actor(input: Partial<AuthorizationActor> = {}): AuthorizationActor {
  return {
    userId: "actor-1",
    unionId: "union-1",
    activeLocalId: "local-1",
    roles: [],
    memberships: [{ unionId: "union-1", localId: "local-1", isPrimary: true }],
    assignments: [],
    delegations: [],
    circleMemberships: [],
    mfaVerified: true,
    accountActive: true,
    source: "session",
    ...input,
  };
}

afterEach(() => vi.unstubAllEnvs());

describe("grievance authorization relationships", () => {
  it("keeps participant role and access-level combinations within the member-safe boundary", () => {
    expect(isValidGrievanceParticipant({ userId: "member-1", relationship: "member", accessLevel: "member_safe" }, { ...BASE_CASE, memberUserId: "member-1" })).toBe(true);
    expect(isValidGrievanceParticipant({ userId: "other", relationship: "member", accessLevel: "case_write" }, BASE_CASE)).toBe(false);
    expect(isValidGrievanceParticipant({ userId: "member-1", relationship: "representative", accessLevel: "member_safe" }, BASE_CASE)).toBe(false);
    expect(isValidGrievanceParticipant({ userId: "case-worker", relationship: "case_worker", accessLevel: "case_read" }, BASE_CASE)).toBe(false);
    expect(isValidGrievanceParticipant({ userId: "rep", relationship: "representative", accessLevel: "case_read" }, BASE_CASE)).toBe(true);
  });

  it("gives president and vice-president the same standard-case access", async () => {
    vi.stubEnv("DATABASE_URL", "");
    for (const position of ["president", "vice_president"] as const) {
      const result = await authorizeGrievance(actor({ assignments: [{ unionId: "union-1", localId: "local-1", position }] }), BASE_CASE);
      expect(result).toMatchObject({ allowed: true, level: "case_write", reason: "local_leadership" });
    }
  });

  it("restricts default leadership access while preserving grievance-officer access", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const restricted = { ...BASE_CASE, privacyMode: "restricted" as const };
    const president = actor({ assignments: [{ unionId: "union-1", localId: "local-1", position: "president" }] });
    const vicePresident = actor({ assignments: [{ unionId: "union-1", localId: "local-1", position: "vice_president" }] });
    const grievanceOfficer = actor({ assignments: [{ unionId: "union-1", localId: "local-1", position: "grievance_officer" }] });
    expect((await authorizeGrievance(president, restricted)).allowed).toBe(false);
    expect((await authorizeGrievance(vicePresident, restricted)).allowed).toBe(false);
    expect(await authorizeGrievance(grievanceOfficer, restricted)).toMatchObject({ allowed: true, level: "case_write", reason: "grievance_officer" });
  });

  it("gives executives a non-identifying summary and keeps sensitive case fields out", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const executive = actor({ assignments: [{ unionId: "union-1", localId: "local-1", position: "executive_member" }] });
    const result = await authorizeGrievance(executive, BASE_CASE);
    expect(result).toMatchObject({ allowed: true, level: "summary" });
    expect(grievanceSummary(BASE_CASE)).not.toHaveProperty("memberPseudonym");
    expect(grievanceSummary(BASE_CASE)).not.toHaveProperty("assignedStewardId");
    expect((await authorizeGrievance(executive, { ...BASE_CASE, privacyMode: "restricted" })).allowed).toBe(false);
  });

  it("limits involved members to the member-safe relationship", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const member = actor({ userId: "member-1" });
    const grievance = { ...BASE_CASE, memberUserId: "member-1" };
    expect(await authorizeGrievance(member, grievance)).toMatchObject({ allowed: true, level: "member_safe", reason: "involved_member" });
  });

  it("requires same-union active local membership and fails closed on missing scope", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const unassigned = actor({ assignments: [{ unionId: "union-1", localId: "local-1", position: "president" }] });
    expect((await authorizeGrievance(actor({ memberships: [] }), BASE_CASE)).reason).toBe("active_local_membership_required");
    expect((await authorizeGrievance(actor({ unionId: "union-other" }), BASE_CASE)).reason).toBe("union_mismatch");
    expect((await authorizeGrievance(actor({ accountActive: false }), BASE_CASE)).reason).toBe("inactive_account");
    expect((await authorizeGrievance(unassigned, { ...BASE_CASE, localId: "local-2" })).allowed).toBe(false);
  });

  it("limits delegated case access to the active standard-case window", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const activeDelegate = actor({ delegations: [{ unionId: "union-1", localId: "local-1", capability: "grievances.case.read", grantorUserId: "president-1", endsAt: new Date(Date.now() + 60_000).toISOString() }] });
    const expiredDelegate = actor({ delegations: [{ unionId: "union-1", localId: "local-1", capability: "grievances.case.read", grantorUserId: "president-1", endsAt: new Date(Date.now() - 60_000).toISOString() }] });
    expect(await authorizeGrievance(activeDelegate, BASE_CASE)).toMatchObject({ allowed: true, level: "case_read", reason: "active_delegation" });
    expect((await authorizeGrievance(activeDelegate, { ...BASE_CASE, privacyMode: "restricted" })).allowed).toBe(false);
    expect((await authorizeGrievance(expiredDelegate, BASE_CASE)).allowed).toBe(false);
  });

  it("keeps administrators out of case content by role alone", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const admin = actor({ userId: "admin-1", roles: ["platform_admin"], memberships: [] });
    expect((await authorizeGrievance(admin, BASE_CASE)).allowed).toBe(false);
  });
});
