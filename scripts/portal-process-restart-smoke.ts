/**
 * Exercise Local Portal data through a full Next standalone server restart.
 *
 * Requires a completed `npm run build`, a seeded disposable Postgres database,
 * and separate owner/runtime URLs. Only the app child is stopped/restarted;
 * no production database or persisted runtime data is touched.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { cpSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Page } from "@playwright/test";
import postgres from "postgres";
import { resetDbClient } from "../src/lib/db/client";
import { PostgresPortalAdapter } from "../src/lib/portal/postgres-adapter";
import type { RlsSessionContext } from "../src/lib/db/rls-context";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const UNION = "union-b7p";
const LOCAL = "local-7";
const PRESIDENT = "user-president-7";
const MEMBER = "user-member-7";
const PRESIDENT_EMAIL = "president.7@unionops.test";
const MEMBER_EMAIL = "member.7@unionops.test";
const PASSWORD = "demo123";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

type Fixture = {
  circleId: string;
  sidebarId: string;
  marker: string;
  createdCircleIds: string[];
  sidebarIds: string[];
};

type CircleDetail = {
  circle: { id: string };
  bulletin?: Array<{ title?: string }>;
  comments?: Array<{ body?: string }>;
  actions?: Array<{ title?: string }>;
  calendar?: Array<{ title?: string }>;
  binder?: Array<{ title?: string }>;
  floor?: Array<{ body?: string }>;
  rollCallQuestions?: Array<{ question?: string }>;
  rollCallAnswers?: Array<{ body?: string }>;
  pipelineCards?: Array<{ title?: string }>;
  momentum?: Array<{ title?: string }>;
};

type PortalApiBody = {
  detail?: CircleDetail;
  messages?: Array<{ body?: string }>;
  items?: Array<{ kind?: string; title?: string }>;
};

async function createFixture(): Promise<Fixture> {
  const marker = `Restart ${new Date().toISOString()} ${Math.random().toString(36).slice(2, 8)}`;
  const presidentScope: RlsSessionContext = {
    unionId: UNION, localId: LOCAL, userId: PRESIDENT, mfaVerified: true,
  };
  const memberScope: RlsSessionContext = { unionId: UNION, localId: LOCAL, userId: MEMBER };
  const president = new PostgresPortalAdapter(presidentScope);
  const member = new PostgresPortalAdapter(memberScope);
  const createdCircleIds: string[] = [];
  const sidebarIds: string[] = [];

  const circle = await president.createCircle({
    unionId: UNION, localId: LOCAL, kind: "committee", name: `Restart ${marker}`,
    description: "Process restart smoke fixture", visibility: "invited",
    createdById: PRESIDENT, createdByName: "Local 7 President", template: "jhsc",
  });
  createdCircleIds.push(circle.id);
  await president.inviteToRoster({ circleId: circle.id, userId: MEMBER, userName: "Local 7 Member" });

  const post = await president.addBulletin({
    circleId: circle.id, unionId: UNION, authorId: PRESIDENT, authorName: "Local 7 President",
    title: `Bulletin ${marker}`, body: `@Local 7 Member ${marker}`,
  });
  await member.addComment({
    circleId: circle.id, unionId: UNION, postId: post.id,
    authorId: MEMBER, authorName: "Local 7 Member", body: `Comment ${marker}`,
  });
  await president.addAction({
    circleId: circle.id, unionId: UNION, listName: "Restart", title: `Action ${marker}`,
    assigneeId: MEMBER, createdById: PRESIDENT,
  });
  await member.addCalendarEvent({
    circleId: circle.id, unionId: UNION, title: `Calendar ${marker}`,
    startsAt: new Date(Date.now() + 86_400_000).toISOString(), createdById: MEMBER,
  });
  await member.addBinderItem({
    circleId: circle.id, unionId: UNION, title: `Binder ${marker}`, content: marker,
    contentType: "note", createdById: MEMBER, createdByName: "Local 7 Member",
  });
  await member.addFloorMessage({
    circleId: circle.id, unionId: UNION, authorId: MEMBER,
    authorName: "Local 7 Member", body: `Floor ${marker}`,
  });
  const question = await president.addRollCallQuestion({
    circleId: circle.id, unionId: UNION, question: `Question ${marker}`, cadence: "monthly",
  });
  await member.addRollCallAnswer({
    questionId: question.id, circleId: circle.id, authorId: MEMBER,
    authorName: "Local 7 Member", body: `Answer ${marker}`,
  });
  const board = await president.ensurePipelineBoard({ circleId: circle.id, unionId: UNION });
  assert(board, "Many hands board was not created");
  const detail = await president.getCircleDetail(UNION, PRESIDENT, circle.id);
  const column = detail?.pipelineColumns[0];
  assert(column, "Many hands default column was not created");
  await member.addPipelineCard({
    circleId: circle.id, unionId: UNION, boardId: board.id, columnId: column.id,
    title: `Many hands ${marker}`,
  });
  await president.upsertMomentum({
    circleId: circle.id, unionId: UNION, title: `One fight ${marker}`, progress: 41,
    updatedById: PRESIDENT, updatedByName: "Local 7 President",
  });
  const sidebar = await president.ensureSidebarThread({
    unionId: UNION, fromId: PRESIDENT, fromName: "Local 7 President",
    toId: MEMBER, toName: "Local 7 Member",
  });
  sidebarIds.push(sidebar.id);
  await president.sendSidebarMessage({
    unionId: UNION, threadId: sidebar.id, authorId: PRESIDENT,
    authorName: "Local 7 President", body: `Sidebar ${marker}`,
  });

  return { circleId: circle.id, sidebarId: sidebar.id, marker, createdCircleIds, sidebarIds };
}

function startServer(baseUrl: URL, secret: string): ChildProcess {
  const standaloneDir = path.join(root, ".next", "standalone");
  const serverJs = path.join(standaloneDir, "server.js");
  const staticSrc = path.join(root, ".next", "static");
  const staticDest = path.join(standaloneDir, ".next", "static");
  const publicSrc = path.join(root, "public");
  const publicDest = path.join(standaloneDir, "public");
  if (existsSync(staticSrc)) cpSync(staticSrc, staticDest, { recursive: true });
  if (existsSync(publicSrc)) cpSync(publicSrc, publicDest, { recursive: true });

  return spawn(process.execPath, [serverJs], {
    cwd: standaloneDir,
    stdio: "ignore",
    env: {
      ...process.env,
      MIGRATE_DATABASE_URL: undefined,
      AUTH_SECRET: secret,
      AUTH_URL: baseUrl.origin,
      NEXTAUTH_URL: baseUrl.origin,
      AUTH_TRUST_HOST: "true",
      AUTH_USERS_BACKEND: "postgres",
      AUTH_ALLOW_DEMO_USERS: "true",
      AUTH_MFA_ENABLED: "false",
      PORT: baseUrl.port,
      HOSTNAME: "127.0.0.1",
      NODE_ENV: "production",
      PORTAL_DB_BACKEND: "postgres",
    },
  });
}

async function waitForServer(child: ChildProcess, baseUrl: URL): Promise<void> {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Next server exited early (${child.exitCode}).`);
    try {
      const response = await fetch(new URL("/api/auth/providers", baseUrl));
      if (response.ok) return;
    } catch {
      // Continue until the server is ready or the bounded deadline expires.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Timed out waiting for the Next standalone server.");
}

async function stopServer(child: ChildProcess | undefined): Promise<void> {
  if (!child || child.exitCode !== null) return;
  const exitEvent = new Promise<void>((resolve) => child.once("exit", () => resolve()));
  child.kill("SIGTERM");
  const stopped = await Promise.race([
    exitEvent.then(() => true),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 10_000)),
  ]);
  if (!stopped && child.pid) {
    if (process.platform === "win32") {
      const { execFileSync } = await import("node:child_process");
      execFileSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      child.kill("SIGKILL");
    }
    await new Promise<void>((resolve) => child.once("exit", () => resolve()));
  }
}

async function login(page: Page, baseUrl: URL, email: string): Promise<void> {
  await page.goto(new URL("/en/app/login", baseUrl).toString(), { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await page.locator("input[type='email']").fill(email);
  await page.locator("input[type='password']").fill(PASSWORD);
  const authTrace: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/api/auth/")) authTrace.push(`${request.method()} ${url.pathname}`);
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.pathname.startsWith("/api/auth/")) authTrace.push(`${response.status()} ${url.pathname}`);
  });
  const callbackResponse = page.waitForResponse((response) =>
    response.url().includes("/api/auth/callback/credentials"), { timeout: 10_000 },
  ).catch(() => null);
  await page.locator("form button[type='submit']").click();
  const callback = await callbackResponse;
  const callbackBody = await callback?.json().catch(() => null) as { error?: string } | null;
  await page.waitForTimeout(500);
  const alert = (await page.getByRole("alert").allTextContents()).map((text) => text.trim()).filter(Boolean);
  const session = await page.evaluate(async () => {
    const response = await fetch("/api/auth/session", { cache: "no-store" });
    return { status: response.status, body: await response.json() as { user?: { id?: string } } | null };
  });
  if (session.status !== 200 || !session.body?.user?.id) {
    throw new Error(`Credentials produced no active session at ${page.url()} (callback HTTP ${callback?.status() ?? "none"}, error ${callbackBody?.error ?? "none"}; session HTTP ${session.status}, body ${session.body === null ? "null" : "missing user"}; auth requests ${authTrace.join(", ") || "none"}; alert ${alert.join(" ") || "none"}).`);
  }
}

async function apiJson(page: Page, pathname: string): Promise<{ status: number; body: PortalApiBody }> {
  return page.evaluate(async (url) => {
    const response = await fetch(url, { cache: "no-store" });
    return { status: response.status, body: await response.json() as PortalApiBody };
  }, pathname) as Promise<{ status: number; body: PortalApiBody }>;
}

function assertDetail(detail: CircleDetail | undefined, fixture: Fixture): void {
  assert(detail?.circle?.id === fixture.circleId, "Circle identity did not persist");
  const containsMarker = <T>(rows: T[] | undefined, read: (row: T) => string | undefined, prefix: string) =>
    rows?.some((row) => read(row)?.includes(`${prefix} ${fixture.marker}`)) ?? false;
  assert(containsMarker(detail?.bulletin, (row) => row.title, "Bulletin"), "Bulletin did not survive app restart");
  assert(containsMarker(detail?.comments, (row) => row.body, "Comment"), "Bulletin comment did not survive app restart");
  assert(containsMarker(detail?.actions, (row) => row.title, "Action"), "Action did not survive app restart");
  assert(containsMarker(detail?.calendar, (row) => row.title, "Calendar"), "Calendar event did not survive app restart");
  assert(containsMarker(detail?.binder, (row) => row.title, "Binder"), "Binder record did not survive app restart");
  assert(containsMarker(detail?.floor, (row) => row.body, "Floor"), "Floor message did not survive app restart");
  assert(containsMarker(detail?.rollCallQuestions, (row) => row.question, "Question"), "Roll Call question did not survive app restart");
  assert(containsMarker(detail?.rollCallAnswers, (row) => row.body, "Answer"), "Roll Call answer did not survive app restart");
  assert(containsMarker(detail?.pipelineCards, (row) => row.title, "Many hands"), "Many hands card did not survive app restart");
  assert(containsMarker(detail?.momentum, (row) => row.title, "One fight"), "One fight item did not survive app restart");
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) throw new Error("DATABASE_URL for unionops_app is required.");
  if (!process.env.MIGRATE_DATABASE_URL?.trim()) throw new Error("MIGRATE_DATABASE_URL for disposable cleanup is required.");
  if (!process.env.PORTAL_DB_BACKEND || process.env.PORTAL_DB_BACKEND !== "postgres") throw new Error("PORTAL_DB_BACKEND=postgres is required.");
  const standaloneServer = path.join(root, ".next", "standalone", "server.js");
  if (!existsSync(standaloneServer)) throw new Error("Run npm run build before this process-restart smoke.");

  const fixture = await createFixture();
  resetDbClient();
  const port = Number(process.env.PORTAL_RESTART_SMOKE_PORT ?? 3197);
  const baseUrl = new URL(`http://127.0.0.1:${port}`);
  const secret = process.env.AUTH_SECRET?.trim() || `local-smoke-${randomUUID()}-${randomUUID()}`;
  const browser = await chromium.launch({ headless: true });
  let server: ChildProcess | undefined;
  const page = await browser.newPage();
  try {
    server = startServer(baseUrl, secret);
    await waitForServer(server, baseUrl);
    await login(page, baseUrl, PRESIDENT_EMAIL);
    const presidentDetail = await apiJson(page, `/api/portal/circles/${encodeURIComponent(fixture.circleId)}`);
    assert(presidentDetail.status === 200, `Circle API returned ${presidentDetail.status} before restart`);
    assertDetail(presidentDetail.body.detail, fixture);
    const sidebar = await apiJson(page, `/api/portal/sidebars?threadId=${encodeURIComponent(fixture.sidebarId)}`);
    assert(sidebar.status === 200 && sidebar.body.messages?.some((row) => row.body?.includes(`Sidebar ${fixture.marker}`)), "Sidebar message did not persist before restart");

    const firstPid = server.pid;
    await stopServer(server);
    server = undefined;
    const restarted = startServer(baseUrl, secret);
    server = restarted;
    await waitForServer(restarted, baseUrl);
    assert(restarted.pid !== firstPid, "Next app process did not restart");

    const afterRestart = await apiJson(page, `/api/portal/circles/${encodeURIComponent(fixture.circleId)}`);
    assert(afterRestart.status === 200, `Circle API returned ${afterRestart.status} after restart`);
    assertDetail(afterRestart.body.detail, fixture);
    const restartedSidebar = await apiJson(page, `/api/portal/sidebars?threadId=${encodeURIComponent(fixture.sidebarId)}`);
    assert(restartedSidebar.status === 200 && restartedSidebar.body.messages?.some((row) => row.body?.includes(`Sidebar ${fixture.marker}`)), "Sidebar message did not persist after restart");

    const memberPage = await browser.newPage();
    await login(memberPage, baseUrl, MEMBER_EMAIL);
    const dispatch = await apiJson(memberPage, "/api/portal/dispatch");
    assert(dispatch.status === 200 && dispatch.body.items?.some((row) => row.kind === "assignment" && row.title === `Action assigned: Action ${fixture.marker}`), "member Dispatch assignment did not persist after restart");
    const memberDetail = await apiJson(memberPage, `/api/portal/circles/${encodeURIComponent(fixture.circleId)}`);
    assert(memberDetail.status === 200, "Circle membership did not persist for the member after restart");
    await memberPage.close();
    console.log("[portal-process-restart-smoke] ok — full standalone server restart preserved Circle tools, Dispatch, membership, and Sidebar data as unionops_app");
  } finally {
    await stopServer(server);
    await browser.close();
    resetDbClient();
    const owner = postgres(process.env.MIGRATE_DATABASE_URL!, { max: 1 });
    try {
      for (const threadId of fixture.sidebarIds) await owner`DELETE FROM portal_sidebar_threads WHERE id = ${threadId}`;
      for (const circleId of fixture.createdCircleIds) {
        await owner`DELETE FROM audit_log WHERE circle_id = ${circleId}`;
        await owner`DELETE FROM portal_circles WHERE id = ${circleId}`;
      }
    } finally {
      await owner.end({ timeout: 5 });
    }
  }
}

main().catch((error) => {
  console.error("[portal-process-restart-smoke] failed:", error);
  process.exitCode = 1;
});
