import { NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { auth } from "@/auth";
import { routing } from "@/i18n/routing";

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
  const isAppRoute =
    pathname.includes("/app") && !isLogin && !pathname.includes("/app/register");

  if (req.auth && isLogin) {
    return NextResponse.redirect(new URL(`/${locale}/app`, req.url));
  }

  if (!req.auth && isAppRoute) {
    return NextResponse.redirect(new URL(`/${locale}/app/login`, req.url));
  }

  return intlMiddleware(req);
});

export const config = {
  // Skip static files (.*\\..*) and App Router OG/Twitter image routes (no extension).
  matcher: [
    "/((?!api|_next|_vercel|opengraph-image|twitter-image|.*\\..*).*)",
  ],
};
