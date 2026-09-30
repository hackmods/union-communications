import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export const MEMBER_BROADCAST_UNSUBSCRIBE_LINK_DAYS = 65;

export type MemberBroadcastTokenPurpose = "unsubscribe";

type TokenPayload = {
  id: string;
  purpose: MemberBroadcastTokenPurpose;
  exp: number;
  unionId: string;
  localId: string;
  userId: string;
};

export function readMemberBroadcastTokenKeys(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const raw =
    env.UNIONOPS_MEMBER_BROADCAST_TOKEN_KEYS ??
    env.UNIONOPS_PRODUCT_NEWS_TOKEN_KEYS ??
    "";
  return raw.split(",").map((entry) => entry.trim()).filter(Boolean);
}

export function createMemberBroadcastToken(
  input: {
    purpose: MemberBroadcastTokenPurpose;
    expiresAt: Date;
    unionId: string;
    localId: string;
    userId: string;
  },
  keys: readonly string[],
): { token: string; hash: string; id: string } {
  if (!keys[0] || keys[0].length < 32) {
    throw new Error("Member-broadcast signing key is not configured");
  }
  const payload: TokenPayload = {
    id: randomUUID(),
    purpose: input.purpose,
    exp: input.expiresAt.getTime(),
    unionId: input.unionId,
    localId: input.localId,
    userId: input.userId,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", keys[0]).update(encoded).digest("base64url");
  const token = encoded + "." + signature;
  return { token, hash: memberBroadcastTokenHash(token), id: payload.id };
}

export function memberBroadcastTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function verifyMemberBroadcastToken(
  token: unknown,
  purpose: MemberBroadcastTokenPurpose,
  keys: readonly string[],
  now = Date.now(),
): { hash: string; unionId: string; localId: string; userId: string } | null {
  if (
    typeof token !== "string" ||
    token.length > 768 ||
    !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)
  ) {
    return null;
  }
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  let payload: TokenPayload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as TokenPayload;
  } catch {
    return null;
  }
  if (
    !payload ||
    payload.purpose !== purpose ||
    typeof payload.id !== "string" ||
    !/^[0-9a-f-]{36}$/.test(payload.id) ||
    typeof payload.unionId !== "string" ||
    payload.unionId.length < 4 ||
    typeof payload.localId !== "string" ||
    payload.localId.length < 4 ||
    typeof payload.userId !== "string" ||
    payload.userId.length < 4 ||
    !Number.isSafeInteger(payload.exp) ||
    payload.exp <= now
  ) {
    return null;
  }
  const expected = Buffer.from(signature, "base64url");
  if (expected.length !== 32) return null;
  const valid = keys.some((key) => {
    const actual = createHmac("sha256", key).update(encoded).digest();
    return timingSafeEqual(actual, expected);
  });
  if (!valid) return null;
  return {
    hash: memberBroadcastTokenHash(token),
    unionId: payload.unionId,
    localId: payload.localId,
    userId: payload.userId,
  };
}
