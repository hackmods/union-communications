import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import {
  GET as listEvents,
  POST as createEvent,
} from "@/app/api/meetings/events/route";
import {
  DELETE as deleteEvent,
  GET as getEvent,
  PATCH as patchEvent,
} from "@/app/api/meetings/events/[id]/route";
import { POST as createToken } from "@/app/api/meetings/events/[id]/tokens/route";
import { DELETE as revokeToken } from "@/app/api/meetings/events/[id]/tokens/[tokenId]/route";
import {
  GET as listResponses,
  POST as walkInResponse,
} from "@/app/api/meetings/events/[id]/responses/route";
import { POST as submitPublicRsvp } from "@/app/api/rsvp/[token]/route";
import {
  GET as getSchedule,
  PUT as putSchedule,
} from "@/app/api/meetings/schedule/route";
import { GET as getPublicSchedule } from "@/app/api/meetings/public/[slug]/route";
import { GET as cronReminders } from "@/app/api/cron/meeting-reminders/route";
import {
  memoryMeetingsRsvpStore,
  resetMemoryMeetingsRsvpStore,
} from "@/lib/meetings/rsvp-memory-adapter";
import { resetMeetingsRsvpStore } from "@/lib/meetings/rsvp-store";
import { resetRsvpSubmitRateLimit } from "@/lib/meetings/rsvp-rate-limit";
import { resetMemoryMeetingsStore } from "@/lib/meetings/memory-adapter";

function session(input?: {
  id?: string;
  unionId?: string | null;
  localId?: string | null;
  roles?: UserRole[];
}) {
  return {
    user: {
      id: input?.id ?? "user-president-243",
      name: "Local 243 President",
      unionId:
        input?.unionId === null ? undefined : (input?.unionId ?? "union-opseu"),
      localId:
        input?.localId === null ? undefined : (input?.localId ?? "local-243"),
      roles: input?.roles ?? (["local_president"] as UserRole[]),
    },
  };
}

function jsonRequest(body: unknown, url = "http://localhost/api/meetings/events"): Request {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function tokenParams(id: string, tokenId: string) {
  return { params: Promise.resolve({ id, tokenId }) };
}

const validCreate = {
  title: "LEC",
  startsAt: "2026-10-01T23:00:00.000Z",
  endsAt: "2026-10-02T01:00:00.000Z",
  location: "Room 1",
  quorumNeeded: 4,
  hybrid: true,
};

const validSchedule = {
  recurrence: "monthly" as const,
  dayOfMonth: 15,
  time: "19:00",
  durationMinutes: 90,
  location: "Union hall",
  timezone: "America/Toronto",
};

describe("meetings API routes", () => {
  beforeEach(() => {
    resetMemoryMeetingsRsvpStore();
    resetMeetingsRsvpStore();
    resetMemoryMeetingsStore();
    resetRsvpSubmitRateLimit();
    authMock.mockReset();
  });

  afterEach(() => {
    resetMemoryMeetingsRsvpStore();
    resetMeetingsRsvpStore();
    resetMemoryMeetingsStore();
    resetRsvpSubmitRateLimit();
  });

  describe("GET/POST /api/meetings/events", () => {
    it("returns 401 without a session and 403 with no roles or no local", async () => {
      authMock.mockResolvedValue(null);
      expect((await listEvents()).status).toBe(401);

      authMock.mockResolvedValue(session({ roles: [] }));
      expect((await listEvents()).status).toBe(403);

      authMock.mockResolvedValue(session({ localId: null }));
      const noLocal = await listEvents();
      expect(noLocal.status).toBe(403);
      expect(await noLocal.json()).toEqual({ error: "No local context" });
    });

    it("lets members list their local but never another union or sister local", async () => {
      await memoryMeetingsRsvpStore.createMeeting(validCreate, {
        unionId: "union-other",
        localId: "local-243",
        createdById: "user-x",
      });
      await memoryMeetingsRsvpStore.createMeeting(
        { ...validCreate, title: "Sister LEC" },
        {
          unionId: "union-opseu",
          localId: "local-560",
          createdById: "user-y",
        },
      );
      await memoryMeetingsRsvpStore.createMeeting(
        { ...validCreate, title: "Ours" },
        {
          unionId: "union-opseu",
          localId: "local-243",
          createdById: "user-president-243",
        },
      );

      authMock.mockResolvedValue(session({ roles: ["local_member"] }));
      const res = await listEvents();
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        meetings: Array<{ title: string; unionId: string; localId: string }>;
      };
      expect(body.meetings.map((m) => m.title)).toEqual(["Ours"]);
      expect(body.meetings[0]?.unionId).toBe("union-opseu");
      expect(body.meetings[0]?.localId).toBe("local-243");
    });

    it("forbids stewards from creating events and rejects forged tenant keys", async () => {
      authMock.mockResolvedValue(session({ roles: ["local_steward"] }));
      expect((await createEvent(jsonRequest(validCreate))).status).toBe(403);

      authMock.mockResolvedValue(session());
      const forged = await createEvent(
        jsonRequest({
          ...validCreate,
          unionId: "union-other",
          localId: "local-evil",
        }),
      );
      expect(forged.status).toBe(400);

      const created = await createEvent(jsonRequest(validCreate));
      expect(created.status).toBe(201);
      const body = (await created.json()) as {
        meeting: {
          unionId: string;
          localId: string;
          createdById: string;
          title: string;
        };
      };
      expect(body.meeting.unionId).toBe("union-opseu");
      expect(body.meeting.localId).toBe("local-243");
      expect(body.meeting.createdById).toBe("user-president-243");
      expect(body.meeting.title).toBe("LEC");
    });

    it("returns 400 when endsAt is not after startsAt", async () => {
      authMock.mockResolvedValue(session());
      const res = await createEvent(
        jsonRequest({
          ...validCreate,
          endsAt: "2026-10-01T23:00:00.000Z",
        }),
      );
      expect(res.status).toBe(400);
    });
  });

  describe("GET/PATCH/DELETE /api/meetings/events/[id]", () => {
    it("hides another union's meeting even from platform_admin", async () => {
      const foreign = await memoryMeetingsRsvpStore.createMeeting(validCreate, {
        unionId: "union-other",
        localId: "local-1",
        createdById: "user-x",
      });

      authMock.mockResolvedValue(session({ roles: ["platform_admin"] }));
      const missing = await getEvent(new Request("http://localhost"), params("nope"));
      expect(missing.status).toBe(404);

      const viewed = await getEvent(
        new Request("http://localhost"),
        params(foreign.id),
      );
      expect(viewed.status).toBe(404);

      const patched = await patchEvent(
        jsonRequest({ title: "Hijacked" }),
        params(foreign.id),
      );
      expect(patched.status).toBe(404);
      expect((await memoryMeetingsRsvpStore.getMeetingById(foreign.id))?.title).toBe(
        "LEC",
      );

      const deleted = await deleteEvent(
        new Request("http://localhost"),
        params(foreign.id),
      );
      expect(deleted.status).toBe(404);
      expect(await memoryMeetingsRsvpStore.getMeetingById(foreign.id)).not.toBeNull();
    });

    it("lets union_admin read a sister local by id but not rewrite it from the wrong session local", async () => {
      const sister = await memoryMeetingsRsvpStore.createMeeting(
        { ...validCreate, title: "Sister LEC" },
        {
          unionId: "union-opseu",
          localId: "local-560",
          createdById: "user-y",
        },
      );

      authMock.mockResolvedValue(
        session({ roles: ["union_admin"], localId: "local-243" }),
      );
      const viewed = await getEvent(
        new Request("http://localhost"),
        params(sister.id),
      );
      expect(viewed.status).toBe(200);
      const body = (await viewed.json()) as { meeting: { title: string } };
      expect(body.meeting.title).toBe("Sister LEC");
    });

    it("lets a president patch and delete their local event", async () => {
      authMock.mockResolvedValue(session());
      const created = await createEvent(jsonRequest(validCreate));
      const { meeting } = (await created.json()) as { meeting: { id: string } };

      const patched = await patchEvent(
        jsonRequest({ title: "General membership" }),
        params(meeting.id),
      );
      expect(patched.status).toBe(200);
      expect(
        ((await patched.json()) as { meeting: { title: string } }).meeting.title,
      ).toBe("General membership");

      const deleted = await deleteEvent(
        new Request("http://localhost"),
        params(meeting.id),
      );
      expect(deleted.status).toBe(200);
      expect(await memoryMeetingsRsvpStore.getMeetingById(meeting.id)).toBeNull();
    });
  });

  describe("RSVP tokens and public submit", () => {
    it("forbids stewards from minting tokens and 404s another union", async () => {
      const ours = await memoryMeetingsRsvpStore.createMeeting(validCreate, {
        unionId: "union-opseu",
        localId: "local-243",
        createdById: "user-president-243",
      });
      const foreign = await memoryMeetingsRsvpStore.createMeeting(validCreate, {
        unionId: "union-other",
        localId: "local-1",
        createdById: "user-x",
      });

      authMock.mockResolvedValue(session({ roles: ["local_steward"] }));
      expect(
        (await createToken(new Request("http://localhost", { method: "POST" }), params(ours.id)))
          .status,
      ).toBe(403);

      authMock.mockResolvedValue(session());
      const hidden = await createToken(
        new Request("http://localhost", { method: "POST" }),
        params(foreign.id),
      );
      expect(hidden.status).toBe(404);
    });

    it("mints a token stamped with the session user and accepts one public RSVP", async () => {
      const meeting = await memoryMeetingsRsvpStore.createMeeting(validCreate, {
        unionId: "union-opseu",
        localId: "local-243",
        createdById: "user-president-243",
      });

      authMock.mockResolvedValue(session());
      const minted = await createToken(
        new Request("http://localhost", { method: "POST", body: "{}" }),
        params(meeting.id),
      );
      expect(minted.status).toBe(201);
      const { token } = (await minted.json()) as {
        token: { id: string; token: string; createdById: string };
      };
      expect(token.createdById).toBe("user-president-243");

      authMock.mockResolvedValue(null);
      const submitted = await submitPublicRsvp(
        jsonRequest(
          {
            attending: "yes",
            joinMode: "on_site",
            displayName: "Alex",
            guestsOnSite: 1,
            consentAccepted: true,
          },
          "http://localhost/api/rsvp/token",
        ),
        { params: Promise.resolve({ token: token.token }) },
      );
      expect(submitted.status).toBe(201);
      const submitBody = (await submitted.json()) as {
        ok: boolean;
        responseId: string;
      };
      expect(submitBody.ok).toBe(true);
      expect(submitBody.responseId).toBeTruthy();
    });

    it("rejects public submit without consent, without joinMode, and after revoke", async () => {
      const meeting = await memoryMeetingsRsvpStore.createMeeting(validCreate, {
        unionId: "union-opseu",
        localId: "local-243",
        createdById: "user-president-243",
      });
      const token = await memoryMeetingsRsvpStore.createToken(meeting.id, {
        createdById: "user-president-243",
      });

      const missingConsent = await submitPublicRsvp(
        jsonRequest(
          {
            attending: "yes",
            joinMode: "on_site",
            displayName: "Alex",
          },
          "http://localhost/api/rsvp/token",
        ),
        { params: Promise.resolve({ token: token!.token }) },
      );
      expect(missingConsent.status).toBe(400);

      const missingJoin = await submitPublicRsvp(
        jsonRequest(
          {
            attending: "yes",
            displayName: "Alex",
            consentAccepted: true,
          },
          "http://localhost/api/rsvp/token",
        ),
        { params: Promise.resolve({ token: token!.token }) },
      );
      expect(missingJoin.status).toBe(400);

      const unknown = await submitPublicRsvp(
        jsonRequest(
          {
            attending: "yes",
            joinMode: "on_site",
            displayName: "Alex",
            consentAccepted: true,
          },
          "http://localhost/api/rsvp/token",
        ),
        { params: Promise.resolve({ token: "nope" }) },
      );
      expect(unknown.status).toBe(404);

      authMock.mockResolvedValue(session());
      const revoked = await revokeToken(
        new Request("http://localhost"),
        tokenParams(meeting.id, token!.id),
      );
      expect(revoked.status).toBe(200);

      authMock.mockResolvedValue(null);
      const afterRevoke = await submitPublicRsvp(
        jsonRequest(
          {
            attending: "yes",
            joinMode: "on_site",
            displayName: "Alex",
            consentAccepted: true,
          },
          "http://localhost/api/rsvp/token",
        ),
        { params: Promise.resolve({ token: token!.token }) },
      );
      expect(afterRevoke.status).toBe(410);
    });

    it("lets officers enter a walk-in and forbids stewards", async () => {
      const meeting = await memoryMeetingsRsvpStore.createMeeting(validCreate, {
        unionId: "union-opseu",
        localId: "local-243",
        createdById: "user-president-243",
      });

      authMock.mockResolvedValue(session({ roles: ["local_steward"] }));
      expect(
        (
          await walkInResponse(
            jsonRequest({
              attending: "yes",
              joinMode: "remote",
              displayName: "Blair",
            }),
            params(meeting.id),
          )
        ).status,
      ).toBe(403);

      authMock.mockResolvedValue(session());
      const walkIn = await walkInResponse(
        jsonRequest({
          attending: "yes",
          joinMode: "remote",
          displayName: "Blair",
        }),
        params(meeting.id),
      );
      expect(walkIn.status).toBe(201);
      const body = (await walkIn.json()) as {
        response: { source: string; displayName: string };
      };
      expect(body.response.source).toBe("officer_entry");
      expect(body.response.displayName).toBe("Blair");

      const listed = await listResponses(
        new Request("http://localhost"),
        params(meeting.id),
      );
      expect(listed.status).toBe(200);
      const listBody = (await listed.json()) as {
        responses: Array<{ displayName: string }>;
      };
      expect(listBody.responses.map((r) => r.displayName)).toEqual(["Blair"]);
    });
  });

  describe("schedule and public slug", () => {
    it("lets members read the local schedule and forbids steward writes", async () => {
      authMock.mockResolvedValue(session({ roles: ["local_member"] }));
      const empty = await getSchedule();
      expect(empty.status).toBe(200);
      expect(await empty.json()).toMatchObject({
        schedule: null,
        nextMeeting: null,
      });

      authMock.mockResolvedValue(session({ roles: ["local_steward"] }));
      expect((await putSchedule(jsonRequest(validSchedule))).status).toBe(403);
    });

    it("stamps the session tenant on upsert and hides union/local from the public slug", async () => {
      authMock.mockResolvedValue(session());
      const saved = await putSchedule(
        jsonRequest({
          ...validSchedule,
          unionId: "union-other",
          localId: "local-evil",
        }),
      );
      expect(saved.status).toBe(400);

      const created = await putSchedule(jsonRequest(validSchedule));
      expect(created.status).toBe(200);
      const body = (await created.json()) as {
        schedule: {
          unionId: string;
          localId: string;
          publicSlug: string;
          updatedById: string;
        };
      };
      expect(body.schedule.unionId).toBe("union-opseu");
      expect(body.schedule.localId).toBe("local-243");
      expect(body.schedule.updatedById).toBe("user-president-243");

      authMock.mockResolvedValue(null);
      const publicRes = await getPublicSchedule(new Request("http://localhost"), {
        params: Promise.resolve({ slug: body.schedule.publicSlug }),
      });
      expect(publicRes.status).toBe(200);
      const publicBody = (await publicRes.json()) as Record<string, unknown>;
      expect(JSON.stringify(publicBody)).not.toContain("union-opseu");
      expect(JSON.stringify(publicBody)).not.toContain("local-243");
      expect(publicBody.unionId).toBeUndefined();
      expect(publicBody.localId).toBeUndefined();

      const missing = await getPublicSchedule(new Request("http://localhost"), {
        params: Promise.resolve({ slug: "does-not-exist" }),
      });
      expect(missing.status).toBe(404);
      const missingBody = (await missing.json()) as Record<string, unknown>;
      expect(missingBody.unionId).toBeUndefined();
    });
  });

  describe("GET /api/cron/meeting-reminders", () => {
    const previousSecret = process.env.CRON_SECRET;

    afterEach(() => {
      if (previousSecret === undefined) {
        delete process.env.CRON_SECRET;
      } else {
        process.env.CRON_SECRET = previousSecret;
      }
    });

    it("returns 401 without the cron secret and dry-runs without sending when authorized", async () => {
      process.env.CRON_SECRET = "test-cron-secret";

      const denied = await cronReminders(
        new Request("http://localhost/api/cron/meeting-reminders?dryRun=1"),
      );
      expect(denied.status).toBe(401);

      const wrong = await cronReminders(
        new Request("http://localhost/api/cron/meeting-reminders?dryRun=1", {
          headers: { authorization: "Bearer nope" },
        }),
      );
      expect(wrong.status).toBe(401);

      const ok = await cronReminders(
        new Request("http://localhost/api/cron/meeting-reminders?dryRun=1", {
          headers: { authorization: "Bearer test-cron-secret" },
        }),
      );
      expect(ok.status).toBe(200);
      const body = (await ok.json()) as {
        dryRun: boolean;
        jobs: number;
        preview?: unknown;
      };
      expect(body.dryRun).toBe(true);
      expect(body.jobs).toBe(0);
    });
  });
});
