/**
 * Portal persistence/RLS smoke against the non-owner application role.
 *
 * Requires:
 * - Migrations through the current journal tail and `npm run db:seed`
 * - DATABASE_URL for unionops_app (never the table owner)
 * - MIGRATE_DATABASE_URL for disposable smoke-fixture cleanup
 * - PORTAL_DB_BACKEND=postgres
 *
 * Run: npm run db:portal-durability-smoke
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { getDb, resetDbClient } from "../src/lib/db/client";
import { withRlsContext, type RlsSessionContext } from "../src/lib/db/rls-context";
import { portalBulletinPosts, portalCircles } from "../src/lib/db/schema";
import { PostgresPortalAdapter } from "../src/lib/portal/postgres-adapter";
import { portalDbBackend } from "../src/lib/db/backend";

const UNION = "union-b7p";
const LOCAL = "local-7";
const PRESIDENT = "user-president-7";
const MEMBER = "user-member-7";
type FailureTrigger = {
  table: "portal_circle_memberships" | "portal_binder_items" | "portal_dispatch_items";
  triggerName: string;
  functionName: string;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function expectDenied(label: string, action: () => Promise<unknown>): Promise<void> {
  let denied = false;
  try {
    await action();
  } catch {
    denied = true;
  }
  assert(denied, `${label} unexpectedly succeeded`);
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const migrationUrl = process.env.MIGRATE_DATABASE_URL?.trim();
  if (!databaseUrl || !migrationUrl) throw new Error("DATABASE_URL and MIGRATE_DATABASE_URL are required");
  if (portalDbBackend() !== "postgres") throw new Error("PORTAL_DB_BACKEND=postgres is required");

  const identity = postgres(databaseUrl, { max: 1 });
  const [{ currentUser, bypass }] = await identity<{ currentUser: string; bypass: boolean }[]>`
    SELECT current_user AS "currentUser",
      COALESCE((SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user), false) AS bypass
  `;
  await identity.end({ timeout: 5 });
  assert(currentUser === "unionops_app", `expected unionops_app runtime role, got ${currentUser}`);
  assert(!bypass, "unionops_app must not have BYPASSRLS");

  const createdCircleIds: string[] = [];
  const sidebarThreadIds: string[] = [];
  const failureTriggers: FailureTrigger[] = [];
  const owner = postgres(migrationUrl, { max: 1 });

  async function installFailureTrigger(
    table: FailureTrigger["table"],
    condition: string,
    prefix: string,
  ): Promise<FailureTrigger> {
    const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
    const trigger = { table, triggerName: `${prefix}_${suffix}`, functionName: `${prefix}_fn_${suffix}` };
    await owner.unsafe(`CREATE FUNCTION public."${trigger.functionName}"() RETURNS trigger LANGUAGE plpgsql AS $body$
      BEGIN
        IF ${condition} THEN RAISE EXCEPTION 'intentional Portal smoke failure'; END IF;
        RETURN NEW;
      END
    $body$`);
    await owner.unsafe(`CREATE TRIGGER "${trigger.triggerName}" BEFORE INSERT ON public.${table}
      FOR EACH ROW EXECUTE FUNCTION public."${trigger.functionName}"()`);
    failureTriggers.push(trigger);
    return trigger;
  }

  async function removeFailureTrigger(trigger: FailureTrigger): Promise<void> {
    await owner.unsafe(`DROP TRIGGER IF EXISTS "${trigger.triggerName}" ON public.${trigger.table}`);
    await owner.unsafe(`DROP FUNCTION IF EXISTS public."${trigger.functionName}"()`);
    const index = failureTriggers.findIndex((item) => item.triggerName === trigger.triggerName);
    if (index >= 0) failureTriggers.splice(index, 1);
  }

  try {
    const suffix = randomUUID();
    const presidentScope: RlsSessionContext = { unionId: UNION, localId: LOCAL, userId: PRESIDENT, mfaVerified: true };
    const memberScope: RlsSessionContext = { unionId: UNION, localId: LOCAL, userId: MEMBER };
    const president = new PostgresPortalAdapter(presidentScope);
    const member = new PostgresPortalAdapter(memberScope);

    const circleRollbackName = `Portal rollback ${suffix}`;
    const circleFailure = await installFailureTrigger(
      "portal_circle_memberships",
      "NEW.user_name = 'UNIONOPS_SMOKE_FORCE_ROLLBACK'",
      "portal_smoke_circle_rollback",
    );
    await expectDenied("Circle setup rollback", () => president.createCircle({
      unionId: UNION, localId: LOCAL, kind: "committee", name: circleRollbackName,
      description: "Must roll back with the creator membership", visibility: "invited",
      createdById: PRESIDENT, createdByName: "UNIONOPS_SMOKE_FORCE_ROLLBACK",
    }));
    const rolledBackCircle = await owner<{ id: string }[]>`
      SELECT id FROM portal_circles WHERE union_id = ${UNION} AND name = ${circleRollbackName}
    `;
    assert(rolledBackCircle.length === 0, "failed Circle bootstrap left a partial Circle row");
    await removeFailureTrigger(circleFailure);

    const circle = await president.createCircle({
      unionId: UNION, localId: LOCAL, kind: "committee", name: `Portal persistence ${suffix}`,
      description: "Temporary database smoke fixture", visibility: "invited",
      createdById: PRESIDENT, createdByName: "Local 7 President", template: "lec",
    });
    createdCircleIds.push(circle.id);

    const memberRow = await president.inviteToRoster({
      circleId: circle.id, userId: MEMBER, userName: "Local 7 Member",
    });
    assert(memberRow?.userId === MEMBER, "same-union active member could not be invited");
    const hall = await member.ensureHall({ unionId: UNION, localId: LOCAL, localNumber: "7" });
    assert(hall.kind === "local_hall" && hall.localId === LOCAL, "active local member could not resolve their Hall");
    const joinedHall = await member.ensureHallAndJoin({
      unionId: UNION, localId: LOCAL, localNumber: "7", userId: MEMBER, userName: "Local 7 Member",
    });
    assert(joinedHall.circle.id === hall.id && joinedHall.membership.userId === MEMBER, "Hall enrollment did not materialize for an active member");

    await expectDenied("ordinary member Circle creation", async () => {
      const deniedCircle = await member.createCircle({
        unionId: UNION, localId: LOCAL, kind: "ad_hoc", name: `Denied member ${suffix}`,
        visibility: "invited", createdById: MEMBER, createdByName: "Local 7 Member",
      });
      createdCircleIds.push(deniedCircle.id);
    });
    await expectDenied("local president union-wide Circle creation", async () => {
      const deniedCircle = await president.createCircle({
        unionId: UNION, kind: "ad_hoc", name: `Denied union ${suffix}`,
        visibility: "invited", createdById: PRESIDENT, createdByName: "Local 7 President",
      });
      createdCircleIds.push(deniedCircle.id);
    });
    await expectDenied("local president creation with missing local context", async () => {
      const noLocal = new PostgresPortalAdapter({ unionId: UNION, userId: PRESIDENT, mfaVerified: true });
      const deniedCircle = await noLocal.createCircle({
        unionId: UNION, localId: LOCAL, kind: "ad_hoc", name: `Denied missing local ${suffix}`,
        visibility: "invited", createdById: PRESIDENT, createdByName: "Local 7 President",
      });
      createdCircleIds.push(deniedCircle.id);
    });

    const action = await president.addAction({
      circleId: circle.id, unionId: UNION, listName: "Smoke", title: `Assigned ${suffix}`,
      assigneeId: MEMBER, assigneeName: "Caller supplied name", createdById: PRESIDENT,
    });
    assert(action.assigneeName === "Local 7 Member", "assignee display name was not resolved from Circle membership");
    const dispatched = await member.listDispatch(UNION, MEMBER);
    assert(dispatched.some((item) => item.kind === "assignment" && item.circleId === circle.id), "assigned action did not create a visible Dispatch item");
    const readCount = await member.markDispatchRead(UNION, MEMBER, dispatched.map((item) => item.id));
    assert(readCount > 0, "Dispatch read state did not persist");
    const completedAction = await president.addAction({
      circleId: circle.id, unionId: UNION, listName: "Smoke", title: `Completed ${suffix}`,
      assigneeId: MEMBER, assigneeName: "Local 7 Member", createdById: PRESIDENT,
    });
    const completed = await president.completeAction(completedAction.id, circle.id, UNION);
    assert(completed?.completedAt, "action completion did not persist");
    const mentionPost = await president.addBulletin({
      circleId: circle.id, unionId: UNION, authorId: PRESIDENT, authorName: "Local 7 President",
      title: `Mention ${suffix}`, body: "@Local 7 Member please review this update",
    });
    assert(mentionPost, "mention Bulletin post did not persist");
    const mentionDispatch = await member.listDispatch(UNION, MEMBER);
    assert(mentionDispatch.some((item) => item.kind === "mention" && item.title === `Mentioned in Bulletin: Mention ${suffix}`), "Bulletin mention did not create Dispatch");

    const mentionRollbackTitle = `Portal rollback mention ${suffix}`;
    const dispatchFailure = await installFailureTrigger(
      "portal_dispatch_items",
      `NEW.kind = 'mention' AND NEW.title = 'Mentioned in Bulletin: ${mentionRollbackTitle}'`,
      "portal_smoke_mention_rollback",
    );
    await expectDenied("Bulletin mention transaction rollback", () => president.addBulletin({
      circleId: circle.id, unionId: UNION, authorId: PRESIDENT, authorName: "Local 7 President",
      title: mentionRollbackTitle, body: "@Local 7 Member this should roll back",
    }));
    const rolledBackMentionPost = await owner<{ id: string }[]>`
      SELECT id FROM portal_bulletin_posts WHERE circle_id = ${circle.id} AND title = ${mentionRollbackTitle}
    `;
    const rolledBackMentionDispatch = await owner<{ id: string }[]>`
      SELECT id FROM portal_dispatch_items WHERE circle_id = ${circle.id} AND user_id = ${MEMBER}
        AND kind = 'mention' AND title = ${`Mentioned in Bulletin: ${mentionRollbackTitle}`}
    `;
    assert(rolledBackMentionPost.length === 0 && rolledBackMentionDispatch.length === 0, "failed mention transaction left a post or Dispatch row");
    await removeFailureTrigger(dispatchFailure);
    const post = await president.addBulletin({
      circleId: circle.id, unionId: UNION, authorId: PRESIDENT, authorName: "Local 7 President",
      title: `Search needle ${suffix}`, body: `Visible to the invited Circle ${suffix}`,
    });
    const pinned = await president.pinBulletin(post.id, circle.id, UNION, true);
    assert(pinned?.pinned, "Bulletin pin state did not persist");
    const comment = await member.addComment({
      circleId: circle.id, unionId: UNION, postId: post.id, authorId: MEMBER,
      authorName: "Local 7 Member", body: `Comment ${suffix}`,
    });
    assert(comment?.postId === post.id, "Circle member comment did not persist");

    await member.addCalendarEvent({
      circleId: circle.id, unionId: UNION, title: `Calendar ${suffix}`,
      startsAt: new Date(Date.now() + 86_400_000).toISOString(), createdById: MEMBER,
    });
    const binderItem = await member.addBinderItem({
      circleId: circle.id, unionId: UNION, title: `Binder ${suffix}`, content: `Notes ${suffix}`,
      contentType: "note", createdById: MEMBER, createdByName: "Local 7 Member",
    });
    await member.addFloorMessage({
      circleId: circle.id, unionId: UNION, authorId: MEMBER, authorName: "Local 7 Member", body: `Floor ${suffix}`,
    });
    const question = (await president.getCircleDetail(UNION, PRESIDENT, circle.id))?.rollCallQuestions[0];
    assert(question, "Circle template question did not persist atomically");
    const addedQuestion = await president.addRollCallQuestion({
      circleId: circle.id, unionId: UNION, question: `Check-in ${suffix}`, cadence: "monthly",
    });
    assert(addedQuestion.cadence === "monthly", "custom Roll Call question did not persist");
    const answer = await member.addRollCallAnswer({
      questionId: addedQuestion.id, circleId: circle.id, authorId: MEMBER,
      authorName: "Local 7 Member", body: `Roll call ${suffix}`,
    });
    assert(answer, "Roll Call answer did not persist");

    const board = await president.ensurePipelineBoard({ circleId: circle.id, unionId: UNION });
    const detailWithBoard = await president.getCircleDetail(UNION, PRESIDENT, circle.id);
    const column = detailWithBoard?.pipelineColumns[0];
    assert(board && column, "Many hands board or default columns did not persist");
    const card = await member.addPipelineCard({
      circleId: circle.id, unionId: UNION, boardId: board.id, columnId: column.id,
      title: `Many hands ${suffix}`,
    });
    assert(card, "Many hands card did not persist");
    assert(await member.movePipelineCard(card.id, column.id, circle.id, UNION), "Many hands card move failed");
    assert(await member.upsertMomentum({
      circleId: circle.id, unionId: UNION, title: `One fight ${suffix}`, progress: 25,
      updatedById: MEMBER, updatedByName: "Local 7 Member",
    }), "One fight item did not persist");

    const imported = await member.importBasecampRows(circle.id, UNION, MEMBER, "Local 7 Member", [
      { kind: "bulletin", title: `Imported post ${suffix}`, body: "imported" },
      { kind: "action", title: `Imported action ${suffix}`, body: "imported" },
      { kind: "binder", title: `Imported binder ${suffix}`, body: "imported" },
    ]);
    assert(imported.created === 3, "Basecamp import was not atomic or complete");
    const importRollbackTitle = `Import rollback bulletin ${suffix}`;
    const importFailure = await installFailureTrigger(
      "portal_binder_items",
      "NEW.title = 'UNIONOPS_SMOKE_FORCE_ROLLBACK_IMPORT'",
      "portal_smoke_import_rollback",
    );
    await expectDenied("Basecamp import transaction rollback", () => member.importBasecampRows(
      circle.id, UNION, MEMBER, "Local 7 Member", [
        { kind: "bulletin", title: importRollbackTitle, body: "must roll back" },
        { kind: "binder", title: "UNIONOPS_SMOKE_FORCE_ROLLBACK_IMPORT", body: "force failure" },
      ],
    ));
    const partialImport = await owner<{ id: string }[]>`
      SELECT id FROM portal_bulletin_posts WHERE circle_id = ${circle.id} AND title = ${importRollbackTitle}
    `;
    assert(partialImport.length === 0, "failed Basecamp import left a partial Bulletin row");
    await removeFailureTrigger(importFailure);
    const csvImport = await member.importBasecampCsv(
      circle.id, UNION, MEMBER, "Local 7 Member",
      'type,title,body\nbulletin,"CSV post",hello\nbinder,"CSV note","a comma, in the body"',
    );
    assert(csvImport.created === 2 && csvImport.rows === 2, "CSV import did not preserve its row count and records");

    const [threadA, threadB] = await Promise.all([
      president.ensureSidebarThread({ unionId: UNION, fromId: PRESIDENT, fromName: "Local 7 President", toId: MEMBER, toName: "Local 7 Member" }),
      member.ensureSidebarThread({ unionId: UNION, fromId: MEMBER, fromName: "Local 7 Member", toId: PRESIDENT, toName: "Local 7 President" }),
    ]);
    assert(threadA.id === threadB.id, "concurrent Sidebar creation produced duplicate participant threads");
    sidebarThreadIds.push(threadA.id);
    assert((await member.listSidebarThreads(UNION, MEMBER)).some((thread) => thread.id === threadA.id), "Sidebar participant could not list their conversation");
    const message = await president.sendSidebarMessage({
      unionId: UNION, threadId: threadA.id, authorId: PRESIDENT,
      authorName: "Local 7 President", body: `Sidebar ${suffix}`,
    });
    assert(message, "Sidebar message did not persist");
    assert((await member.getSidebarMessages(UNION, MEMBER, threadA.id))?.length === 1, "Sidebar participant could not read messages");
    assert(await member.getSidebarMessages(UNION, "user-joint-404", threadA.id) === null, "nonparticipant read a Sidebar conversation");

    // An explicit Circle relationship works without a selected local, while it
    // does not grant access to unrelated Circles or cross-union content.
    const noLocalMember = new PostgresPortalAdapter({ unionId: UNION, userId: MEMBER });
    assert(await noLocalMember.getCircleDetail(UNION, MEMBER, circle.id), "explicit Circle membership required an unrelated local context");
    const unrelated = new PostgresPortalAdapter({ unionId: UNION, localId: "local-404", userId: "user-joint-404" });
    assert(await unrelated.getCircleDetail(UNION, "user-joint-404", circle.id) === null, "unrelated Circle access succeeded");
    const crossUnion = new PostgresPortalAdapter({ unionId: "union-other", localId: "local-other", userId: MEMBER });
    assert(await crossUnion.getCircleDetail("union-other", MEMBER, circle.id) === null, "cross-union Circle access succeeded");

    const preferences = await member.updateMembership(MEMBER, circle.id, { starred: true, mutedTools: ["floor"] });
    assert(preferences?.starred && preferences.mutedTools.includes("floor"), "membership preferences did not persist");
    const detailWithPin = await president.getCircleDetail(UNION, PRESIDENT, circle.id);
    assert(detailWithPin?.bulletin.some((item) => item.id === post.id && item.pinned), "pinned Bulletin state was not visible in Circle detail");
    assert((await member.search(UNION, MEMBER, `Search needle ${suffix}`)).some((hit) => hit.id === post.id), "Circle search did not find persisted content");
    assert((await president.listStation(UNION, PRESIDENT)).circles.some((item) => item.id === circle.id), "station did not list the persisted Circle");
    assert((await president.oversight(circle.id, UNION)).openCount >= 1, "Circle oversight missed the assigned action");
    assert(await member.softDelete("bulletin", post.id, circle.id, UNION, MEMBER), "member soft-delete failed");
    assert(await president.softDelete("action", completedAction.id, circle.id, UNION, PRESIDENT), "action soft-delete failed");
    assert(await member.softDelete("binder", binderItem.id, circle.id, UNION, MEMBER), "Binder soft-delete failed");
    assert((await president.listAudit(circle.id, UNION)).some((entry) => entry.resourceId === post.id), "central Circle audit did not persist");
    assert((await president.exportActivityPack(circle.id, UNION)) !== null, "activity pack export was empty");
    assert(await president.setFrontDates(circle.id, UNION, new Date().toISOString(), new Date(Date.now() + 86_400_000).toISOString()), "front dates did not persist");
    assert((await president.listFronts(UNION, PRESIDENT)).some((item) => item.id === circle.id), "front list did not include the Circle");

    // Reset the client and re-read durable rows on a new connection.
    resetDbClient();
    const afterReconnect = new PostgresPortalAdapter(presidentScope);
    assert(await afterReconnect.getCircleDetail(UNION, PRESIDENT, circle.id), "Circle content disappeared after client reconnect");
    assert(await afterReconnect.getSidebarMessages(UNION, PRESIDENT, threadA.id), "Sidebar content disappeared after client reconnect");
    assert(await afterReconnect.archiveCircle(circle.id, UNION), "Circle archive failed");
    assert(await afterReconnect.getCircleDetail(UNION, PRESIDENT, circle.id) === null, "archived Circle remained accessible as active content");
    assert(await member.getCircleDetail(UNION, MEMBER, circle.id) === null, "archived Circle remained visible to a regular member");
    const archivedRows = await withRlsContext(memberScope, () => getDb().select({ id: portalCircles.id })
      .from(portalCircles).where(eq(portalCircles.id, circle.id)));
    assert(archivedRows.length === 0, "RLS exposed an archived Circle to a regular member");
    const archivedContent = await withRlsContext(memberScope, () => getDb().select({ id: portalBulletinPosts.id })
      .from(portalBulletinPosts).where(eq(portalBulletinPosts.circleId, circle.id)));
    assert(archivedContent.length === 0, "RLS exposed archived Circle content to a regular member");
    await expectDenied("write to archived Circle", () => member.addFloorMessage({
      circleId: circle.id, unionId: UNION, authorId: MEMBER, authorName: "Local 7 Member", body: "must be denied",
    }));

    console.log("[portal-durability-smoke] ok — Portal operation coverage, transaction rollback, archive RLS, Sidebar access, audit, and reconnect persistence passed as unionops_app");
  } finally {
    resetDbClient();
    for (const trigger of failureTriggers) await removeFailureTrigger(trigger);
    for (const threadId of sidebarThreadIds) await owner`DELETE FROM portal_sidebar_threads WHERE id = ${threadId}`;
    for (const circleId of createdCircleIds) {
      await owner`DELETE FROM audit_log WHERE circle_id = ${circleId}`;
      await owner`DELETE FROM portal_circles WHERE id = ${circleId}`;
    }
    await owner.end({ timeout: 5 });
    resetDbClient();
  }
}

main().catch((error) => {
  console.error("[portal-durability-smoke] failed:", error);
  process.exitCode = 1;
});
