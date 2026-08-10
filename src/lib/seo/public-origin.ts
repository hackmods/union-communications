import { NextRequest } from "next/server";

export type PublicOriginInput = {
  /** Production public HTTPS origin (no trailing slash). Wins over forwarded headers. */
  authUrl?: string | null;
  forwardedHost?: string | null;
  forwardedProto?: string | null;
};

/**
 * Resolve the public site origin behind a reverse proxy.
 * CapRover / custom nginx often present an internal Host; AUTH_URL must win
 * so redirects and cookies stay on the public domain (GSC-safe Location headers).
 */
export function resolvePublicOrigin(input: PublicOriginInput): string | null {
  const auth = input.authUrl?.trim();
  if (auth) {
    try {
      return new URL(auth).origin;
    } catch {
      // fall through
    }
  }

  const host = input.forwardedHost?.split(",")[0]?.trim();
  if (host) {
    const rawProto =
      input.forwardedProto?.split(",")[0]?.trim() || "https";
    const proto = rawProto.replace(/:$/, "") || "https";
    try {
      return new URL(`${proto}://${host}`).origin;
    } catch {
      return null;
    }
  }

  return null;
}

/** Build an absolute URL on the public origin (falls back to the request URL). */
export function publicAbsoluteUrl(req: NextRequest, pathname: string): URL {
  const origin =
    resolvePublicOrigin({
      authUrl: process.env.AUTH_URL,
      forwardedHost: req.headers.get("x-forwarded-host"),
      forwardedProto: req.headers.get("x-forwarded-proto"),
    }) ?? new URL(req.url).origin;

  return new URL(pathname, `${origin}/`);
}

/**
 * Clone the request onto the public origin so next-intl Location headers
 * do not leak an internal CapRover / proxy hostname.
 */
export function requestWithPublicOrigin(req: NextRequest): NextRequest {
  const origin = resolvePublicOrigin({
    authUrl: process.env.AUTH_URL,
    forwardedHost: req.headers.get("x-forwarded-host"),
    forwardedProto: req.headers.get("x-forwarded-proto"),
  });
  if (!origin) return req;

  const current = new URL(req.url);
  if (current.origin === origin) return req;

  const rewritten = new URL(req.url);
  const publicOrigin = new URL(origin);
  rewritten.protocol = publicOrigin.protocol;
  rewritten.host = publicOrigin.host;

  return new NextRequest(rewritten, req);
}
