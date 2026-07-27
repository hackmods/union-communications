import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import {
  clearProfileAvatar,
  getProfileAvatar,
  setProfileAvatar,
} from "@/lib/auth/profile-avatar";
import { parseJsonBody } from "@/lib/validation/parse";

const putSchema = z.object({
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  contentBase64: z.string().min(1).max(600_000),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const avatar = await getProfileAvatar(session.user.id);
  if (!avatar) {
    return new NextResponse(null, { status: 404 });
  }

  const buffer = Buffer.from(avatar.contentBase64, "base64");
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": avatar.mimeType,
      "Cache-Control": "private, no-store",
      "Last-Modified": avatar.updatedAt,
    },
  });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseJsonBody(putSchema, raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.issues },
      { status: 400 },
    );
  }

  const result = await setProfileAvatar(session.user.id, parsed.data);
  if (result.error || !result.avatar) {
    return NextResponse.json(
      { error: result.error ?? "Could not save photo" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    updatedAt: result.avatar.updatedAt,
    imageUrl: `/api/profile/avatar?t=${encodeURIComponent(result.avatar.updatedAt)}`,
  });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await clearProfileAvatar(session.user.id);
  return NextResponse.json({ ok: true });
}
