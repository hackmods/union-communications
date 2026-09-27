import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  aggregates: vi.fn(),
  assertPollView: vi.fn(),
  auditLog: vi.fn(),
  buildPollResultsCsv: vi.fn(),
  buildPollResultsXlsx: vi.fn(),
  freshMfaStepUp: vi.fn(),
  getById: vi.fn(),
  reportApiFailure: vi.fn(),
  requirePollsSession: vi.fn(),
}));

vi.mock("@/lib/audit/store", () => ({ auditLog: { log: mocks.auditLog } }));
vi.mock("@/lib/auth/polls-session", () => ({
  assertPollView: mocks.assertPollView,
  requirePollsSession: mocks.requirePollsSession,
}));
vi.mock("@/lib/auth/fresh-mfa-step-up", () => ({
  verifyFreshMfaStepUp: mocks.freshMfaStepUp,
}));
vi.mock("@/lib/polls/export", () => ({
  buildPollResultsCsv: mocks.buildPollResultsCsv,
  buildPollResultsXlsx: mocks.buildPollResultsXlsx,
}));
vi.mock("@/lib/polls/store", () => ({
  pollsStore: { aggregates: mocks.aggregates, getById: mocks.getById },
}));
vi.mock("@/lib/observability/report-server-error", () => ({
  reportApiFailure: mocks.reportApiFailure,
}));

import { GET, POST } from "@/app/api/polls/id/[id]/export/route";

const session = {
  user: {
    id: "officer-1",
    unionId: "union-1",
    localId: "local-1",
  },
};
const poll = {
  id: "poll-1",
  slug: "member-pulse",
  title: "Member pulse",
  unionId: "union-1",
  localId: "local-1",
  createdById: "officer-1",
  status: "closed" as const,
  questions: [],
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-02T00:00:00.000Z",
};
const aggregates = {
  responseCount: 1,
  questions: [
    {
      questionId: "q1",
      text: "What should change?",
      type: "free_text" as const,
      freeText: ["Confidential member response"],
    },
  ],
};

function params(id = poll.id) {
  return { params: Promise.resolve({ id }) };
}

function request(body: Record<string, unknown> = {}) {
  return new Request("http://localhost/api/polls/id/poll-1/export", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Request-ID": "client-controlled",
    },
    body: JSON.stringify({ format: "xlsx", ...body }),
  });
}

describe("POST /api/polls/id/[id]/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePollsSession.mockResolvedValue({ ok: true, session });
    mocks.assertPollView.mockReturnValue(true);
    mocks.getById.mockResolvedValue(poll);
    mocks.aggregates.mockResolvedValue(aggregates);
    mocks.auditLog.mockResolvedValue({});
    mocks.freshMfaStepUp.mockImplementation(({ code }: { code?: string }) =>
      Promise.resolve(
        code
          ? { ok: true, required: true }
          : { ok: false, status: 428, code: "required", outcome: "denied" },
      ),
    );
    mocks.buildPollResultsCsv.mockResolvedValue("Question,Response\n");
    mocks.buildPollResultsXlsx.mockResolvedValue(new Uint8Array([1, 2, 3]));
  });

  it("requires fresh MFA before reading aggregate or free-text answers", async () => {
    const response = await POST(request(), params());
    const body = await response.json();

    expect(response.status).toBe(428);
    expect(body.code).toBe("mfa_step_up_required");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("X-Request-ID")).not.toBe("client-controlled");
    expect(mocks.aggregates).not.toHaveBeenCalled();
    expect(mocks.buildPollResultsXlsx).not.toHaveBeenCalled();
    expect(mocks.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "officer-1",
        action: "polls.export",
        resourceType: "poll_definition",
        resourceId: poll.id,
        unionId: poll.unionId,
        localId: poll.localId,
        outcome: "denied",
        requestId: response.headers.get("X-Request-ID"),
        metadata: { format: "xlsx", reason: "mfa_step_up_required" },
      }),
    );
  });

  it("preserves throttling and never writes the challenge code to audit", async () => {
    mocks.freshMfaStepUp.mockResolvedValue({
      ok: false,
      status: 429,
      code: "limited",
      outcome: "denied",
      retryAfterSeconds: 60,
    });

    const response = await POST(request({ mfaCode: "654321" }), params());

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect((await response.json()).code).toBe("mfa_step_up_limited");
    expect(mocks.aggregates).not.toHaveBeenCalled();
    expect(JSON.stringify(mocks.auditLog.mock.calls)).not.toContain("654321");
  });

  it("returns XLSX only after a correlated success audit", async () => {
    const response = await POST(request({ mfaCode: "654321" }), params());

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("spreadsheetml");
    expect(response.headers.get("Content-Disposition")).toContain(
      "poll-member-pulse-results.xlsx",
    );
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("X-Request-ID")).not.toBe("client-controlled");
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([1, 2, 3]);
    expect(mocks.buildPollResultsXlsx).toHaveBeenCalledWith({ poll, aggregates });
    expect(mocks.buildPollResultsXlsx.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.auditLog.mock.invocationCallOrder[0],
    );
    expect(mocks.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "polls.export",
        resourceType: "poll_definition",
        resourceId: poll.id,
        unionId: poll.unionId,
        localId: poll.localId,
        outcome: "success",
        requestId: response.headers.get("X-Request-ID"),
        metadata: { format: "xlsx" },
      }),
    );
    expect(JSON.stringify(mocks.auditLog.mock.calls)).not.toContain("654321");
    expect(JSON.stringify(mocks.auditLog.mock.calls)).not.toContain(
      "Confidential member response",
    );
  });

  it("builds CSV after challenge and records only format metadata", async () => {
    mocks.freshMfaStepUp.mockResolvedValue({ ok: true, required: true });
    const response = await POST(request({ format: "csv" }), params());

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/csv");
    expect(await response.text()).toContain("Question,Response");
    expect(mocks.buildPollResultsCsv).toHaveBeenCalledWith({ poll, aggregates });
    expect(mocks.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { format: "csv" }, outcome: "success" }),
    );
  });

  it("withholds bytes when the successful audit record cannot be confirmed", async () => {
    mocks.auditLog.mockRejectedValue(new Error("audit backend unavailable"));
    const response = await POST(request({ mfaCode: "654321" }), params());

    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("export_audit_unavailable");
    expect(response.headers.get("Content-Type")).toContain("application/json");
    expect(response.headers.get("Content-Disposition")).toBeNull();
  });

  it("does not challenge or read aggregates for an out-of-scope poll", async () => {
    mocks.assertPollView.mockReturnValue(false);
    const response = await POST(request(), params());

    expect(response.status).toBe(404);
    expect(mocks.freshMfaStepUp).not.toHaveBeenCalled();
    expect(mocks.aggregates).not.toHaveBeenCalled();
    expect(mocks.buildPollResultsXlsx).not.toHaveBeenCalled();
    expect(mocks.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "denied",
        unionId: session.user.unionId,
        localId: session.user.localId,
      }),
    );
  });

  it("retires the legacy query-string download URL", async () => {
    const response = await GET();

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("POST");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
