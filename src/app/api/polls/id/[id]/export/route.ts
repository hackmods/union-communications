import { NextResponse } from "next/server";
import { auditLog } from "@/lib/audit/store";
import {
  assertPollView,
  requirePollsSession,
} from "@/lib/auth/polls-session";
import {
  buildPollResultsCsv,
  buildPollResultsXlsx,
} from "@/lib/polls/export";
import { pollsStore } from "@/lib/polls/store";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await requirePollsSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { session } = authResult;
  const { id } = await context.params;
  const poll = await pollsStore.getById(id);
  if (!poll || !assertPollView(session, poll)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const aggregates = await pollsStore.aggregates(id);
  if (!aggregates) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await auditLog.log({
    userId: session.user.id,
    action: "polls.export",
    resourceType: "poll_definition",
    resourceId: poll.id,
    unionId: poll.unionId,
    localId: poll.localId,
  });

  const format = new URL(request.url).searchParams.get("format") ?? "csv";
  const safeSlug = poll.slug.replace(/[^\w.-]+/g, "_").slice(0, 40);

  try {
    if (format === "xlsx") {
      const buf = await buildPollResultsXlsx({ poll, aggregates });
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="poll-${safeSlug}-results.xlsx"`,
        },
      });
    }

    const csv = await buildPollResultsCsv({ poll, aggregates });
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="poll-${safeSlug}-results.csv"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
