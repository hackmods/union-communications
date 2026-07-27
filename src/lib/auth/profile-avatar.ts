/**
 * Officer profile avatars:
 * - AUTH_USERS_BACKEND=postgres — `users.image` (data URL)
 * - demo / memory — in-memory map (lost on restart)
 */

import { eq } from "drizzle-orm";
import { getDb, isPostgresConfigured } from "@/lib/db/client";
import { users } from "@/lib/db/schema/tenant";

const AVATAR_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
/** Hard cap after client-side resize (~512px JPEG). */
const MAX_AVATAR_BYTES = 400_000;

export type ProfileAvatar = {
  mimeType: string;
  contentBase64: string;
  updatedAt: string;
};

const memoryAvatars = new Map<string, ProfileAvatar>();

function usersBackendEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    env.AUTH_USERS_BACKEND?.trim().toLowerCase() === "postgres" &&
    isPostgresConfigured(env)
  );
}

export function validateProfileAvatarInput(input: {
  mimeType: string;
  contentBase64: string;
}): string | null {
  if (!AVATAR_MIMES.has(input.mimeType)) {
    return "Profile photos must be JPEG, PNG, or WebP";
  }
  if (!input.contentBase64?.trim()) {
    return "Photo content is required";
  }
  const approxBytes = Math.ceil((input.contentBase64.length * 3) / 4);
  if (approxBytes > MAX_AVATAR_BYTES) {
    return "Photo is too large — try a smaller image";
  }
  return null;
}

function parseDataUrl(dataUrl: string): ProfileAvatar | null {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/i.exec(
    dataUrl.trim(),
  );
  if (!match) return null;
  return {
    mimeType: match[1].toLowerCase(),
    contentBase64: match[2],
    updatedAt: new Date().toISOString(),
  };
}

function toDataUrl(avatar: ProfileAvatar): string {
  return `data:${avatar.mimeType};base64,${avatar.contentBase64}`;
}

export async function getProfileAvatar(
  userId: string,
): Promise<ProfileAvatar | null> {
  if (usersBackendEnabled()) {
    const db = getDb();
    const rows = await db
      .select({ image: users.image })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const image = rows[0]?.image;
    if (!image) return null;
    return parseDataUrl(image);
  }
  return memoryAvatars.get(userId) ?? null;
}

export async function setProfileAvatar(
  userId: string,
  input: { mimeType: string; contentBase64: string },
): Promise<{ avatar?: ProfileAvatar; error?: string }> {
  const validation = validateProfileAvatarInput(input);
  if (validation) return { error: validation };

  const avatar: ProfileAvatar = {
    mimeType: input.mimeType,
    contentBase64: input.contentBase64.replace(/\s/g, ""),
    updatedAt: new Date().toISOString(),
  };

  if (usersBackendEnabled()) {
    const db = getDb();
    await db
      .update(users)
      .set({ image: toDataUrl(avatar) })
      .where(eq(users.id, userId));
    return { avatar };
  }

  memoryAvatars.set(userId, avatar);
  return { avatar };
}

export async function clearProfileAvatar(userId: string): Promise<void> {
  if (usersBackendEnabled()) {
    const db = getDb();
    await db.update(users).set({ image: null }).where(eq(users.id, userId));
    return;
  }
  memoryAvatars.delete(userId);
}

/** Test helper — wipe memory avatars between unit tests. */
export function __resetMemoryProfileAvatarsForTests(): void {
  memoryAvatars.clear();
}
