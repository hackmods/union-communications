import { afterEach, describe, expect, it } from "vitest";
import {
  assertEnterpriseEmailCapability,
  getEnterpriseEmailHostFlags,
} from "@/lib/email/enterprise-gates";

describe("enterprise email gates", () => {
  afterEach(() => {
    delete process.env.UNIONOPS_MEMBER_BROADCAST_ENABLED;
    delete process.env.UNIONOPS_OUTREACH_LISTS_ENABLED;
    delete process.env.UNIONOPS_COMMS_AUTO_SEND_ENABLED;
    delete process.env.UNIONOPS_GRIEVANCE_SMTP_ENABLED;
    delete process.env.UNIONOPS_EMAIL_TRACKING_PIXELS_ENABLED;
    delete process.env.EMAIL_ENABLED;
  });

  it("reports all host flags off by default", () => {
    expect(getEnterpriseEmailHostFlags()).toEqual({
      member_broadcast: false,
      outreach_lists: false,
      comms_auto_send: false,
      grievance_smtp: false,
      tracking_pixels: false,
    });
  });

  it("fails outreach lists closed without full legal config", async () => {
    process.env.UNIONOPS_OUTREACH_LISTS_ENABLED = "true";
    const result = await assertEnterpriseEmailCapability("outreach_lists", "union-1");
    expect(result.ok).toBe(false);
  });

  it("fails closed when CapRover flag is off", async () => {
    const result = await assertEnterpriseEmailCapability(
      "member_broadcast",
      "union-1",
    );
    expect(result).toEqual({ ok: false, reason: "host_disabled" });
  });

  it("requires EMAIL_ENABLED for member broadcast after host flag", async () => {
    process.env.UNIONOPS_MEMBER_BROADCAST_ENABLED = "true";
    const result = await assertEnterpriseEmailCapability(
      "member_broadcast",
      "union-1",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(["email_transport_disabled", "durable_storage_missing"]).toContain(
        result.reason,
      );
    }
  });
});
