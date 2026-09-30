import { describe, expect, it } from "vitest";
import {
  createMemberBroadcastToken,
  verifyMemberBroadcastToken,
} from "./member-broadcast-config";

const key = "this-is-a-stable-member-broadcast-signing-key-01";

describe("member-broadcast action links", () => {
  const now = Date.parse("2026-09-30T12:00:00.000Z");

  it("issues and verifies scoped unsubscribe tokens", () => {
    const issued = createMemberBroadcastToken(
      {
        purpose: "unsubscribe",
        expiresAt: new Date(now + 65 * 86400_000),
        unionId: "union-1",
        localId: "local-1",
        userId: "user-1",
      },
      [key],
    );
    expect(issued.token.includes(".")).toBe(true);
    expect(
      verifyMemberBroadcastToken(issued.token, "unsubscribe", [key], now),
    ).toEqual({
      hash: issued.hash,
      unionId: "union-1",
      localId: "local-1",
      userId: "user-1",
    });
    expect(
      verifyMemberBroadcastToken(issued.token, "unsubscribe", [key], now + 66 * 86400_000),
    ).toBeNull();
  });
});
