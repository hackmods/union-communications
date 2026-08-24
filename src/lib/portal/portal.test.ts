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
      "union-opseu",
      "user-steward-243",
    );
    expect(station.circles.length).toBeGreaterThanOrEqual(2);
    expect(station.myActions.some((a) => a.title.includes("coverage"))).toBe(
      true,
    );
    expect(station.dispatchUnread).toBeGreaterThan(0);
  });

  it("gives members a lived-in Together: digest, upcoming, Hall work", () => {
    const station = portalStore.listStation("union-opseu", "user-member-243");
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
      "union-opseu",
      "user-steward-243",
      "circle-jhsc-243",
    );
    expect(detail?.circle.name).toBe("JHSC");
    expect(detail?.pipelineBoard?.name).toContain("walk");
    expect(detail?.floor.length).toBeGreaterThan(0);
  });

  it("promotes Bulletin to Action via source id", () => {
    const post = portalStore.addBulletin({
      circleId: "circle-hall-243",
      unionId: "union-opseu",
      authorId: "user-president-243",
      authorName: "President",
      title: "Need flyer",
      body: "Please make one",
    });
    const action = portalStore.addAction({
      circleId: "circle-hall-243",
      unionId: "union-opseu",
      listName: "From Bulletin",
      title: post.title,
      createdById: "user-president-243",
      sourceBulletinPostId: post.id,
      assigneeId: "user-member-243",
      assigneeName: "Member",
    });
    expect(action.sourceBulletinPostId).toBe(post.id);
  });

  it("mutes Dispatch and stars membership", () => {
    const before = portalStore.listDispatch(
      "union-opseu",
      "user-steward-243",
    ).length;
    expect(before).toBeGreaterThan(0);
    portalStore.updateMembership("user-steward-243", "circle-lec-243", {
      muted: true,
      starred: true,
    });
    const after = portalStore.listDispatch(
      "union-opseu",
      "user-steward-243",
    );
    expect(after.every((d) => d.circleId !== "circle-lec-243")).toBe(true);
  });

  it("archives Circle and reports Oversight", () => {
    const created = portalStore.createCircle({
      unionId: "union-opseu",
      localId: "local-243",
      kind: "ad_hoc",
      name: "Temp Circle",
      visibility: "invited",
      createdById: "user-president-243",
      createdByName: "President",
    });
    expect(portalStore.archiveCircle(created.id, "union-opseu")).toBe(true);
    const oversight = portalStore.oversight("circle-lec-243", "union-opseu");
    expect(oversight.openCount).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(oversight.overdue)).toBe(true);
  });

  it("lets a member from another local see a union-scoped committee Circle", () => {
    const caucus = portalStore.createCircle({
      unionId: "union-opseu",
      kind: "committee",
      name: "Provincial caucus",
      visibility: "invited",
      createdById: "user-president-243",
      createdByName: "Local 243 President",
    });
    expect(caucus.localId).toBeUndefined();
    portalStore.inviteToRoster({
      circleId: caucus.id,
      userId: "user-president-560",
      userName: "Local 560 President",
    });
    const station = portalStore.listStation(
      "union-opseu",
      "user-president-560",
    );
    expect(station.circles.some((c) => c.id === caucus.id)).toBe(true);
    expect(
      portalStore.getCircleDetail(
        "union-opseu",
        "user-president-560",
        caucus.id,
      )?.circle.name,
    ).toBe("Provincial caucus");
  });

  it("seeds a Local 145 joint-committee lead on a union-scoped caucus with chats", () => {
    const station = portalStore.listStation("union-opseu", "user-eerc-145");
    expect(station.circles.some((c) => c.id === "circle-caucus-joint")).toBe(
      true,
    );
    expect(station.circles.some((c) => c.id === "circle-hall-local-145")).toBe(
      true,
    );
    const detail = portalStore.getCircleDetail(
      "union-opseu",
      "user-eerc-145",
      "circle-caucus-joint",
    );
    expect(detail?.circle.localId).toBeUndefined();
    expect(detail?.roster.map((row) => row.userId).sort()).toEqual([
      "user-eerc-145",
      "user-president-243",
      "user-president-415",
      "user-president-560",
    ].sort());
    expect(detail?.floor.length).toBeGreaterThanOrEqual(5);
    expect(detail?.bulletin.some((p) => p.title.includes("Caucus agenda"))).toBe(
      true,
    );
    const threads = portalStore.listSidebarThreads(
      "union-opseu",
      "user-eerc-145",
    );
    expect(
      threads.some((thread) => thread.id === "sb-caucus-1"),
    ).toBe(true);
  });

  it("marks Dispatch read", () => {
    const n = portalStore.markDispatchRead(
      "union-opseu",
      "user-member-243",
      undefined,
    );
    expect(n).toBeGreaterThanOrEqual(0);
    const unread = portalStore
      .listDispatch("union-opseu", "user-member-243")
      .filter((d) => !d.readAt);
    expect(unread).toHaveLength(0);
  });

  it("searches across Circles and lists Hold the line", () => {
    const hits = portalStore.search(
      "union-opseu",
      "user-steward-243",
      "Hall",
    );
    expect(hits.some((h) => h.kind === "circle")).toBe(true);
    const fronts = portalStore.listFronts("union-opseu", "user-steward-243");
    expect(fronts.length).toBeGreaterThan(0);
  });

  it("updates One fight and Sidebars", () => {
    const item = portalStore.upsertMomentum({
      circleId: "circle-lec-243",
      unionId: "union-opseu",
      title: "Test package",
      progress: 40,
      updatedById: "user-president-243",
      updatedByName: "President",
    });
    expect(item.progress).toBe(40);
    const thread = portalStore.ensureSidebarThread({
      unionId: "union-opseu",
      fromId: "user-member-243",
      fromName: "Member",
      toId: "user-president-243",
      toName: "President",
    });
    const msg = portalStore.sendSidebarMessage({
      unionId: "union-opseu",
      threadId: thread.id,
      authorId: "user-member-243",
      authorName: "Member",
      body: "Hello from Sidebar",
    });
    expect(msg?.body).toContain("Sidebar");
  });

  it("creates Circle from JHSC template with Many hands", () => {
    const circle = portalStore.createCircle({
      unionId: "union-opseu",
      localId: "local-243",
      kind: "committee",
      name: "Template JHSC",
      visibility: "invited",
      createdById: "user-president-243",
      createdByName: "President",
      template: "jhsc",
    });
    const detail = portalStore.getCircleDetail(
      "union-opseu",
      "user-president-243",
      circle.id,
    );
    expect(detail?.pipelineBoard).not.toBeNull();
    expect(detail?.pipelineBoard?.name).toContain("walk");
    expect(detail?.rollCallQuestions.length).toBeGreaterThan(0);
  });

  it("starts Many hands on a blank committee Circle", () => {
    const circle = portalStore.createCircle({
      unionId: "union-opseu",
      localId: "local-243",
      kind: "committee",
      name: "Blank committee",
      visibility: "invited",
      createdById: "user-president-243",
      createdByName: "President",
      template: "blank",
    });
    const before = portalStore.getCircleDetail(
      "union-opseu",
      "user-president-243",
      circle.id,
    );
    expect(before?.pipelineBoard).toBeNull();
    const board = portalStore.ensurePipelineBoard({
      circleId: circle.id,
      unionId: "union-opseu",
    });
    expect(board?.name).toBe("Blank committee");
    const after = portalStore.getCircleDetail(
      "union-opseu",
      "user-president-243",
      circle.id,
    );
    expect(after?.pipelineBoard?.id).toBe(board?.id);
    expect(after?.pipelineColumns).toHaveLength(3);
    const again = portalStore.ensurePipelineBoard({
      circleId: circle.id,
      unionId: "union-opseu",
    });
    expect(again?.id).toBe(board?.id);
  });

  it("resolves @mentions into Dispatch and soft-deletes Bulletin", () => {
    const before = portalStore.listDispatch(
      "union-opseu",
      "user-member-243",
    ).length;
    portalStore.addBulletin({
      circleId: "circle-hall-243",
      unionId: "union-opseu",
      authorId: "user-president-243",
      authorName: "President",
      title: "Ping",
      body: "Please see @Local 243 Member about the flyer.",
    });
    const after = portalStore.listDispatch("union-opseu", "user-member-243");
    expect(after.length).toBeGreaterThan(before);
    expect(after.some((d) => d.kind === "mention")).toBe(true);

    const post = portalStore.addBulletin({
      circleId: "circle-hall-243",
      unionId: "union-opseu",
      authorId: "user-president-243",
      authorName: "President",
      title: "Temp delete me",
      body: "Gone soon",
    });
    expect(
      portalStore.softDelete(
        "bulletin",
        post.id,
        "union-opseu",
        "user-president-243",
      ),
    ).toBe(true);
    const detail = portalStore.getCircleDetail(
      "union-opseu",
      "user-president-243",
      "circle-hall-243",
    );
    expect(detail?.bulletin.some((p) => p.id === post.id)).toBe(false);
  });

  it("imports Basecamp CSV rows and exports activity pack", () => {
    const result = portalStore.importBasecampCsv(
      "circle-hall-243",
      "union-opseu",
      "user-president-243",
      "President",
      "type,title,body\nbulletin,Imported note,Hello\naction,Imported task,Do it\n",
    );
    expect(result.created).toBe(2);
    const pack = portalStore.exportActivityPack(
      "circle-hall-243",
      "union-opseu",
    );
    expect(pack?.bulletin.some((p) => p.title === "Imported note")).toBe(true);
    expect(pack?.audit.length).toBeGreaterThan(0);
  });

  it("mutes per-tool Dispatch", () => {
    portalStore.updateMembership("user-member-243", "circle-hall-243", {
      mutedTools: ["bulletin"],
    });
    portalStore.addBulletin({
      circleId: "circle-hall-243",
      unionId: "union-opseu",
      authorId: "user-president-243",
      authorName: "President",
      title: "Should be quiet",
      body: "Muted tool test",
    });
    const items = portalStore.listDispatch("union-opseu", "user-member-243");
    expect(
      items.every(
        (d) => !(d.circleId === "circle-hall-243" && d.kind === "bulletin" && d.title.includes("Should be quiet")),
      ),
    ).toBe(true);
  });

  it("reuses the seeded Local 243 Hall and joins a new local Hall", () => {
    const existing = portalStore.ensureHall({
      unionId: "union-opseu",
      localId: "local-243",
      localNumber: "243",
    });
    expect(existing.id).toBe("circle-hall-243");

    const first = portalStore.ensureHallAndJoin({
      unionId: "union-opseu",
      localId: "local-415",
      localNumber: "415",
      userId: "user-pres-415",
      userName: "President 415",
      admin: true,
    });
    expect(first.circle.kind).toBe("local_hall");
    expect(first.circle.id).toBe("circle-hall-local-415");
    expect(first.membership.role).toBe("admin");

    const again = portalStore.ensureHall({
      unionId: "union-opseu",
      localId: "local-415",
    });
    expect(again.id).toBe(first.circle.id);

    const station = portalStore.listStation("union-opseu", "user-pres-415");
    expect(station.circles.some((c) => c.id === first.circle.id)).toBe(true);
  });
});
