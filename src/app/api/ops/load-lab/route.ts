import { NextResponse } from "next/server";
import {
  getLoadLabStatusAsync,
  isLoadLabEnabled,
  loadLabStartSchema,
  startLoadLabRun,
} from "@/lib/ops/load-lab";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { reportApiFailure } from "@/lib/observability/report-server-error";

/**
 * GET /api/ops/load-lab — live status (platform_admin).
 * POST /api/ops/load-lab — start a run (platform_admin + flags).
 */
export async function GET() {
  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }
  return NextResponse.json(await getLoadLabStatusAsync(), {
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(req: Request) {
  try {
    if (!isLoadLabEnabled()) {
      return NextResponse.json(
        {
          error:
            "Load Lab is disabled. Set LOAD_LAB_ENABLED=true on this host.",
        },
        { status: 403 },
      );
    }
    const json = await req.json().catch(() => null);
    const parsed = loadLabStartSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid load lab configuration", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const body = parsed.data;
    const rawBase = body.baseUrl?.trim();
    let baseUrl: string | undefined;
    if (rawBase) {
      try {
        baseUrl = new URL(rawBase).toString().replace(/\/$/, "");
      } catch {
        return NextResponse.json(
          { error: "baseUrl must be a valid absolute URL" },
          { status: 400 },
        );
      }
    }
    const result = await startLoadLabRun({
      profile: body.profile,
      envName: body.envName,
      baseUrl,
      vus: body.vus,
      durationSec: body.durationSec,
      rampSec: body.rampSec,
      username: body.username,
      password: body.password,
      allowProduction: body.allowProduction,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result.status, {
      status: 202,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (err) {
    reportApiFailure(err, "/api/ops/load-lab");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
