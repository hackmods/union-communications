import { describe, expect, it } from "vitest";
import { autoAckIssuesOnDeploy } from "@/lib/observability/auto-ack-deploy";

describe("autoAckIssuesOnDeploy", () => {
  it("skips when env disabled", async () => {
    const result = await autoAckIssuesOnDeploy({ commit: "abc1234" });
    expect(result.skipped).toBe("disabled");
    expect(result.acknowledged).toBe(0);
  });
});
