import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  assertUnionMeetingView: vi.fn(),
  auditLog: vi.fn(),
  buildRsvpResponsesCsv: vi.fn(),
  freshMfaStepUp: vi.fn(),
  getMeetingById: vi.fn(),
  listResponses: vi.fn(),
  requireMeetingsSession: vi.fn(),
}));

vi.mock("@/lib/audit/store", () => ({ auditLog: { log: mocks.auditLog } }));
vi.mock("@/lib/auth/meetings-session", () => ({
  assertUnionMeetingView: mocks.assertUnionMeetingView,
  requireMeetingsSession: mocks.requireMeetingsSession,
}));
vi.mock("@/lib/auth/fresh-mfa-step-up", () => ({
  verifyFreshMfaStepUp: mocks.freshMfaStepUp,
}));
vi.mock("@/lib/meetings/rsvp-export", () => ({
  buildRsvpResponsesCsv: mocks.buildRsvpResponsesCsv,
}));
vi.mock("@/lib/meetings/rsvp-store", () => ({
  meetingsRsvpStore: {
    getMeetingById: mocks.getMeetingById,
    listResponses: mocks.listResponses,
  },
}));

import { GET, POST } from "@/app/api/meetings/events/[id]/export/route";

const session = {
  user: {
    id: "officer-1",
    unionId: "union-1",
    localId: "local-1",
  },
};
const meeting = {
  id: "meeting-1",
  unionId: "union-1",
  localId: "local-1",
  title: "October LEC",
  startsAt: "2026-10-01T23:00:00.000Z",
  endsAt: "2026-10-02T01:00:00.000Z",
  location: "Union hall",
  hybrid: true,
  createdById: "officer-1",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-02T00:00:00.000Z",
};
const responses = [
  {
    id: "response-1",
    meetingId: "meeting-1",
    unionId: "union-1",
    localId: "local-1",
    attending: "yes",
    displayName: "Confidential member name",
    email: "member@example.org",
    source: "public_form",
    createdAt: "2026-09-10T00:00:00.000Z",
  },
];

function params(id = meeting.id) {
  return { params: Promise.resolve({ id }) };
}

function request(body: Record<string, unknown> = {}) {
  return new Request("http://localhost/api/meetings/events/meeting-1/export", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Request-ID": "client-controlled",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/meetings/events/[id]/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireMeetingsSession.mockResolvedValue({ ok: true, session });
    mocks.assertUnionMeetingView.mockReturnValue(true);
    mocks.getMeetingById.mockResolvedValue(meeting);
    mocks.listResponses.mockResolvedValue(responses);
    mocks.auditLog.mockResolvedValue({});
    mocks.freshMfaStepUp.mockImplementation(({ code }: { code?: string }) =>
      Promise.resolve(
        code
          ? { ok: true, required: true }
          : { ok: false, status: 428, code: "required", outcome: "denied" },
      ),
    );
    mocks.buildRsvpResponsesCsv.mockReturnValue("Name,Attendance\n");
  });

  it("requires fresh MFA before reading RSVP names, contact details, or notes", async () => {
    const response = await POST(request(), params());
    const body = await response.json();

    expect(response.status).toBe(428);
    expect(body.code).toBe("mfa_step_up_required");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("X-Request-ID")).not.toBe("client-controlled");
    expect(mocks.listResponses).not.toHaveBeenCalled();
    expect(mocks.buildRsvpResponsesCsv).not.toHaveBeenCalled();
    expect(mocks.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "officer-1",
        action: "meetings.events.export",
        resourceType: "union_meeting",
        resourceId: meeting.id,
        unionId: meeting.unionId,
        localId: meeting.localId,
        outcome: "denied",
        requestId: response.headers.get("X-Request-ID"),
        metadata: { reason: "mfa_step_up_required" },
      }),
    );
  });

  it("preserves throttling and excludes the challenge from audit metadata", async () => {
    mocks.freshMfaStepUp.mockResolvedValue({
      ok: false,
      status: 429,
      code: "limited",
      outcome: "denied",
      retryAfterSeconds: 90,
    });
    const response = await POST(request({ mfaCode: "654321" }), params());

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("90");
    expect((await response.json()).code).toBe("mfa_step_up_limited");
    expect(mocks.listResponses).not.toHaveBeenCalled();
    expect(JSON.stringify(mocks.auditLog.mock.calls)).not.toContain("654321");
  });

  it("returns a correlated CSV only after the success audit append", async () => {
    const response = await POST(request({ mfaCode: "654321" }), params());

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/csv");
    expect(response.headers.get("Content-Disposition")).toContain(
      "rsvp-October_LEC.csv",
    );
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual(
      [...new TextEncoder().encode("Name,Attendance\n")],
    );
    expect(mocks.listResponses).toHaveBeenCalledWith(meeting.id);
    expect(mocks.buildRsvpResponsesCsv).toHaveBeenCalledWith({ meeting, responses });
    expect(mocks.buildRsvpResponsesCsv.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.auditLog.mock.invocationCallOrder[0],
    );
    expect(mocks.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "meetings.events.export",
        resourceType: "union_meeting",
        resourceId: meeting.id,
        unionId: meeting.unionId,
        localId: meeting.localId,
        outcome: "success",
        requestId: response.headers.get("X-Request-ID"),
        metadata: {},
      }),
    );
    expect(JSON.stringify(mocks.auditLog.mock.calls)).not.toContain("654321");
    expect(JSON.stringify(mocks.auditLog.mock.calls)).not.toContain(
      "Confidential member name",
    );
    expect(JSON.stringify(mocks.auditLog.mock.calls)).not.toContain(
      "member@example.org",
    );
  });

  it("withholds the CSV if the success audit cannot be confirmed", async () => {
    mocks.auditLog.mockRejectedValue(new Error("audit backend unavailable"));
    const response = await POST(request({ mfaCode: "654321" }), params());

    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("export_audit_unavailable");
    expect(response.headers.get("Content-Type")).toContain("application/json");
    expect(response.headers.get("Content-Disposition")).toBeNull();
  });

  it("does not challenge or read RSVP rows for an out-of-scope meeting", async () => {
    mocks.assertUnionMeetingView.mockReturnValue(false);
    const response = await POST(request(), params());

    expect(response.status).toBe(404);
    expect(mocks.freshMfaStepUp).not.toHaveBeenCalled();
    expect(mocks.listResponses).not.toHaveBeenCalled();
    expect(mocks.buildRsvpResponsesCsv).not.toHaveBeenCalled();
    expect(mocks.auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "denied",
        unionId: session.user.unionId,
        localId: session.user.localId,
      }),
    );
  });

  it("retires the legacy GET download URL", async () => {
    const response = await GET();

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("POST");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
