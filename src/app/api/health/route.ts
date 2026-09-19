import { NextResponse } from "next/server";
import {
  buildHealthStatusWithProbe,
} from "@/lib/ops/health-status";

async function healthResponse() {
  const status = await buildHealthStatusWithProbe();
  // Operators want the probe to be visible but don't want smoke checks to fail
  // because of one missing column. The probe's `journalInSync` flag already
  // flips `status` to `degraded`; we 503 only when the operator explicitly
  // opts in via HEALTH_FAIL_ON_DRIFT=true (runbook / CI verification).
  const failOnDrift = process.env.HEALTH_FAIL_ON_DRIFT === "true";
  if (failOnDrift && status.schemaProbe.postgresConfigured && !status.schemaProbe.journalInSync) {
    return NextResponse.json(status, { status: 503 });
  }
  return NextResponse.json(status);
}

export async function GET() {
  return healthResponse();
}

export async function HEAD() {
  return healthResponse();
}