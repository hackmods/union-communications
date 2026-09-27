import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  resolveActor: vi.fn(),
  outstanding: vi.fn(),
  currentPartyStatuses: vi.fn(),
  withRlsContext: vi.fn(),
  getDb: vi.fn(),
  log: vi.fn(),
  insertValues: vi.fn(),
  returning: vi.fn(),
  partyRows: vi.fn(),
  freshStepUp: vi.fn(),
  selectCallCount: 0,
  documentHeads: vi.fn(),
  documentVersions: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/authorization/resolve-actor", () => ({ resolveAuthorizationActor: mocks.resolveActor }));
vi.mock("@/lib/public-documents/acceptance-gate", () => ({
  acceptanceRequiresVerifiedMfa: (scope: "individual" | "organization") => scope === "organization",
  outstandingDocumentAcceptances: mocks.outstanding,
  currentOrganizationAcceptanceStatuses: mocks.currentPartyStatuses,
}));
vi.mock("@/lib/db/rls-context", () => ({ withRlsContext: mocks.withRlsContext }));
vi.mock("@/lib/db/client", () => ({ getDb: mocks.getDb }));
vi.mock("@/lib/audit/store", () => ({ auditLog: { log: mocks.log } }));
vi.mock("@/lib/auth/fresh-mfa-step-up", () => ({ verifyFreshMfaStepUp: mocks.freshStepUp }));

import { GET, POST } from "./route";

function session(input: { roles: string[]; mfaVerified: boolean }) {
  return {
    user: {
      id: "user-1",
      unionId: "union-1",
      localId: "local-1",
      roles: input.roles,
      mfaVerified: input.mfaVerified,
    },
  };
}

function request(body: unknown) {
  return new Request("https://unionops.test/api/documents/acceptance", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/documents/acceptance MFA scope", () => {
  beforeEach(() => {
    mocks.auth.mockReset();
    mocks.resolveActor.mockReset();
    mocks.outstanding.mockReset();
    mocks.currentPartyStatuses.mockReset().mockResolvedValue([]);
    mocks.withRlsContext.mockReset();
    mocks.getDb.mockReset();
    mocks.log.mockReset().mockResolvedValue(undefined);
    mocks.insertValues.mockReset();
    mocks.returning.mockReset().mockResolvedValue([{ id: "accept-1" }]);
    mocks.partyRows.mockReset().mockResolvedValue([{ id: "current-party" }]);
    mocks.selectCallCount = 0;
    mocks.documentHeads.mockReset().mockResolvedValue([{
      id: "document-1", status: "published", publishAt: null, archivedAt: null,
      publishedVersion: 1, scheduledVersion: null, currentVersion: 1,
    }]);
    mocks.documentVersions.mockReset().mockResolvedValue([{ id: "version-1" }]);
    mocks.freshStepUp.mockReset().mockResolvedValue({ ok: true, required: false });
    mocks.insertValues.mockReturnValue({
      onConflictDoNothing: () => ({ returning: mocks.returning }),
    });
    mocks.getDb.mockReturnValue({
      select: () => ({ from: () => {
        mocks.selectCallCount += 1;
        const rows = mocks.selectCallCount === 1 ? mocks.documentHeads : mocks.selectCallCount === 2 ? mocks.documentVersions : mocks.partyRows;
        const query = { limit: rows, for: () => query };
        return { where: () => query };
      } }),
      insert: () => ({ values: mocks.insertValues }),
    });
    mocks.withRlsContext.mockImplementation(async (_context: unknown, callback: () => unknown) => callback());
    mocks.resolveActor.mockImplementation(async (sess: ReturnType<typeof session>) => ({
      userId: sess.user.id,
      unionId: sess.user.unionId,
      roles: sess.user.roles,
      memberships: [],
      assignments: sess.user.roles.includes("local_president") ? [{ unionId: "union-1", localId: "local-1", position: "president" }] : [],
      delegations: [],
      circleMemberships: [],
      mfaVerified: sess.user.mfaVerified,
      accountActive: true,
      source: "database",
    }));
  });

  it("records personal acceptance for a basic account without asserting MFA", async () => {
    mocks.auth.mockResolvedValue(session({ roles: ["local_member"], mfaVerified: false }));
    mocks.outstanding.mockResolvedValue([{ slug: "terms", title: "Terms", versionId: "version-1", requiresAcceptance: true, acceptanceScope: "individual" }]);

    const response = await POST(request({ slug: "terms", subjectType: "individual" }));

    expect(response.status).toBe(200);
    expect(mocks.withRlsContext).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-1", mfaVerified: false }), expect.any(Function));
    expect(mocks.insertValues).toHaveBeenCalledWith(expect.objectContaining({
      acceptedById: "user-1",
      subjectType: "individual",
      subjectId: "user-1",
      authorityAttested: false,
    }));
  });

  it("rejects organization acceptance without an MFA-verified session", async () => {
    mocks.auth.mockResolvedValue(session({ roles: ["union_admin"], mfaVerified: false }));
    mocks.outstanding.mockResolvedValue([{ slug: "dpa", title: "DPA", versionId: "version-1", requiresAcceptance: true, acceptanceScope: "organization" }]);

    const response = await POST(request({ slug: "dpa", subjectType: "union", authorityAttestation: true }));

    expect(response.status).toBe(403);
    expect(mocks.withRlsContext).not.toHaveBeenCalled();
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("records organization acceptance only with verified MFA and current union authority", async () => {
    mocks.auth.mockResolvedValue(session({ roles: ["union_admin"], mfaVerified: true }));
    mocks.outstanding.mockResolvedValue([{ slug: "dpa", title: "DPA", versionId: "version-1", requiresAcceptance: true, acceptanceScope: "organization" }]);

    const response = await POST(request({ slug: "dpa", subjectType: "union", authorityAttestation: true, mfaCode: "123456" }));

    expect(response.status).toBe(200);
    expect(mocks.insertValues).toHaveBeenCalledWith(expect.objectContaining({
      subjectType: "union",
      subjectId: "union-1",
      authorityAttested: true,
      authorityAttestationVersion: "unionops-organization-acceptance-v1",
    }));
    expect(mocks.log).toHaveBeenCalledWith(expect.objectContaining({
      requestId: expect.any(String),
      metadata: expect.objectContaining({ slug: "dpa", subjectId: "union-1" }),
    }));
    expect(mocks.freshStepUp).toHaveBeenCalledWith({ userId: "user-1", code: "123456" });
  });

  it("requires and audits a fresh challenge for organization acceptance", async () => {
    mocks.auth.mockResolvedValue(session({ roles: ["union_admin"], mfaVerified: true }));
    mocks.outstanding.mockResolvedValue([{ slug: "dpa", title: "DPA", versionId: "version-1", requiresAcceptance: true, acceptanceScope: "organization" }]);
    mocks.freshStepUp.mockResolvedValue({ ok: false, status: 428, code: "required", outcome: "denied" });

    const response = await POST(request({ slug: "dpa", subjectType: "union", authorityAttestation: true }));

    expect(response.status).toBe(428);
    expect(mocks.insertValues).not.toHaveBeenCalled();
    expect(mocks.log).toHaveBeenCalledWith(expect.objectContaining({
      action: "document.acceptance.step_up",
      outcome: "denied",
      metadata: expect.objectContaining({ reason: "required", subjectId: "union-1" }),
    }));
    const stepUpAudit = mocks.log.mock.calls[0]?.[0];
    expect(stepUpAudit?.requestId).toEqual(expect.any(String));
    expect(stepUpAudit?.metadata).not.toHaveProperty("mfaCode");
    expect(stepUpAudit?.metadata).not.toHaveProperty("code");
  });

  it("audits direct API attempts with the wrong acceptance subject", async () => {
    mocks.auth.mockResolvedValue(session({ roles: ["local_member"], mfaVerified: true }));
    mocks.outstanding.mockResolvedValue([{ slug: "dpa", title: "DPA", versionId: "version-1", requiresAcceptance: true, acceptanceScope: "organization" }]);

    const response = await POST(request({ slug: "dpa", subjectType: "individual" }));

    expect(response.status).toBe(400);
    expect(mocks.log).toHaveBeenCalledWith(expect.objectContaining({
      action: "document.acceptance.denied",
      outcome: "denied",
      metadata: expect.objectContaining({ reason: "subject_scope_mismatch", slug: "dpa" }),
    }));
    expect(mocks.insertValues).not.toHaveBeenCalled();
  });

  it("rejects and audits a publication that changed after the pending requirement was loaded", async () => {
    mocks.auth.mockResolvedValue(session({ roles: ["union_admin"], mfaVerified: true }));
    mocks.outstanding.mockResolvedValue([{ slug: "dpa", title: "DPA", versionId: "version-1", requiresAcceptance: true, acceptanceScope: "organization" }]);
    mocks.documentVersions.mockResolvedValue([{ id: "version-2" }]);

    const response = await POST(request({ slug: "dpa", subjectType: "union", authorityAttestation: true }));

    expect(response.status).toBe(409);
    expect(mocks.insertValues).not.toHaveBeenCalled();
    expect(mocks.log).toHaveBeenCalledWith(expect.objectContaining({
      action: "document.acceptance.stale_version",
      outcome: "denied",
      metadata: expect.objectContaining({ reason: "publication_changed" }),
    }));
  });

  it("requires the current local president or vice-president for local acceptance", async () => {
    const sess = session({ roles: ["local_president"], mfaVerified: true });
    mocks.auth.mockResolvedValue(sess);
    mocks.outstanding.mockResolvedValue([{ slug: "dpa", title: "DPA", versionId: "version-1", requiresAcceptance: true, acceptanceScope: "organization" }]);

    const allowed = await POST(request({ slug: "dpa", subjectType: "local", authorityAttestation: true, mfaCode: "123456" }));
    expect(allowed.status).toBe(200);
    expect(mocks.insertValues).toHaveBeenCalledWith(expect.objectContaining({ subjectType: "local", subjectId: "local-1", authorityAttested: true }));

    mocks.withRlsContext.mockClear();
    mocks.getDb.mockClear();
    mocks.resolveActor.mockResolvedValue({
      userId: "user-1", unionId: "union-1", roles: ["local_president"], memberships: [], assignments: [],
      delegations: [], circleMemberships: [], mfaVerified: true, accountActive: true, source: "database",
    });
    const denied = await POST(request({ slug: "dpa", subjectType: "local", authorityAttestation: true }));
    expect(denied.status).toBe(403);
    expect(mocks.withRlsContext).not.toHaveBeenCalled();
  });

  it("rejects organization acceptance for an archived or missing party", async () => {
    mocks.auth.mockResolvedValue(session({ roles: ["local_president"], mfaVerified: true }));
    mocks.outstanding.mockResolvedValue([{ slug: "dpa", title: "DPA", versionId: "version-1", requiresAcceptance: true, acceptanceScope: "organization" }]);
    mocks.partyRows.mockResolvedValue([]);

    const response = await POST(request({ slug: "dpa", subjectType: "local", authorityAttestation: true, mfaCode: "123456" }));

    expect(response.status).toBe(409);
    expect(mocks.insertValues).not.toHaveBeenCalled();
  });
});

describe("GET /api/documents/acceptance status", () => {
  beforeEach(() => {
    mocks.auth.mockReset();
    mocks.resolveActor.mockReset();
    mocks.outstanding.mockReset().mockResolvedValue([]);
    mocks.currentPartyStatuses.mockReset().mockResolvedValue([]);
    mocks.auth.mockResolvedValue(session({ roles: ["union_admin"], mfaVerified: true }));
    mocks.resolveActor.mockResolvedValue({
      userId: "user-1", unionId: "union-1", roles: ["union_admin"], memberships: [],
      assignments: [], delegations: [], circleMemberships: [], mfaVerified: true,
      accountActive: true, source: "database",
    });
  });

  it("returns the current union DPA status only for a party the actor may administer", async () => {
    mocks.currentPartyStatuses.mockResolvedValue([{
      scope: "union", versionId: "dpa-v3", version: 3, title: "Data Processing Agreement", acceptedAt: "2026-09-01T12:00:00.000Z",
    }]);
    const response = await GET(new Request("https://unionops.test/api/documents/acceptance?locale=en"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.currentPartyStatuses).toHaveBeenCalledWith(expect.anything(), ["union"], "en");
    expect(await response.json()).toMatchObject({ partyAcceptances: [{ scope: "union", versionId: "dpa-v3", version: 3, acceptedAt: "2026-09-01T12:00:00.000Z" }] });
  });

  it("does not expose agreement status to a revoked or inactive account session", async () => {
    mocks.resolveActor.mockResolvedValue({
      userId: "user-1", unionId: "union-1", roles: ["union_admin"], memberships: [],
      assignments: [], delegations: [], circleMemberships: [], mfaVerified: true,
      accountActive: false, source: "database",
    });
    const response = await GET(new Request("https://unionops.test/api/documents/acceptance?locale=en"));
    expect(response.status).toBe(401);
    expect(mocks.currentPartyStatuses).not.toHaveBeenCalled();
  });
});
