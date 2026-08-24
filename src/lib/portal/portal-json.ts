import { NextResponse } from "next/server";

const NO_STORE = { "Cache-Control": "private, no-store" } as const;

/** Authenticated Portal JSON — never cache in shared browser stores. */
export function portalJson<T>(
  body: T,
  init?: ResponseInit & { status?: number },
): NextResponse<T> {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", NO_STORE["Cache-Control"]);
  return NextResponse.json(body, { ...init, headers });
}
