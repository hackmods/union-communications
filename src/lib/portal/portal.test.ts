import { describe, expect, it } from "vitest";
import { portalStore } from "@/lib/portal/memory-adapter";
import {
  canAccessPortal,
  canAdminCircle,
  canCreateCircle,
  canSeeOfficerHubLink,
  prefersPortalHome,
  signedInHomeHref,
} from "@/lib/portal/access";

describe("portal access", () => {
  it("allows local_member and officers", () => {
    expect(canAccessPortal(["local_member"])).toBe(true);
    expect(canAccessPortal(["local_steward"])).toBe(true);
    expect(canCreateCircle(["local_member"])).toBe(false);
    expect(canCreateCircle(["local_president"])).toBe(true);
    expect(canAdminCircle(["local_member"], "admin")).toBe(true);
  });

  it("sends rank-and-file home to Portal, officers to Hub", () => {
    expect(prefersPortalHome(["local_member"])).toBe(true);
    expect(canSeeOfficerHubLink(["local_member"])).toBe(false);
    expect(prefersPortalHome(["local_steward"])).toBe(false);
    expect(canSeeOfficerHubLink(["local_president"])).toBe(true);
    expect(signedInHomeHref(["local_member"])).toBe("/portal");
    expect(signedInHomeHref(["local_president"])).toBe("/app");
    expect(signedInHomeHref(["local_member"], ["comms"])).toBe("/app");
  });
});

describe("portalStore", () => {
  it("returns Together payload for steward with Circles and overdue Actions", () => {
    const station = portalStore.listStation(
      "union-b7p",
      "user-steward-7",
    );
    expect(station.circles.length).toBeGreaterThanOrEqual(2);
    expect(station.myActions.some((a) => a.title.includes("coverage"))).toBe(
      true,
    );
    expect(station.dispatchUnread).toBeGreaterThan(0);
  });

  it("gives members a lived-in Together: digest, upcoming, Hall work", () => {
    const station = portalStore.listStation("union-b7p", "user-member-7");
    expect(station.weekDigest.bulletinPosts).toBeGreaterThan(0);
    expect(station.weekDigest.floorMessages).toBeGreaterThan(0);
    expect(station.weekDigest.actionsCompleted).toBeGreaterThan(0);
    expect(station.upcomingEvents.some((e) => e.title.includes("Membership"))).toBe(
      true,
    );
    expect(station.recentBulletin.length).toBeGreaterThan(1);
  });

  it("loads Circle detail with solidarity toolkits", () => {
    const detail = portalStore.getCircleDetail(
      "union-b7p",
      "user-steward-7",
      "circle-jhsc-243",
    );
    expect(detail?.circle.name).toBe("JHSC");
    expect(detail?.pipelineBoard?.name).toContain("walk");
    expect(detail?.floor.length).toBeGreaterThan(0);
  });

  it("promotes Bulletin to Action via source id", () => {
    const post = portalStore.addBulletin({
      circleId: "circle-hall-7",
      unionId: "union-b7p",
      authorId: "user-president-7",
      authorName: "President",
      title: "Need flyer",
      body: "Please make one",
    });
    const action = portalStore.addAction({
      circleId: "circle-hall-7",
      unionId: "union-b7p",
      listName: "From Bulletin",
      title: post.title,
      createdById: "user-president-7",
      sourceBulletinPostId: post.id,
      assigneeId: "user-member-7",
      assigneeName: "Member",
    });
    expect(action.sourceBulletinPostId).toBe(post.id);
  });

  it("mutes Dispatch and stars membership", () => {
    const before = portalStore.listDispatch(
      "union-b7p",
      "user-steward-7",
    ).length;
    expect(before).toBeGreaterThan(0);
    portalStore.updateMembership("user-steward-7", "circle-lec-7", {
      muted: true,
      starred: true,
    });
    const after = portalStore.listDispatch(
      "union-b7p",
      "user-steward-7",
    );
    expect(after.every((d) => d.circleId !== "circle-lec-7")).toBe(true);
  });

  it("archives Circle and reports Oversight", () => {
    const created = portalStore.createCircle({
      unionId: "union-b7p",
      localId: "local-7",
      kind: "ad_hoc",
      name: "Temp Circle",
      visibility: "invited",
      createdById: "user-president-7",
      createdByName: "President",
    });
    expect(portalStore.archiveCircle(created.id, "union-b7p")).toBe(true);
    expect(portalStore.getCircleDetail("union-b7p", "user-president-7", created.id)).toBeNull();
    expect(portalStore.inviteToRoster({
      circleId: created.id,
      userId: "user-member-7",
      userName: "Local 7 Member",
    })).toBeNull();
    const oversight = portalStore.oversight("circle-lec-7", "union-b7p");
    expect(oversight.openCount).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(oversight.overdue)).toBe(true);
  });

  it("lets a member from another local see a union-scoped committee Circle", () => {
    const caucus = portalStore.createCircle({
      unionId: "union-b7p",
      kind: "committee",
      name: "Provincial caucus",
      visibility: "invited",
      createdById: "user-president-7",
      createdByName: "Local 7 President",
    });
    expect(caucus.localId).toBeUndefined();
    portalStore.inviteToRoster({
      circleId: caucus.id,
      userId: "user-president-1337",
      userName: "Local 560 President",
    });
    const station = portalStore.listStation(
      "union-b7p",
      "user-president-1337",
    );
    expect(station.circles.some((c) => c.id === caucus.id)).toBe(true);
    expect(
      portalStore.getCircleDetail(
        "union-b7p",
        "user-president-1337",
        caucus.id,
      )?.circle.name,
    ).toBe("Provincial caucus");
  });

  it("seeds a Local 145 joint-committee lead on a union-scoped caucus with chats", () => {
    const station = portalStore.listStation("union-b7p", "user-joint-404");
    expect(station.circles.some((c) => c.id === "circle-caucus-joint")).toBe(
      true,
    );
    expect(station.circles.some((c) => c.id === "circle-hall-local-404")).toBe(
      true,
    );
    const detail = portalStore.getCircleDetail(
      "union-b7p",
      "user-joint-404",
      "circle-caucus-joint",
    );
    expect(detail?.circle.localId).toBeUndefined();
    expect(detail?.roster.map((row) => row.userId).sort()).toEqual([
      "user-joint-404",
      "user-president-7",
      "user-president-502",
      "user-president-1337",
    ].sort());
    expect(detail?.floor.length).toBeGreaterThanOrEqual(5);
    expect(detail?.bulletin.some((p) => p.title.includes("Caucus agenda"))).toBe(
      true,
    );
    const threads = portalStore.listSidebarThreads(
      "union-b7p",
      "user-joint-404",
    );
    expect(
      threads.some((thread) => thread.id === "sb-caucus-1"),
    ).toBe(true);
  });

  it("marks Dispatch read", () => {
    const n = portalStore.markDispatchRead(
      "union-b7p",
      "user-member-7",
      undefined,
    );
    expect(n).toBeGreaterThanOrEqual(0);
    const unread = portalStore
      .listDispatch("union-b7p", "user-member-7")
      .filter((d) => !d.readAt);
    expect(unread).toHaveLength(0);
  });

  it("searches across Circles and lists Hold the line", () => {
    const hits = portalStore.search(
      "union-b7p",
      "user-steward-7",
      "Hall",
    );
    expect(hits.some((h) => h.kind === "circle")).toBe(true);
    const fronts = portalStore.listFronts("union-b7p", "user-steward-7");
    expect(fronts.length).toBeGreaterThan(0);
  });

  it("updates One fight and Sidebars", () => {
    const item = portalStore.upsertMomentum({
      circleId: "circle-lec-7",
      unionId: "union-b7p",
      title: "Test package",
      progress: 40,
      updatedById: "user-president-7",
      updatedByName: "President",
    });
    expect(item).not.toBeNull();
    if (!item) return;
    expect(item.progress).toBe(40);
    const thread = portalStore.ensureSidebarThread({
      unionId: "union-b7p",
      fromId: "user-member-7",
      fromName: "Member",
      toId: "user-president-7",
      toName: "President",
    });
    const msg = portalStore.sendSidebarMessage({
      unionId: "union-b7p",
      threadId: thread.id,
      authorId: "user-member-7",
      authorName: "Member",
      body: "Hello from Sidebar",
    });
    expect(msg?.body).toContain("Sidebar");
  });

  it("creates Circle from JHSC template with Many hands", () => {
    const circle = portalStore.createCircle({
      unionId: "union-b7p",
      localId: "local-7",
      kind: "committee",
      name: "Template JHSC",
      visibility: "invited",
      createdById: "user-president-7",
      createdByName: "President",
      template: "jhsc",
    });
    const detail = portalStore.getCircleDetail(
      "union-b7p",
      "user-president-7",
      circle.id,
    );
    expect(detail?.pipelineBoard).not.toBeNull();
    expect(detail?.pipelineBoard?.name).toContain("walk");
    expect(detail?.rollCallQuestions.length).toBeGreaterThan(0);
  });

  it("starts Many hands on a blank committee Circle", () => {
    const circle = portalStore.createCircle({
      unionId: "union-b7p",
      localId: "local-7",
      kind: "committee",
      name: "Blank committee",
      visibility: "invited",
      createdById: "user-president-7",
      createdByName: "President",
      template: "blank",
    });
    const before = portalStore.getCircleDetail(
      "union-b7p",
      "user-president-7",
      circle.id,
    );
    expect(before?.pipelineBoard).toBeNull();
    const board = portalStore.ensurePipelineBoard({
      circleId: circle.id,
      unionId: "union-b7p",
    });
    expect(board?.name).toBe("Blank committee");
    const after = portalStore.getCircleDetail(
      "union-b7p",
      "user-president-7",
      circle.id,
    );
    expect(after?.pipelineBoard?.id).toBe(board?.id);
    expect(after?.pipelineColumns).toHaveLength(3);
    const again = portalStore.ensurePipelineBoard({
      circleId: circle.id,
      unionId: "union-b7p",
    });
    expect(again?.id).toBe(board?.id);
  });

  it("resolves @mentions into Dispatch and soft-deletes Bulletin", () => {
    const before = portalStore.listDispatch(
      "union-b7p",
      "user-member-7",
    ).length;
    portalStore.addBulletin({
      circleId: "circle-hall-7",
      unionId: "union-b7p",
      authorId: "user-president-7",
      authorName: "President",
      title: "Ping",
      body: "Please see @Local 7 Member about the flyer.",
    });
    const after = portalStore.listDispatch("union-b7p", "user-member-7");
    expect(after.length).toBeGreaterThan(before);
    expect(after.some((d) => d.kind === "mention")).toBe(true);

    const post = portalStore.addBulletin({
      circleId: "circle-hall-7",
      unionId: "union-b7p",
      authorId: "user-president-7",
      authorName: "President",
      title: "Temp delete me",
      body: "Gone soon",
    });
    expect(
      portalStore.softDelete(
        "bulletin",
        post.id,
        "circle-hall-7",
        "union-b7p",
        "user-president-7",
      ),
    ).toBe(true);
    const detail = portalStore.getCircleDetail(
      "union-b7p",
      "user-president-7",
      "circle-hall-7",
    );
    expect(detail?.bulletin.some((p) => p.id === post.id)).toBe(false);
  });

  it("imports Basecamp CSV rows and exports activity pack", () => {
    const result = portalStore.importBasecampCsv(
      "circle-hall-7",
      "union-b7p",
      "user-president-7",
      "President",
      "type,title,body\nbulletin,Imported note,Hello\naction,Imported task,Do it\n",
    );
    expect(result.created).toBe(2);
    const pack = portalStore.exportActivityPack(
      "circle-hall-7",
      "union-b7p",
    );
    expect(pack?.bulletin.some((p) => p.title === "Imported note")).toBe(true);
    expect(pack?.audit.length).toBeGreaterThan(0);
  });

  it("mutes per-tool Dispatch", () => {
    portalStore.updateMembership("user-member-7", "circle-hall-7", {
      mutedTools: ["bulletin"],
    });
    portalStore.addBulletin({
      circleId: "circle-hall-7",
      unionId: "union-b7p",
      authorId: "user-president-7",
      authorName: "President",
      title: "Should be quiet",
      body: "Muted tool test",
    });
    const items = portalStore.listDispatch("union-b7p", "user-member-7");
    expect(
      items.every(
        (d) => !(d.circleId === "circle-hall-7" && d.kind === "bulletin" && d.title.includes("Should be quiet")),
      ),
    ).toBe(true);
  });

  it("reuses the seeded Local 243 Hall and joins a new local Hall", () => {
    const existing = portalStore.ensureHall({
      unionId: "union-b7p",
      localId: "local-7",
      localNumber: "7",
    });
    expect(existing.id).toBe("circle-hall-7");

    const first = portalStore.ensureHallAndJoin({
      unionId: "union-b7p",
      localId: "local-502",
      localNumber: "415",
      userId: "user-president-502",
      userName: "President 415",
      admin: true,
    });
    expect(first.circle.kind).toBe("local_hall");
    expect(first.circle.id).toBe("circle-hall-local-502");
    expect(first.membership.role).toBe("admin");

    const again = portalStore.ensureHall({
      unionId: "union-b7p",
      localId: "local-502",
    });
    expect(again.id).toBe(first.circle.id);

    const station = portalStore.listStation("union-b7p", "user-president-502");
    expect(station.circles.some((c) => c.id === first.circle.id)).toBe(true);
  });
});
