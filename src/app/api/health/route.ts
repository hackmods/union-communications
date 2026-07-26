import { NextResponse } from "next/server";
import { buildHealthStatus } from "@/lib/ops/health-status";

function healthResponse() {
  return NextResponse.json(buildHealthStatus());
}

export function GET() {
  return healthResponse();
}

export function HEAD() {
  return healthResponse();
}
