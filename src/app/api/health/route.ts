import { NextResponse } from "next/server";
import { buildHealthStatus } from "@/lib/ops/health-status";

async function healthResponse() {
  const status = await buildHealthStatus();
  return NextResponse.json(status, { status: status.status === "ok" ? 200 : 503 });
}

export async function GET() {
  return healthResponse();
}

export async function HEAD() {
  return healthResponse();
}
