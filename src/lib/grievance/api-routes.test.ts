import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import {
  GET as listCommunications,
  POST as createCommunication,
} from "@/app/api/grievances/[id]/communications/route";
import {
  GET as listMeetings,
  POST as createMeeting,
} from "@/app/api/grievances/[id]/meetings/route";
import { POST as createNote } from "@/app/api/grievances/[id]/notes/route";
import {
  GET as getOutcome,
  POST as recordOutcome,
} from "@/app/api/grievances/[id]/outcome/route";
import {
  memoryGrievanceStore,
  resetGrievanceMemoryForTests,
} from "./memory-adapter";
import { resetGrievanceStore } from "./store";

function session(input?: {
  id?: string;
  name?: string;
  unionId?: string | null;
  localId?: string | null;
  roles?: UserRole[];
}) {
  return {
    user: {
      id: input?.id ?? "user-president-243",
      name: input?.name ?? "Local 243 President",
      unionId:
        input?.unionId === null ? undefined : (input?.unionId ?? "union-opseu"),
      localId:
        input?.localId === null ? undefined : (input?.localId ?? "local-243"),
      roles: input?.roles ?? (["local_president"] as UserRole[]),
    },
  };
}

function jsonRequest(body: unknown): Request {
  return {
    json: async () => body,
  } as Request;
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

const stewardSession = () =>
  session({
    id: "user-steward-243",
    name: "Local 243 Steward",
    roles: ["local_steward"],
  });

async function seedForeignGrievance() {
  return memoryGrievanceStore.create(
    {
      category: "Other union",
      filedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      unionId: "union-other",
      localId: "local-1",
      createdById: "user-x",
      assignedStewardId: "user-x",
    },
  );
}

describe("grievance communications / meetings / notes / outcome API", () => {
  beforeEach(() => {
    resetGrievanceMemoryForTests();
    resetGrievanceStore();
    authMock.mockReset();
  });

  afterEach(() => {
    resetGrievanceMemoryForTests();
    resetGrievanceStore();
  });

  describe("communications", () => {
    it("returns 401 without a session and 403 for members", async () => {
      authMock.mockResolvedValue(null);
      expect(
        (await listCommunications(new Request("http://localhost"), params("grev-001")))
          .status,
      ).toBe(401);

      authMock.mockResolvedValue(session({ roles: ["local_member"] }));
      const forbidden = await listCommunications(
        new Request("http://localhost"),
        params("grev-001"),
      );
      expect(forbidden.status).toBe(403);
      expect(await forbidden.json()).toEqual({ error: "Forbidden" });
    });

    it("lets the assigned steward read grev-001 and forbids the other steward's case", async () => {
      authMock.mockResolvedValue(stewardSession());
      const own = await listCommunications(
        new Request("http://localhost"),
        params("grev-001"),
      );
      expect(own.status).toBe(200);
      const body = (await own.json()) as {
        communications: Array<{ id: string; grievanceId: string }>;
      };
      expect(body.communications.some((c) => c.id === "comm-001")).toBe(true);

      const other = await listCommunications(
        new Request("http://localhost"),
        params("grev-002"),
      );
      expect(other.status).toBe(403);
    });

    it("returns 404 for a missing id and 403 for another union, including platform_admin", async () => {
      const foreign = await seedForeignGrievance();
      authMock.mockResolvedValue(session({ roles: ["platform_admin"] }));

      expect(
        (
          await listCommunications(
            new Request("http://localhost"),
            params("grev-missing"),
          )
        ).status,
      ).toBe(404);

      const crossUnion = await listCommunications(
        new Request("http://localhost"),
        params(foreign.grievance.id),
      );
      expect(crossUnion.status).toBe(403);
      expect(await crossUnion.json()).toEqual({ error: "Forbidden" });
    });

    it("lets a president read the local case and not another local", async () => {
      authMock.mockResolvedValue(session());
      expect(
        (
          await listCommunications(
            new Request("http://localhost"),
            params("grev-002"),
          )
        ).status,
      ).toBe(200);
      expect(
        (
          await listCommunications(
            new Request("http://localhost"),
            params("grev-003"),
          )
        ).status,
      ).toBe(403);
    });

    it("rejects incomplete posts then stamps session author and case tenant, ignoring forged keys", async () => {
      authMock.mockResolvedValue(stewardSession());
      const missing = await createCommunication(
        jsonRequest({ channel: "email" }),
        params("grev-001"),
      );
      expect(missing.status).toBe(400);

      const created = await createCommunication(
        jsonRequest({
          channel: "email",
          direction: "outbound",
          summary: "Sent Step 1 update",
          occurredAt: "2026-09-01T12:00:00.000Z",
          unionId: "union-other",
          localId: "local-evil",
          loggedById: "attacker",
        }),
        params("grev-001"),
      );
      expect(created.status).toBe(201);
      const body = (await created.json()) as {
        communication: {
          unionId: string;
          localId: string;
          loggedById: string;
          summary: string;
        };
      };
      expect(body.communication.unionId).toBe("union-opseu");
      expect(body.communication.localId).toBe("local-243");
      expect(body.communication.loggedById).toBe("user-steward-243");
      expect(body.communication.summary).toBe("Sent Step 1 update");
    });

    it("forbids a steward from logging on an unassigned case and local_exec from writing", async () => {
      authMock.mockResolvedValue(stewardSession());
      expect(
        (
          await createCommunication(
            jsonRequest({
              channel: "phone",
              direction: "inbound",
              summary: "Nope",
              occurredAt: "2026-09-01T12:00:00.000Z",
            }),
            params("grev-002"),
          )
        ).status,
      ).toBe(403);

      authMock.mockResolvedValue(session({ roles: ["local_exec"] }));
      expect(
        (
          await createCommunication(
            jsonRequest({
              channel: "phone",
              direction: "inbound",
              summary: "Exec write",
              occurredAt: "2026-09-01T12:00:00.000Z",
            }),
            params("grev-001"),
          )
        ).status,
      ).toBe(403);
    });
  });

  describe("meetings", () => {
    it("lets the assigned steward list meetings and forbids another union", async () => {
      authMock.mockResolvedValue(stewardSession());
      const own = await listMeetings(
        new Request("http://localhost"),
        params("grev-001"),
      );
      expect(own.status).toBe(200);
      const body = (await own.json()) as {
        meetings: Array<{ id: string }>;
      };
      expect(body.meetings.some((m) => m.id === "meet-001")).toBe(true);

      const foreign = await seedForeignGrievance();
      authMock.mockResolvedValue(session({ roles: ["platform_admin"] }));
      const crossUnion = await listMeetings(
        new Request("http://localhost"),
        params(foreign.grievance.id),
      );
      expect(crossUnion.status).toBe(403);
    });

    it("rejects incomplete posts then returns an ICS stamped to the case, not the body tenant", async () => {
      authMock.mockResolvedValue(stewardSession());
      const missing = await createMeeting(
        jsonRequest({ title: "Only title" }),
        params("grev-001"),
      );
      expect(missing.status).toBe(400);

      const created = await createMeeting(
        jsonRequest({
          title: "Step 1 follow-up",
          startsAt: "2026-09-10T14:00:00.000Z",
          endsAt: "2026-09-10T15:00:00.000Z",
          location: "HR office",
          unionId: "union-other",
          createdById: "attacker",
        }),
        params("grev-001"),
      );
      expect(created.status).toBe(201);
      const body = (await created.json()) as {
        meeting: {
          unionId: string;
          localId: string;
          createdById: string;
          title: string;
        };
        ics: string;
      };
      expect(body.meeting.unionId).toBe("union-opseu");
      expect(body.meeting.localId).toBe("local-243");
      expect(body.meeting.createdById).toBe("user-steward-243");
      expect(body.ics).toContain("BEGIN:VEVENT");
      expect(body.ics).toContain("SUMMARY:Step 1 follow-up");
      expect(body.ics).toContain("LOCATION:HR office");
    });

    it("forbids a steward from scheduling on an unassigned case", async () => {
      authMock.mockResolvedValue(stewardSession());
      const res = await createMeeting(
        jsonRequest({
          title: "Wrong case",
          startsAt: "2026-09-10T14:00:00.000Z",
          endsAt: "2026-09-10T15:00:00.000Z",
        }),
        params("grev-002"),
      );
      expect(res.status).toBe(403);
    });
  });

  describe("notes", () => {
    it("rejects an empty body and stamps the session author while ignoring forged keys", async () => {
      authMock.mockResolvedValue(stewardSession());
      const missing = await createNote(jsonRequest({ body: "   " }), params("grev-001"));
      expect(missing.status).toBe(400);

      const created = await createNote(
        jsonRequest({
          body: "Member confirmed the timeline.",
          authorId: "attacker",
          unionId: "union-other",
        }),
        params("grev-001"),
      );
      expect(created.status).toBe(201);
      const body = (await created.json()) as {
        note: { authorId: string; authorName: string; body: string };
      };
      expect(body.note.authorId).toBe("user-steward-243");
      expect(body.note.authorName).toBe("Local 243 Steward");
      expect(body.note.body).toBe("Member confirmed the timeline.");
    });

    it("forbids a steward from noting an unassigned case", async () => {
      authMock.mockResolvedValue(stewardSession());
      expect(
        (await createNote(jsonRequest({ body: "Nope" }), params("grev-002"))).status,
      ).toBe(403);
    });
  });

  describe("outcome", () => {
    it("lets an officer read a local outcome and forbids another union", async () => {
      authMock.mockResolvedValue(session());
      const empty = await getOutcome(
        new Request("http://localhost"),
        params("grev-001"),
      );
      expect(empty.status).toBe(200);
      expect(await empty.json()).toEqual({ outcome: null });

      const foreign = await seedForeignGrievance();
      authMock.mockResolvedValue(session({ roles: ["platform_admin"] }));
      const crossUnion = await getOutcome(
        new Request("http://localhost"),
        params(foreign.grievance.id),
      );
      expect(crossUnion.status).toBe(403);
    });

    it("rejects extra tenant keys then records the session officer, not the body", async () => {
      authMock.mockResolvedValue(session());
      const forged = await recordOutcome(
        jsonRequest({
          outcomeType: "settled",
          decidedAt: "2026-09-01T12:00:00.000Z",
          unionId: "union-other",
          recordedById: "attacker",
        }),
        params("grev-001"),
      );
      expect(forged.status).toBe(400);

      const created = await recordOutcome(
        jsonRequest({
          outcomeType: "settled",
          settlementTerms: "Without prejudice",
          decidedAt: "2026-09-01T12:00:00.000Z",
        }),
        params("grev-001"),
      );
      expect(created.status).toBe(201);
      const body = (await created.json()) as {
        outcome: {
          grievanceId: string;
          outcomeType: string;
          recordedById: string;
        };
      };
      expect(body.outcome.grievanceId).toBe("grev-001");
      expect(body.outcome.outcomeType).toBe("settled");
      expect(body.outcome.recordedById).toBe("user-president-243");
    });

    it("forbids a steward from recording an outcome on an unassigned case", async () => {
      authMock.mockResolvedValue(stewardSession());
      const res = await recordOutcome(
        jsonRequest({
          outcomeType: "withdrawn",
          decidedAt: "2026-09-01T12:00:00.000Z",
        }),
        params("grev-002"),
      );
      expect(res.status).toBe(403);
    });
  });
});
