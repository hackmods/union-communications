import { NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { auth } from "@/auth";
import { routing } from "@/i18n/routing";
import {
  publicAbsoluteUrl,
  requestWithPublicOrigin,
} from "@/lib/seo/public-origin";

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

function localeFromPath(pathname: string): string {
  const locale = pathname.split("/")[1];
  return routing.locales.includes(locale as "en" | "fr") ? locale : routing.defaultLocale;
}

export default auth((req) => {
  const pathname = req.nextUrl.pathname;

  if (isMetadataImagePath(pathname)) {
    return NextResponse.next();
  }

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
    return NextResponse.redirect(publicAbsoluteUrl(req, `/${locale}/app`));
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
    "/((?!api|_next|_vercel|opengraph-image|twitter-image|.*\\..*).*)",
  ],
};
