import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import {
  GET as listPolls,
  POST as createPoll,
} from "@/app/api/polls/route";
import {
  GET as getPoll,
  PATCH as patchPoll,
} from "@/app/api/polls/id/[id]/route";
import { GET as exportPoll } from "@/app/api/polls/id/[id]/export/route";
import { POST as submitPollResponse } from "@/app/api/polls/[slug]/responses/route";
import {
  memoryPollsStore,
  resetMemoryPollsStore,
} from "./memory-adapter";
import { resetPollsStore } from "./store";
import { resetPollSubmitRateLimit } from "./rate-limit";

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

function jsonRequest(body: unknown): Request {
  return {
    json: async () => body,
  } as Request;
}

function listRequest(query = ""): Request {
  return new Request(`http://localhost/api/polls${query}`);
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function slugParams(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

function publicSubmitRequest(body: unknown, ip = "203.0.113.10"): Request {
  return new Request("http://localhost/api/polls/meeting-rsvp/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

const validCreate = {
  slug: "meeting-rsvp",
  title: "Membership meeting RSVP",
  questions: [
    {
      id: "q1",
      text: "Will you attend?",
      type: "single_choice" as const,
      options: ["Yes", "No"],
    },
  ],
};

async function seedPoll(input?: {
  unionId?: string;
  localId?: string;
  slug?: string;
  status?: "open" | "closed";
  createdById?: string;
}) {
  return memoryPollsStore.create(
    {
      ...validCreate,
      slug: input?.slug ?? `poll-${Math.random().toString(36).slice(2, 8)}`,
      status: input?.status ?? "open",
    },
    {
      unionId: input?.unionId ?? "union-opseu",
      localId: input?.localId ?? "local-243",
      createdById: input?.createdById ?? "user-president-243",
    },
  );
}

describe("polls API routes", () => {
  beforeEach(() => {
    resetMemoryPollsStore();
    resetPollsStore();
    resetPollSubmitRateLimit();
    authMock.mockReset();
  });

  afterEach(() => {
    resetMemoryPollsStore();
    resetPollsStore();
    resetPollSubmitRateLimit();
  });

  describe("GET/POST /api/polls", () => {
    it("returns 401 without a session and 403 for members", async () => {
      authMock.mockResolvedValue(null);
      expect((await listPolls(listRequest())).status).toBe(401);

      authMock.mockResolvedValue(session({ roles: ["local_member"] }));
      const forbidden = await listPolls(listRequest());
      expect(forbidden.status).toBe(403);
      expect(await forbidden.json()).toEqual({ error: "Forbidden" });
      expect(
        (await createPoll(jsonRequest(validCreate))).status,
      ).toBe(403);
    });

    it("does not list another union or another local for a president", async () => {
      await seedPoll({ slug: "same-local", unionId: "union-opseu", localId: "local-243" });
      await seedPoll({
        slug: "other-union",
        unionId: "union-other",
        localId: "local-243",
      });
      await seedPoll({
        slug: "other-local",
        unionId: "union-opseu",
        localId: "local-560",
      });

      authMock.mockResolvedValue(session());
      const res = await listPolls(listRequest());
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        polls: Array<{ slug: string; unionId: string; localId: string }>;
      };
      expect(body.polls.every((p) => p.unionId === "union-opseu")).toBe(true);
      expect(body.polls.every((p) => p.localId === "local-243")).toBe(true);
      expect(body.polls.map((p) => p.slug)).toEqual(["same-local"]);
    });

    it("ignores an unknown status query", async () => {
      await seedPoll({ slug: "open-poll", status: "open" });
      await seedPoll({ slug: "closed-poll", status: "closed" });
      authMock.mockResolvedValue(session());
      const res = await listPolls(listRequest("?status=draft"));
      expect(res.status).toBe(200);
      const body = (await res.json()) as { polls: Array<{ slug: string }> };
      expect(body.polls.map((p) => p.slug).sort()).toEqual([
        "closed-poll",
        "open-poll",
      ]);
    });

    it("rejects forged tenant keys and stamps the session union/local/creator", async () => {
      authMock.mockResolvedValue(session());
      const forged = await createPoll(
        jsonRequest({
          ...validCreate,
          unionId: "union-other",
          localId: "local-evil",
          createdById: "user-attacker",
        }),
      );
      expect(forged.status).toBe(400);

      const created = await createPoll(jsonRequest(validCreate));
      expect(created.status).toBe(201);
      const body = (await created.json()) as {
        poll: {
          unionId: string;
          localId: string;
          slug: string;
          createdById: string;
          status: string;
        };
      };
      expect(body.poll.unionId).toBe("union-opseu");
      expect(body.poll.localId).toBe("local-243");
      expect(body.poll.slug).toBe("meeting-rsvp");
      expect(body.poll.createdById).toBe("user-president-243");
      expect(body.poll.status).toBe("open");
    });

    it("returns 409 when the slug is already in use", async () => {
      authMock.mockResolvedValue(session());
      expect((await createPoll(jsonRequest(validCreate))).status).toBe(201);
      const dup = await createPoll(jsonRequest(validCreate));
      expect(dup.status).toBe(409);
      expect(await dup.json()).toEqual({ error: "Slug already in use" });
    });
  });

  describe("GET/PATCH/export /api/polls/id/[id]", () => {
    it("returns 404 for a missing id and for another union, including platform_admin", async () => {
      const foreign = await seedPoll({
        unionId: "union-other",
        localId: "local-1",
        slug: "foreign-poll",
      });
      authMock.mockResolvedValue(session({ roles: ["platform_admin"] }));

      expect(
        (await getPoll(new Request("http://localhost"), params("poll-missing")))
          .status,
      ).toBe(404);

      const viewed = await getPoll(
        new Request("http://localhost"),
        params(foreign.id),
      );
      expect(viewed.status).toBe(404);
      expect(await viewed.json()).toEqual({ error: "Not found" });

      const patched = await patchPoll(
        jsonRequest({ status: "closed" }),
        params(foreign.id),
      );
      expect(patched.status).toBe(404);
      expect((await memoryPollsStore.getById(foreign.id))?.status).toBe("open");

      const exported = await exportPoll(
        new Request("http://localhost/api/polls/id/x/export"),
        params(foreign.id),
      );
      expect(exported.status).toBe(404);
    });

    it("exports CSV for a same-local poll and closes it on PATCH", async () => {
      const poll = await seedPoll({ slug: "export-me" });
      await memoryPollsStore.submitResponse(
        poll.id,
        { answers: { q1: "Yes" }, consentAccepted: true },
        {},
      );

      authMock.mockResolvedValue(session());
      const csv = await exportPoll(
        new Request("http://localhost/api/polls/id/x/export?format=csv"),
        params(poll.id),
      );
      expect(csv.status).toBe(200);
      expect(csv.headers.get("content-type")).toContain("text/csv");
      expect(await csv.text()).toContain("Will you attend?");

      const closed = await patchPoll(
        jsonRequest({ status: "closed" }),
        params(poll.id),
      );
      expect(closed.status).toBe(200);
      expect((await memoryPollsStore.getById(poll.id))?.status).toBe("closed");
    });
  });

  describe("POST /api/polls/[slug]/responses", () => {
    it("returns 404 for a missing or closed poll without revealing which", async () => {
      await seedPoll({ slug: "closed-now", status: "closed" });
      const missing = await submitPollResponse(
        publicSubmitRequest({
          answers: { q1: "Yes" },
          consentAccepted: true,
        }),
        slugParams("no-such-poll"),
      );
      expect(missing.status).toBe(404);
      expect(await missing.json()).toEqual({ error: "Poll not found" });

      const closed = await submitPollResponse(
        publicSubmitRequest({
          answers: { q1: "Yes" },
          consentAccepted: true,
        }),
        slugParams("closed-now"),
      );
      expect(closed.status).toBe(404);
      expect(await closed.json()).toEqual({ error: "Poll not found" });
    });

    it("requires consent, rejects invalid options, then records an anonymous response", async () => {
      await seedPoll({ slug: "meeting-rsvp" });

      const noConsent = await submitPollResponse(
        publicSubmitRequest({
          answers: { q1: "Yes" },
          consentAccepted: false,
        }),
        slugParams("meeting-rsvp"),
      );
      expect(noConsent.status).toBe(400);
      expect(await noConsent.json()).toEqual({ error: "Consent required" });

      const badOption = await submitPollResponse(
        publicSubmitRequest({
          answers: { q1: "Maybe" },
          consentAccepted: true,
        }),
        slugParams("meeting-rsvp"),
      );
      expect(badOption.status).toBe(400);

      const ok = await submitPollResponse(
        publicSubmitRequest({
          answers: { q1: "Yes" },
          consentAccepted: true,
        }),
        slugParams("meeting-rsvp"),
      );
      expect(ok.status).toBe(201);
      const body = (await ok.json()) as {
        ok: boolean;
        responseId: string;
        ipHash?: string;
      };
      expect(body.ok).toBe(true);
      expect(body.responseId).toBeTruthy();
      expect(body.ipHash).toBeUndefined();

      const stored = await memoryPollsStore.listResponses(
        (await memoryPollsStore.getBySlug("meeting-rsvp"))!.id,
      );
      expect(stored).toHaveLength(1);
      expect(stored[0]?.answers.q1).toBe("Yes");
      expect(stored[0]?.ipHash).toBeTruthy();
      expect(stored[0]?.ipHash).not.toBe("203.0.113.10");
    });

    it("returns 429 after the per-IP submit window", async () => {
      await seedPoll({ slug: "meeting-rsvp" });
      const payload = { answers: { q1: "Yes" }, consentAccepted: true };
      for (let i = 0; i < 8; i += 1) {
        expect(
          (
            await submitPollResponse(
              publicSubmitRequest(payload, "198.51.100.9"),
              slugParams("meeting-rsvp"),
            )
          ).status,
        ).toBe(201);
      }
      const blocked = await submitPollResponse(
        publicSubmitRequest(payload, "198.51.100.9"),
        slugParams("meeting-rsvp"),
      );
      expect(blocked.status).toBe(429);
    });
  });
});
