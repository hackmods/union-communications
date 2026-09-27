import { afterEach, describe, expect, it } from "vitest";
import {
  MemoryAuditLogAdapter,
  resetMemoryAuditLogForTests,
} from "@/lib/audit/memory-adapter";
import { createAuditRequestContext } from "@/lib/audit/request-correlation";

afterEach(() => resetMemoryAuditLogForTests());

describe("audit outcome and request correlation", () => {
  it("keeps explicit outcomes and server request IDs", async () => {
    const adapter = new MemoryAuditLogAdapter();
    const requestId = "3d770086-5bee-4ec8-b0f7-2e489c8f53ac";
    const created = await adapter.log({
      userId: "operator-1",
      action: "auth.mfa_verify_failed",
      resourceType: "session",
      resourceId: "operator-1",
      outcome: "denied",
      requestId,
    });

    expect(created).toMatchObject({ outcome: "denied", requestId });
    expect(await adapter.query({ resourceType: "session" })).toContainEqual(created);
  });

  it("defaults newly recorded legacy events to successful completion", async () => {
    const adapter = new MemoryAuditLogAdapter();
    const created = await adapter.log({
      userId: "operator-1",
      action: "site_admin.updated",
      resourceType: "site_admin",
      resourceId: "resource-1",
    });
    expect(created.outcome).toBe("success");
  });

  it("creates a server-owned request ID and replaces forged response headers", () => {
    const context = createAuditRequestContext();
    const headers = context.responseHeaders({ "X-Request-ID": "forged-by-client" });
    expect(context.requestId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(headers.get("X-Request-ID")).toBe(context.requestId);
  });
});
