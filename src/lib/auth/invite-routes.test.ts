import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UserRole } from "@/types/tenant";

const { authMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

import { GET as listInvites, POST as createInviteRoute } from "@/app/api/invites/route";
import {
  GET as getInviteByToken,
  POST as acceptInviteRoute,
} from "@/app/api/invites/[token]/route";
import { POST as resendInviteEmail } from "@/app/api/invites/[token]/email/route";
import {
  acceptInvite,
  createInvite,
  resetInviteStoreForTests,
} from "@/lib/auth/invites";
import { resetTenantOverlayForTests } from "@/lib/tenant/overlay";

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

function jsonRequest(body: unknown, url = "http://localhost/api/invites"): Request {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function params(token: string) {
  return { params: Promise.resolve({ token }) };
}

const validCreate = {
  email: "new.steward@example.test",
  name: "New Steward",
  roles: ["local_steward"],
};

describe("invite API routes", () => {
  beforeEach(() => {
    resetInviteStoreForTests();
    resetTenantOverlayForTests();
    authMock.mockReset();
  });

  afterEach(() => {
    resetInviteStoreForTests();
    resetTenantOverlayForTests();
  });

  describe("GET /api/invites", () => {
    it("returns 401 without a session and 403 for members and stewards", async () => {
      authMock.mockResolvedValue(null);
      expect((await listInvites()).status).toBe(401);

      authMock.mockResolvedValue(session({ roles: ["local_member"] }));
      expect((await listInvites()).status).toBe(403);

      authMock.mockResolvedValue(session({ roles: ["local_steward"] }));
      const forbidden = await listInvites();
      expect(forbidden.status).toBe(403);
      expect(await forbidden.json()).toEqual({ error: "Forbidden" });
    });

    it("returns 400 when the session has no union", async () => {
      authMock.mockResolvedValue(
        session({ unionId: null, roles: ["union_admin"] }),
      );
      const res = await listInvites();
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "Missing union context" });
    });

    it("never lists another union, and presidents do not see sister locals", async () => {
      await createInvite({
        email: "foreign@example.test",
        name: "Foreign",
        unionId: "union-other",
        localId: "local-243",
        roles: ["local_steward"],
        invitedById: "user-x",
      });
      await createInvite({
        email: "sister@example.test",
        name: "Sister local",
        unionId: "union-opseu",
        localId: "local-560",
        roles: ["local_member"],
        invitedById: "user-y",
      });
      const mine = await createInvite({
        email: "mine@example.test",
        name: "Mine",
        unionId: "union-opseu",
        localId: "local-243",
        roles: ["local_steward"],
        invitedById: "user-president-243",
      });

      authMock.mockResolvedValue(session());
      const res = await listInvites();
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        invites: Array<{ email: string; token?: string; status: string }>;
      };
      expect(body.invites.map((row) => row.email)).toEqual(["mine@example.test"]);
      expect(body.invites[0]?.token).toBe(mine.token);
    });

    it("lets union_admin list every local in the union, still excluding other unions", async () => {
      await createInvite({
        email: "foreign@example.test",
        name: "Foreign",
        unionId: "union-other",
        localId: "local-243",
        roles: ["local_steward"],
        invitedById: "user-x",
      });
      await createInvite({
        email: "sister@example.test",
        name: "Sister local",
        unionId: "union-opseu",
        localId: "local-560",
        roles: ["local_member"],
        invitedById: "user-y",
      });

      authMock.mockResolvedValue(
        session({ roles: ["union_admin"], localId: null }),
      );
      const res = await listInvites();
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        invites: Array<{ email: string }>;
      };
      expect(body.invites.map((row) => row.email)).toEqual([
        "sister@example.test",
      ]);
    });

    it("omits the accept token after the invite is accepted", async () => {
      const invite = await createInvite({
        email: "accepted@example.test",
        name: "Accepted",
        unionId: "union-opseu",
        localId: "local-243",
        roles: ["local_steward"],
        invitedById: "user-president-243",
      });
      await acceptInvite(invite.token, "securepass1");

      authMock.mockResolvedValue(session());
      const res = await listInvites();
      const body = (await res.json()) as {
        invites: Array<{ email: string; token?: string; status: string }>;
      };
      expect(body.invites).toHaveLength(1);
      expect(body.invites[0]?.status).toBe("accepted");
      expect(body.invites[0]?.token).toBeUndefined();
    });
  });

  describe("POST /api/invites", () => {
    it("rejects forged tenant keys and stamps the session union and local", async () => {
      authMock.mockResolvedValue(session());
      const created = await createInviteRoute(
        jsonRequest({
          ...validCreate,
          unionId: "union-other",
          localId: "local-560",
        }),
      );
      expect(created.status).toBe(200);
      const body = (await created.json()) as {
        email: string;
        localId: string;
        token: string;
      };
      expect(body.email).toBe("new.steward@example.test");
      expect(body.localId).toBe("local-243");
      expect(body.token).toBeTruthy();

      authMock.mockResolvedValue(session({ roles: ["union_admin"] }));
      const listed = await listInvites();
      const listBody = (await listed.json()) as {
        invites: Array<{ unionId?: string; localId: string; email: string }>;
      };
      expect(
        listBody.invites.some((row) => row.email === "new.steward@example.test"),
      ).toBe(true);
    });

    it("returns 403 when a president tries to invite another president", async () => {
      authMock.mockResolvedValue(session());
      const res = await createInviteRoute(
        jsonRequest({
          email: "pres@example.test",
          name: "Other Pres",
          roles: ["local_president"],
        }),
      );
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: "Forbidden roles" });
    });

    it("returns 400 without a local when the actor is not elevated", async () => {
      authMock.mockResolvedValue(session({ localId: null }));
      const res = await createInviteRoute(jsonRequest(validCreate));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "Missing local context" });
    });

    it("returns 400 for invalid JSON and malformed bodies", async () => {
      authMock.mockResolvedValue(session());
      const badJson = await createInviteRoute({
        json: async () => {
          throw new SyntaxError("bad");
        },
      } as Request);
      expect(badJson.status).toBe(400);

      const badBody = await createInviteRoute(
        jsonRequest({ email: "not-an-email", name: "X", roles: ["local_steward"] }),
      );
      expect(badBody.status).toBe(400);
    });

    it("does not attach SMTP diagnostics when invite email is skipped", async () => {
      authMock.mockResolvedValue(session());
      const res = await createInviteRoute(
        jsonRequest({ ...validCreate, sendEmail: true }),
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        emailSent?: boolean;
        emailReason?: string;
        smtpHost?: string;
        SMTP_PASS?: string;
      };
      expect(body.emailSent).toBe(false);
      expect(body.emailReason).toBe("not_configured");
      expect(body.smtpHost).toBeUndefined();
      expect(body.SMTP_PASS).toBeUndefined();
    });
  });

  describe("GET/POST /api/invites/[token]", () => {
    it("returns 404 for an unknown token without requiring a session", async () => {
      authMock.mockResolvedValue(null);
      const res = await getInviteByToken(
        new Request("http://localhost"),
        params("nope"),
      );
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "Not found" });
    });

    it("exposes status and roles but not union or local ids", async () => {
      const invite = await createInvite({
        email: "preview@example.test",
        name: "Preview",
        unionId: "union-opseu",
        localId: "local-243",
        roles: ["local_steward"],
        invitedById: "user-president-243",
      });

      authMock.mockResolvedValue(null);
      const res = await getInviteByToken(
        new Request("http://localhost"),
        params(invite.token),
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toMatchObject({
        email: "preview@example.test",
        name: "Preview",
        status: "pending",
        roles: ["local_steward"],
      });
      expect(body.unionId).toBeUndefined();
      expect(body.localId).toBeUndefined();
      expect(body.token).toBeUndefined();
    });

    it("marks a pending invite expired when the TTL has elapsed", async () => {
      const invite = await createInvite({
        email: "late@example.test",
        name: "Late",
        unionId: "union-opseu",
        localId: "local-243",
        roles: ["local_member"],
        invitedById: "user-president-243",
        ttlHours: -1,
      });

      const res = await getInviteByToken(
        new Request("http://localhost"),
        params(invite.token),
      );
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ status: "expired" });
    });

    it("accepts a pending invite once and rejects a second attempt", async () => {
      const invite = await createInvite({
        email: "once@example.test",
        name: "Once",
        unionId: "union-opseu",
        localId: "local-243",
        roles: ["local_steward"],
        invitedById: "user-president-243",
      });

      const first = await acceptInviteRoute(
        jsonRequest({ password: "securepass1" }),
        params(invite.token),
      );
      expect(first.status).toBe(200);
      expect(await first.json()).toMatchObject({
        ok: true,
        email: "once@example.test",
      });

      const second = await acceptInviteRoute(
        jsonRequest({ password: "securepass1" }),
        params(invite.token),
      );
      expect(second.status).toBe(400);
      expect(await second.json()).toEqual({
        error: "Invite is no longer pending",
      });
    });

    it("rejects invalid JSON and short passwords", async () => {
      const invite = await createInvite({
        email: "pwd@example.test",
        name: "Pwd",
        unionId: "union-opseu",
        localId: "local-243",
        roles: ["local_member"],
        invitedById: "user-president-243",
      });

      const badJson = await acceptInviteRoute(
        { json: async () => { throw new SyntaxError("bad"); } } as Request,
        params(invite.token),
      );
      expect(badJson.status).toBe(400);

      const short = await acceptInviteRoute(
        jsonRequest({ password: "short" }),
        params(invite.token),
      );
      expect(short.status).toBe(400);
    });
  });

  describe("POST /api/invites/[token]/email", () => {
    it("returns 401/403 and never resends another union's invite", async () => {
      const foreign = await createInvite({
        email: "foreign@example.test",
        name: "Foreign",
        unionId: "union-other",
        localId: "local-243",
        roles: ["local_steward"],
        invitedById: "user-x",
      });
      const req = new Request("http://localhost/api/invites/token/email", {
        method: "POST",
      });

      authMock.mockResolvedValue(null);
      expect((await resendInviteEmail(req, params(foreign.token))).status).toBe(
        401,
      );

      authMock.mockResolvedValue(session({ roles: ["local_steward"] }));
      expect((await resendInviteEmail(req, params(foreign.token))).status).toBe(
        403,
      );

      authMock.mockResolvedValue(session());
      const hidden = await resendInviteEmail(req, params(foreign.token));
      expect(hidden.status).toBe(404);
      expect(await hidden.json()).toEqual({ error: "Not found" });
    });

    it("refuses accepted invites and reports skipped mail without SMTP secrets", async () => {
      const pending = await createInvite({
        email: "mail@example.test",
        name: "Mail",
        unionId: "union-opseu",
        localId: "local-243",
        roles: ["local_steward"],
        invitedById: "user-president-243",
      });
      const req = new Request("http://localhost/api/invites/token/email", {
        method: "POST",
      });

      authMock.mockResolvedValue(session());
      const skipped = await resendInviteEmail(req, params(pending.token));
      expect(skipped.status).toBe(503);
      const skippedBody = (await skipped.json()) as Record<string, unknown>;
      expect(skippedBody.ok).toBe(false);
      expect(skippedBody.reason).toBe("not_configured");
      expect(skippedBody.SMTP_PASS).toBeUndefined();

      await acceptInvite(pending.token, "securepass1");
      const accepted = await resendInviteEmail(req, params(pending.token));
      expect(accepted.status).toBe(400);
      expect(await accepted.json()).toEqual({
        error: "Invite is no longer pending",
      });
    });
  });
});
