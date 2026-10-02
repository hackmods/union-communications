import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { buildHealthStatus } from "@/lib/ops/health-status";

function canReadOperationalEvidence(request: Request): boolean {
  const expected = process.env.HOST_READINESS_SECRET?.trim();
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  const supplied = match?.[1]?.trim();
  if (!expected || !supplied) return false;

  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return (
    expectedBytes.length >= 32 &&
    expectedBytes.length === suppliedBytes.length &&
    timingSafeEqual(expectedBytes, suppliedBytes)
  );
}

function publicHealthPayload(
  status: Awaited<ReturnType<typeof buildHealthStatus>>,
) {
  const { hostedControlEvidence, opsLifecycleNotify, ...publicStatus } = status;
  void hostedControlEvidence;
  void opsLifecycleNotify;
  return publicStatus;
}

async function healthResponse(request: Request) {
  const status = await buildHealthStatus();
  const body = canReadOperationalEvidence(request)
    ? status
    : publicHealthPayload(status);
  return NextResponse.json(body, {
    status: status.status === "ok" ? 200 : 503,
  });
}

export async function GET(request: Request) {
  return healthResponse(request);
}

export async function HEAD(request: Request) {
  return healthResponse(request);
}
