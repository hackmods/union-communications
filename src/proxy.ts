import { NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { auth } from "@/auth";
import { routing } from "@/i18n/routing";
import {
  publicAbsoluteUrl,
  requestWithPublicOrigin,
} from "@/lib/seo/public-origin";
import { signedInHomeHref } from "@/lib/portal/access";
import type { UserRole } from "@/types/tenant";
import { outstandingDocumentAcceptances } from "@/lib/public-documents/acceptance-gate";

/** Audited allowlist: users must be able to authenticate, accept, get help, and recover the operator account. */
export const PUBLIC_DOCUMENT_ACCEPTANCE_ALLOWLIST = [
  "/app/login", "/app/register", "/app/mfa", "/app/forgot-password", "/app/reset-password/", "/app/sign-in/", "/app/invite/", "/app/support",
  "/documents/acceptance", "/app/site-admin/documents", "/api/auth/", "/api/mfa/", "/api/health", "/api/documents/acceptance", "/api/site-admin/documents/recovery", "/api/access-requests/", "/api/support/",
  "/api/public-tools/", "/api/brand-kit/", "/api/union-brand/", "/api/host-brand/", "/api/comms/",
] as const;

function isAcceptanceAllowlisted(pathname: string): boolean {
  return PUBLIC_DOCUMENT_ACCEPTANCE_ALLOWLIST.some((entry) => entry.endsWith("/") ? pathname.startsWith(entry) : pathname === entry || pathname.startsWith(`${entry}/`));
}

const intlMiddleware = createIntlMiddleware(routing);

/** File-convention OG/Twitter images — must not get locale-prefixed by next-intl. */
function isMetadataImagePath(pathname: string): boolean {
  return (
    pathname === "/opengraph-image" ||
    pathname === "/opengraph-image/" ||
    pathname.startsWith("/opengraph-image/") ||
    pathname === "/twitter-image" ||
    pathname === "/twitter-image/" ||
    pathname.startsWith("/twitter-image/")
  );
}

/** Chrome-free operator labs — must not get locale-prefixed by next-intl. */
function isOperatorLabPath(pathname: string): boolean {
  return (
    pathname === "/viewport-lab" ||
    pathname === "/viewport-lab/" ||
    pathname.startsWith("/viewport-lab/") ||
    pathname === "/load-test-lab" ||
    pathname === "/load-test-lab/" ||
    pathname.startsWith("/load-test-lab/")
  );
}

function localeFromPath(pathname: string): string {
  const locale = pathname.split("/")[1];
  return routing.locales.includes(locale as "en" | "fr") ? locale : routing.defaultLocale;
}

export default auth(async (req) => {
  const pathname = req.nextUrl.pathname;
  const routePath = pathname.replace(/^\/(en|fr)(?=\/)/, "");

  if (isMetadataImagePath(pathname) || isOperatorLabPath(pathname)) {
    return NextResponse.next();
  }

  const isApi = routePath.startsWith("/api/");
  const isProtectedHubPath = routePath.includes("/app") || routePath.includes("/portal") || (isApi && !isAcceptanceAllowlisted(routePath));
  if (isProtectedHubPath && !isAcceptanceAllowlisted(routePath) && req.auth?.user?.id && req.auth.user.unionId) {
    try {
      const pending = await outstandingDocumentAcceptances(req.auth);
      if (pending.length) {
        const locale = localeFromPath(pathname);
        const acceptancePath = `/${locale}/documents/acceptance?returnTo=${encodeURIComponent(`${pathname}${req.nextUrl.search}`)}`;
        if (isApi) return NextResponse.json({ error: "Document acceptance required", acceptanceUrl: acceptancePath, documents: pending.map(({ slug, title }) => ({ slug, title })) }, { status: 428, headers: { "Cache-Control": "private, no-store" } });
        return NextResponse.redirect(new URL(acceptancePath, req.url));
      }
    } catch {
      if (isApi) return NextResponse.json({ error: "Document acceptance status is unavailable" }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
      return new NextResponse("Document acceptance status is unavailable. Please try again shortly.", { status: 503 });
    }
  }

  // API routes do not participate in locale negotiation.
  if (isApi) return NextResponse.next();

  const locale = localeFromPath(pathname);
  const isLogin = pathname.includes("/app/login");
  // Invite accept is public — token is the capability (SEC-007).
  const isInviteAccept = /\/app\/invite\//.test(pathname);
  // Password reset is public — email token is the capability.
  const isPasswordReset =
    pathname.includes("/app/forgot-password") ||
    /\/app\/reset-password\//.test(pathname);
  // Magic sign-in link is public — email token is the capability.
  const isMagicSignIn = /\/app\/sign-in\//.test(pathname);
  const isAppRoute =
    pathname.includes("/app") &&
    !isLogin &&
    !pathname.includes("/app/register") &&
    !isInviteAccept &&
    !isPasswordReset &&
    !isMagicSignIn;
  const isPortalRoute = pathname.includes("/portal");

  if (req.auth && (isLogin || isMagicSignIn)) {
    const roles = (req.auth.user?.roles ?? []) as UserRole[];
    const home = signedInHomeHref(roles);
    return NextResponse.redirect(publicAbsoluteUrl(req, `/${locale}${home}`));
  }

  if (!req.auth && (isAppRoute || isPortalRoute)) {
    return NextResponse.redirect(
      publicAbsoluteUrl(req, `/${locale}/app/login`),
    );
  }

  // Rewrite onto AUTH_URL / X-Forwarded-* so next-intl Location stays public.
  return intlMiddleware(requestWithPublicOrigin(req));
});

export const config = {
  // Skip static files (.*\\..*) and App Router OG/Twitter image routes (no extension).
  matcher: [
    // Skip Sentry tunnel (/monitoring) — next-intl must not locale-prefix it.
    "/((?!api|monitoring|viewport-lab|load-test-lab|_next|_vercel|opengraph-image|twitter-image|.*\\..*).*)",
    "/api/:path*",
  ],
};
