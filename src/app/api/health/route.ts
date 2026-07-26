import { NextResponse } from "next/server";
import { buildHealthStatus } from "@/lib/ops/health-status";

export function GET() {
  return NextResponse.json(buildHealthStatus());
}
