import { afterEach, describe, expect, it, vi } from "vitest";
import { getPortalAdapter, portalAdapterForMemoryTests } from "@/lib/portal/adapter";
import { PostgresPortalAdapter } from "@/lib/portal/postgres-adapter";

afterEach(() => vi.unstubAllEnvs());

describe("Portal adapter contract", () => {
  it("selects Postgres only for an explicitly configured, scoped request", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://localhost/unionops");
    vi.stubEnv("PORTAL_DB_BACKEND", "postgres");
    await expect(getPortalAdapter()).rejects.toThrow("resolved actor scope");

    const portal = await getPortalAdapter({
      unionId: "union-b7p",
      localId: "local-7",
      userId: "user-president-7",
      mfaVerified: true,
    });
    expect(portal.constructor.name).toBe("PostgresPortalAdapter");
  });

  it("uses memory when the durable backend flag is not selected", async () => {
    vi.stubEnv("PORTAL_DB_BACKEND", "memory");
    const portal = await getPortalAdapter({ unionId: "union-b7p", userId: "user-president-7" });
    expect(portal).toBe(portalAdapterForMemoryTests());
  });

  it("binds persisted authorship and deletion to the RLS actor", async () => {
    const postgres = new PostgresPortalAdapter({
      unionId: "union-b7p",
      localId: "local-7",
      userId: "portal-actor",
    });
    await expect(postgres.addBulletin({
      circleId: "circle-1", unionId: "union-b7p", authorId: "other-user",
      authorName: "Forged", title: "test", body: "test",
    })).rejects.toThrow("author must match the authenticated actor");
    await expect(postgres.addAction({
      circleId: "circle-1", unionId: "union-b7p", listName: "List", title: "test",
      createdById: "other-user",
    })).rejects.toThrow("creator must match the authenticated actor");
    await expect(postgres.softDelete("bulletin", "post-1", "circle-1", "union-b7p", "other-user"))
      .rejects.toThrow("delete actor must match the authenticated actor");
  });

  it("provides async Circle, tool, search, deletion, and participant behavior", async () => {
    const portal = portalAdapterForMemoryTests();
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const unionId = "union-b7p";
    const authorId = `portal-contract-author-${suffix}`;
    const peerId = `portal-contract-peer-${suffix}`;
    const name = `Portal contract ${suffix}`;

    const circle = await portal.createCircle({
      unionId,
      kind: "ad_hoc",
      name,
      description: "adapter contract test",
      visibility: "invited",
      createdById: authorId,
      createdByName: "Contract Author",
    });
    const member = await portal.inviteToRoster({
      circleId: circle.id,
      userId: peerId,
      userName: "Contract Peer",
    });
    expect(member?.userId).toBe(peerId);

    const post = await portal.addBulletin({
      circleId: circle.id,
      unionId,
      authorId,
      authorName: "Contract Author",
      title: `Needle ${suffix}`,
      body: "Contract post body",
    });
    const comment = await portal.addComment({
      circleId: circle.id,
      unionId,
      postId: post.id,
      authorId: peerId,
      authorName: "Contract Peer",
      body: "Contract comment",
    });

    expect(comment?.postId).toBe(post.id);
    expect(
      (await portal.getCircleDetail(unionId, authorId, circle.id))?.bulletin,
    ).toContainEqual(expect.objectContaining({ id: post.id }));
    expect(
      await portal.search(unionId, authorId, `Needle ${suffix}`),
    ).toContainEqual(expect.objectContaining({ kind: "bulletin", id: post.id }));

    const thread = await portal.ensureSidebarThread({
      unionId,
      fromId: authorId,
      fromName: "Contract Author",
      toId: peerId,
      toName: "Contract Peer",
    });
    const message = await portal.sendSidebarMessage({
      unionId,
      threadId: thread.id,
      authorId,
      authorName: "Contract Author",
      body: "Private contract message",
    });
    expect(message?.threadId).toBe(thread.id);
    expect(await portal.getSidebarMessages(unionId, peerId, thread.id)).toHaveLength(1);
    expect(await portal.getSidebarMessages(unionId, `unrelated-${suffix}`, thread.id)).toBeNull();

    expect(
      await portal.softDelete("bulletin", post.id, circle.id, unionId, authorId),
    ).toBe(true);
    expect(
      (await portal.getCircleDetail(unionId, authorId, circle.id))?.bulletin,
    ).not.toContainEqual(expect.objectContaining({ id: post.id }));
  });
});
