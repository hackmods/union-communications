import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import type { UserRole } from "@/types/tenant";
import { actorFromSession } from "@/lib/authorization/model";
import type { AccessRequest } from "@/types/access-request";
import { accessRequestMemberView } from "@/types/access-request";
import { accessRequestSchema } from "@/lib/access-requests/validation";

const { authMock, resolveActorMock, sendEmailMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  resolveActorMock: vi.fn(),
  sendEmailMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/authorization/resolve-actor", () => ({
  resolveAuthorizationActor: resolveActorMock,
}));

vi.mock("@/lib/email/send", () => ({
  sendTransactionalEmail: sendEmailMock,
}));

import {
  GET as listMemberAccess,
  POST as submitAccessRequest,
} from "@/app/api/access-requests/route";
import { PATCH as patchMemberAccess } from "@/app/api/access-requests/[id]/route";
import { GET as listSiteAdminAccess } from "@/app/api/site-admin/access-requests/route";
import { PATCH as patchSiteAdminAccess } from "@/app/api/site-admin/access-requests/[id]/route";
import { accessRequestStore } from "@/lib/access-requests/store";
import { resetMemoryAccessRequestStore } from "@/lib/access-requests/memory-adapter";

function session(input?: {
  id?: string;
  unionId?: string | null;
  localId?: string | null;
  roles?: UserRole[];
  mfaVerified?: boolean;
}) {
  return {
    user: {
      id: input?.id ?? "user-president-7",
      name: "Local 777 President",
      unionId:
        input?.unionId === null ? undefined : (input?.unionId ?? "union-b7p"),
      localId:
        input?.localId === null ? undefined : (input?.localId ?? "local-7"),
      roles: input?.roles ?? (["local_president"] as UserRole[]),
      mfaVerified: input?.mfaVerified,
    },
  };
}

function jsonRequest(
  body: unknown,
  url = "http://localhost/api/access-requests",
  ip = "203.0.113.10",
): Request {
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function getRequest(url = "http://localhost/api/access-requests"): Request {
  return new Request(url);
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function validSubmit(overrides: Record<string, unknown> = {}) {
  return {
    submissionKey: "submission-key-16x",
    kind: "member_access",
    name: "Alex Rivera",
    email: "alex@example.test",
    unionName: "Behind 7 Proxies",
    localName: "Local 7",
    offerings: ["officer_hub"],
    locale: "en",
    consentAccepted: true,
    ...overrides,
  };
}

async function seedRoutedRequest(input?: {
  kind?: AccessRequest["kind"];
  unionId?: string;
  localId?: string;
  privateNote?: string;
  name?: string;
  email?: string;
}): Promise<AccessRequest> {
  const row = await accessRequestStore.create({
    submissionKey: `seed-${Math.random().toString(36).slice(2, 12)}-xxxx`,
    kind: input?.kind ?? "member_access",
    name: input?.name ?? "Casey Seed",
    email: input?.email ?? "casey@example.test",
    unionName: "Behind 7 Proxies",
    localName: "Local 7",
    offerings: ["officer_hub"],
    locale: "en",
  });
  const updated = await accessRequestStore.update(row.id, {
    unionId: input?.unionId ?? "union-b7p",
    localId: input?.localId ?? "local-7",
    privateNote: input?.privateNote ?? "internal routing note",
  });
  if (!updated) throw new Error("failed to seed access request");
  return updated;
}

describe("access request HTTP", () => {
  beforeEach(() => {
    resetMemoryAccessRequestStore();
    authMock.mockReset();
    resolveActorMock.mockReset();
    sendEmailMock.mockReset();
    sendEmailMock.mockResolvedValue({ ok: false, reason: "not_configured" });
    resolveActorMock.mockImplementation(async (sess: ReturnType<typeof session>) =>
      actorFromSession(sess as unknown as Session),
    );
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    resetMemoryAccessRequestStore();
    vi.unstubAllEnvs();
  });

  describe("POST /api/access-requests", () => {
    it("always persists even when the durable backend flag is unset", async () => {
      const res = await submitAccessRequest(
        jsonRequest(validSubmit(), undefined, "203.0.113.1"),
      );
      expect(res.status).toBe(201);
      expect(await res.json()).toEqual({ ok: true });
      expect(await accessRequestStore.list()).toHaveLength(1);
    });

    it("rejects invalid JSON, extra keys, and missing consent before writing", async () => {
      const invalidJson = await submitAccessRequest(
        jsonRequest("{", "http://localhost/api/access-requests", "203.0.113.2"),
      );
      expect(invalidJson.status).toBe(400);
      expect(await invalidJson.json()).toEqual({ error: "Invalid request" });

      const extra = await submitAccessRequest(
        jsonRequest(
          { ...validSubmit(), unionId: "union-forged" },
          undefined,
          "203.0.113.3",
        ),
      );
      expect(extra.status).toBe(400);
      expect((await extra.json()).error).toBe("Please check the form fields.");

      const noConsent = await submitAccessRequest(
        jsonRequest(
          { ...validSubmit(), consentAccepted: false },
          undefined,
          "203.0.113.4",
        ),
      );
      expect(noConsent.status).toBe(400);
      expect(await accessRequestStore.list()).toEqual([]);
    });

    it("swallows honeypot bots without creating a row", async () => {
      const res = await submitAccessRequest(
        jsonRequest(
          validSubmit({ website: "https://spam.example" }),
          undefined,
          "203.0.113.5",
        ),
      );
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
      expect(await accessRequestStore.list()).toEqual([]);
      expect(sendEmailMock).not.toHaveBeenCalled();
    });

    it("creates a request without tenant stamps, notifies the configured operator, and rate-limits the same IP", async () => {
      vi.stubEnv("ACCESS_REQUEST_NOTIFY_EMAIL", "ryan@ryanmorris.ca");
      vi.stubEnv("AUTH_URL", "https://unionops.org");
      sendEmailMock.mockResolvedValue({ ok: true, messageId: "msg-1" });

      const first = await submitAccessRequest(
        jsonRequest(validSubmit(), undefined, "203.0.113.6"),
      );
      expect(first.status).toBe(201);
      expect(await first.json()).toEqual({ ok: true });

      const rows = await accessRequestStore.list();
      expect(rows).toHaveLength(1);
      expect(rows[0]?.unionId).toBeUndefined();
      expect(rows[0]?.localId).toBeUndefined();
      expect(rows[0]?.kind).toBe("member_access");
      expect(rows[0]?.email).toBe("alex@example.test");
      expect(rows[0]?.notifySentAt).toBeTruthy();
      expect(rows[0]?.receiptSentAt).toBeTruthy();

      expect(sendEmailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "ryan@ryanmorris.ca",
          subject: "UnionOps beta access request (member_access)",
        }),
      );
      const notifyText = String(
        (sendEmailMock.mock.calls[0]?.[0] as { text?: string })?.text ?? "",
      );
      expect(notifyText).toContain("name=Alex Rivera");
      expect(notifyText).toContain("union=Behind 7 Proxies");
      expect(notifyText).toContain(
        "inbox=https://unionops.org/en/app/site-admin/access-requests",
      );

      for (let i = 0; i < 4; i += 1) {
        const again = await submitAccessRequest(
          jsonRequest(
            validSubmit({
              submissionKey: `submission-key-${i}-xxxx`,
              email: `alex${i}@example.test`,
            }),
            undefined,
            "203.0.113.6",
          ),
        );
        expect(again.status).toBe(201);
      }
      const limited = await submitAccessRequest(
        jsonRequest(
          validSubmit({
            submissionKey: "submission-key-limit",
            email: "limited@example.test",
          }),
          undefined,
          "203.0.113.6",
        ),
      );
      expect(limited.status).toBe(429);
      expect(await accessRequestStore.list()).toHaveLength(5);
    });
  });

  describe("GET/PATCH /api/access-requests", () => {
    it("returns 401 without a session and 403 for members and stewards", async () => {
      authMock.mockResolvedValue(null);
      expect((await listMemberAccess()).status).toBe(401);
      expect(
        (await patchMemberAccess(jsonRequest({ status: "reviewing" }), params("x")))
          .status,
      ).toBe(401);

      authMock.mockResolvedValue(session({ roles: ["local_member"] }));
      expect((await listMemberAccess()).status).toBe(403);

      authMock.mockResolvedValue(session({ roles: ["local_steward"] }));
      const forbidden = await listMemberAccess();
      expect(forbidden.status).toBe(403);
      expect(await forbidden.json()).toEqual({ error: "Forbidden" });
    });

    it("returns 403 MFA required when MFA is enabled and unverified", async () => {
      vi.stubEnv("AUTH_MFA_ENABLED", "true");
      authMock.mockResolvedValue(session({ mfaVerified: false }));
      const res = await listMemberAccess();
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: "MFA required" });
    });

    it("lists only routed member_access rows for the session local and strips private notes", async () => {
      const mine = await seedRoutedRequest({
        name: "Home member",
        privateNote: "do not leak",
      });
      await seedRoutedRequest({
        name: "Sister local",
        localId: "local-1337",
      });
      await seedRoutedRequest({
        name: "Other union",
        unionId: "union-other",
        localId: "local-7",
      });
      await seedRoutedRequest({
        kind: "local_interest",
        name: "Local interest",
      });
      const unassigned = await accessRequestStore.create({
        submissionKey: "unassigned-key-16x",
        kind: "member_access",
        name: "Unassigned",
        email: "unassigned@example.test",
        unionName: "Behind 7 Proxies",
        localName: "Local 7",
        offerings: ["officer_hub"],
        locale: "en",
      });

      authMock.mockResolvedValue(session());
      const res = await listMemberAccess();
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        items: Array<
          ReturnType<typeof accessRequestMemberView> & { privateNote?: string }
        >;
      };
      expect(body.items.map((row) => row.name)).toEqual(["Home member"]);
      expect(body.items[0]?.id).toBe(mine.id);
      expect(body.items[0]?.privateNote).toBeUndefined();
      expect(body.items[0]?.email).toBe("casey@example.test");
      expect(body.items.some((row) => row.id === unassigned.id)).toBe(false);
    });

    it("returns 404 for another union, local_interest, and extra PATCH keys", async () => {
      const foreign = await seedRoutedRequest({
        unionId: "union-other",
        name: "Foreign",
      });
      const interest = await seedRoutedRequest({
        kind: "local_interest",
        name: "Interest",
      });
      const mine = await seedRoutedRequest({ name: "Home" });

      authMock.mockResolvedValue(session());
      expect(
        (await patchMemberAccess(jsonRequest({ status: "reviewing" }), params(foreign.id)))
          .status,
      ).toBe(404);
      expect(
        (await patchMemberAccess(jsonRequest({ status: "reviewing" }), params(interest.id)))
          .status,
      ).toBe(404);

      const extra = await patchMemberAccess(
        jsonRequest({ status: "reviewing", unionId: "union-forged" }),
        params(mine.id),
      );
      expect(extra.status).toBe(400);

      const ok = await patchMemberAccess(
        jsonRequest({ status: "reviewing", privateNote: "called the steward" }),
        params(mine.id),
      );
      expect(ok.status).toBe(200);
      const body = (await ok.json()) as {
        item: ReturnType<typeof accessRequestMemberView> & {
          privateNote?: string;
        };
      };
      expect(body.item?.status).toBe("reviewing");
      expect(body.item?.privateNote).toBeUndefined();
      const stored = await accessRequestStore.getById(mine.id);
      expect(stored?.privateNote).toBe("called the steward");
      expect(stored?.reviewedById).toBe("user-president-7");
    });
  });

  describe("site-admin access-request HTTP", () => {
    it("returns 401 without a session and 403 for local officers", async () => {
      authMock.mockResolvedValue(null);
      expect((await listSiteAdminAccess(getRequest())).status).toBe(401);

      authMock.mockResolvedValue(session({ roles: ["local_president"] }));
      const forbidden = await listSiteAdminAccess(getRequest());
      expect(forbidden.status).toBe(403);
      expect(await forbidden.json()).toEqual({ error: "Forbidden" });
    });

    it("lists every kind including private notes, then assigns a local for officers", async () => {
      const created = await submitAccessRequest(
        jsonRequest(
          validSubmit({ name: "Public submitter" }),
          undefined,
          "203.0.113.7",
        ),
      );
      expect(created.status).toBe(201);
      const [row] = await accessRequestStore.list();
      if (!row) throw new Error("expected public row");

      authMock.mockResolvedValue(session({ roles: ["platform_admin"] }));
      const listed = await listSiteAdminAccess(
        getRequest("http://localhost/api/site-admin/access-requests"),
      );
      expect(listed.status).toBe(200);
      const listBody = (await listed.json()) as { items: AccessRequest[] };
      expect(listBody.items).toHaveLength(1);
      expect(listBody.items[0]?.name).toBe("Public submitter");
      expect(listBody.items[0]?.unionId).toBeUndefined();

      const extra = await patchSiteAdminAccess(
        jsonRequest(
          { unionId: "union-b7p", extra: true },
          `http://localhost/api/site-admin/access-requests/${row.id}`,
        ),
      );
      expect(extra.status).toBe(400);

      const assigned = await patchSiteAdminAccess(
        jsonRequest(
          { unionId: "union-b7p", localId: "local-7", status: "reviewing" },
          `http://localhost/api/site-admin/access-requests/${row.id}`,
        ),
      );
      expect(assigned.status).toBe(200);

      authMock.mockResolvedValue(session({ roles: ["local_president"] }));
      const officer = await listMemberAccess();
      expect(officer.status).toBe(200);
      const officerBody = (await officer.json()) as {
        items: Array<{ name: string; status: string; privateNote?: string }>;
      };
      expect(officerBody.items.map((item) => item.name)).toEqual([
        "Public submitter",
      ]);
      expect(officerBody.items[0]?.status).toBe("reviewing");
      expect(officerBody.items[0]?.privateNote).toBeUndefined();
    });
  });
});

describe("accessRequestSchema and member view", () => {
  it("accepts a valid public payload and rejects forged tenant keys", () => {
    expect(accessRequestSchema.safeParse(validSubmit()).success).toBe(true);
    expect(
      accessRequestSchema.safeParse(validSubmit({ unionId: "union-forged" }))
        .success,
    ).toBe(false);
    expect(
      accessRequestSchema.safeParse(validSubmit({ consentAccepted: false }))
        .success,
    ).toBe(false);
  });

  it("omits operator-only fields from the member-safe projection", () => {
    const view = accessRequestMemberView({
      id: "access-1",
      submissionKey: "submission-key-16x",
      kind: "member_access",
      name: "Alex",
      email: "alex@example.test",
      unionName: "Behind 7 Proxies",
      localName: "Local 7",
      offerings: ["officer_hub"],
      locale: "en",
      consentAcceptedAt: "2026-09-24T00:00:00.000Z",
      createdAt: "2026-09-24T00:00:00.000Z",
      status: "reviewing",
      unionId: "union-b7p",
      localId: "local-7",
      privateNote: "secret",
      reviewedById: "user-1",
      notificationError: "smtp down",
      reviewHistory: [{ at: "2026-09-24T00:00:00.000Z", userId: "user-1" }],
    });
    expect(view).toEqual({
      id: "access-1",
      kind: "member_access",
      name: "Alex",
      email: "alex@example.test",
      unionName: "Behind 7 Proxies",
      localName: "Local 7",
      message: undefined,
      locale: "en",
      createdAt: "2026-09-24T00:00:00.000Z",
      status: "reviewing",
      unionId: "union-b7p",
      localId: "local-7",
      inviteId: undefined,
    });
    expect("privateNote" in view).toBe(false);
    expect("reviewHistory" in view).toBe(false);
    expect("notificationError" in view).toBe(false);
  });
});
