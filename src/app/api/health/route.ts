import { NextResponse } from "next/server";
import { buildHealthStatus } from "@/lib/ops/health-status";
import { readPlatformMeta } from "@/lib/db/platform-meta";

async function healthResponse() {
  const status = buildHealthStatus();
  const meta = await readPlatformMeta();
  if (meta) {
    status.schemaVersion = meta.schemaVersion;
    status.dataVersion = meta.dataVersion;
  }
  return NextResponse.json(status);
}

export async function GET() {
  return healthResponse();
}

export async function HEAD() {
  return healthResponse();
}