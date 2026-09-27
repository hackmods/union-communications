import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/health/route";
import { buildHealthStatus, type HealthStatus } from "@/lib/ops/health-status";

vi.mock("@/lib/ops/health-status", () => ({
  buildHealthStatus: vi.fn(),
}));

const previousSecret = process.env.HOST_READINESS_SECRET;

afterEach(() => {
  vi.clearAllMocks();
  if (previousSecret === undefined) delete process.env.HOST_READINESS_SECRET;
  else process.env.HOST_READINESS_SECRET = previousSecret;
});

function sampleStatus(): HealthStatus {
  return {
    status: "ok",
    hostedControlEvidence: {
      attachmentStorageApproved: true,
      strictUploadScan: true,
      backupRestoreEvidence: true,
      alertDeliveryEvidence: true,
    },
  } as HealthStatus;
}

describe("GET /api/health operational evidence", () => {
  const secret = "private-readiness-key-0123456789-ABCDEF0123456789";

  it("omits operational evidence without operator authorization", async () => {
    process.env.HOST_READINESS_SECRET = secret;
    vi.mocked(buildHealthStatus).mockResolvedValue(sampleStatus());

    const response = await GET(new Request("http://localhost/api/health"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).not.toHaveProperty("hostedControlEvidence");
  });

  it("returns operator evidence only for the dedicated bearer secret", async () => {
    process.env.HOST_READINESS_SECRET = secret;
    vi.mocked(buildHealthStatus).mockResolvedValue(sampleStatus());

    const denied = await GET(
      new Request("http://localhost/api/health", {
        headers: { authorization: "Bearer wrong-key" },
      }),
    );
    expect(await denied.json()).not.toHaveProperty("hostedControlEvidence");

    const authorized = await GET(
      new Request("http://localhost/api/health", {
        headers: { authorization: `Bearer ${secret}` },
      }),
    );
    expect(await authorized.json()).toHaveProperty("hostedControlEvidence", {
      attachmentStorageApproved: true,
      strictUploadScan: true,
      backupRestoreEvidence: true,
      alertDeliveryEvidence: true,
    });
  });
});
