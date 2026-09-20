import { describe, expect, it } from "vitest";
import { listCircleInviteCandidates } from "./circle-invitees";

describe("listCircleInviteCandidates", () => {
  it("includes people from more than one local in the same union", async () => {
    const invitees = await listCircleInviteCandidates("union-b7p");
    const ids = invitees.map((user) => user.id);
    expect(ids).toContain("user-president-7");
    expect(ids).toContain("user-president-1337");
    expect(ids).toContain("user-joint-404");
    expect(ids).toContain("user-president-502");
    expect(ids).not.toContain("user-solo");
  });
});
