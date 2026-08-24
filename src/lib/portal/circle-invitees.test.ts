import { describe, expect, it } from "vitest";
import { listCircleInviteCandidates } from "./circle-invitees";

describe("listCircleInviteCandidates", () => {
  it("includes people from more than one local in the same union", async () => {
    const invitees = await listCircleInviteCandidates("union-opseu");
    const ids = invitees.map((user) => user.id);
    expect(ids).toContain("user-president-243");
    expect(ids).toContain("user-president-560");
    expect(ids).toContain("user-eerc-145");
    expect(ids).toContain("user-president-415");
    expect(ids).not.toContain("user-solo");
  });
});
