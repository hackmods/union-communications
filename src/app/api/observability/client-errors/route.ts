import { NextResponse } from "next/server";
import { z } from "zod";
import { classifyServerError } from "@/lib/observability/signal-classify";
import {
  checkClientErrorRateLimit,
  extractClientErrorIp,
  hashClientErrorIp,
} from "@/lib/observability/client-error-rate-limit";
import { observabilityStore } from "@/lib/observability/store";
import { resolveObservabilityConfig } from "@/lib/observability/config";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    message: z.string().min(1).max(2_000),
    name: z.string().max(200).optional(),
    stack: z.string().max(8_000).optional(),
    digest: z.string().max(200).optional(),
    source: z.string().min(1).max(200),
    route: z.string().max(500).optional(),
    build: z.string().max(80).optional(),
  })
  .strict();

/**
 * POST /api/observability/client-errors
 * Sanitized client route-error ingest for Sentry-free hosts.
 * Never accepts arbitrary meta blobs or request bodies.
 */
export async function POST(request: Request) {
  const cfg = resolveObservabilityConfig();
  if (!cfg.errorLogFileEnabled) {
    // Soft success when sink off — do not leak config to anonymous clients.
    return NextResponse.json({ ok: true, stored: false }, { status: 202 });
  }

  const ipHash = hashClientErrorIp(extractClientErrorIp(request));
  if (!checkClientErrorRateLimit(ipHash)) {
    return NextResponse.json(
      { error: "Too many error reports", code: "rate_limited" },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  const raw = await request.json().catch(() => null);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const data = parsed.data;
  const synthetic = Object.assign(new Error(data.message), {
    name: data.name ?? "Error",
    stack: data.stack,
    digest: data.digest,
  });
  const classification = classifyServerError(synthetic);

  try {
    await observabilityStore.append({
      level: classification.level,
      source: "client",
      message: data.message,
      name: data.name,
      stack: data.stack,
      digest: data.digest,
      route: data.route ?? data.source,
      build: data.build,
      signal: classification.signal,
      meta: { clientSource: data.source },
    });
  } catch {
    return NextResponse.json({ error: "Store unavailable" }, { status: 503 });
  }

  return NextResponse.json({ ok: true, stored: true }, { status: 202 });
}

export async function GET() {
  return NextResponse.json(
    { error: "Use POST to report client errors." },
    { status: 405, headers: { Allow: "POST" } },
  );
}
