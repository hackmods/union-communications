import { NextResponse } from "next/server";
import {
  assertTimeView,
  requireTimeSession,
} from "@/lib/auth/time-session";
import { attachmentStore } from "@/lib/attachments/store";
import { timeStore } from "@/lib/time/store";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const authResult = await requireTimeSession();
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status },
    );
  }

  const { id } = await params;
  const entry = await timeStore.getEntryById(id);
  if (!entry || !assertTimeView(authResult.session, entry)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const attachments = await attachmentStore.listForTimeEntry(id);
  return NextResponse.json({ attachments });
}
