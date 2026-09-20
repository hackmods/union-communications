import { NextResponse } from "next/server";
import { buildHealthStatus } from "@/lib/ops/health-status";

function healthResponse() {
  const status = buildHealthStatus();
  return NextResponse.json(status, { status: status.status === "ok" ? 200 : 503 });
}

export function GET() {
  return healthResponse();
}

export function HEAD() {
  return healthResponse();
}
